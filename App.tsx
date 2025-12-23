
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShapeType, AppConfig, Mood, ColorMode, ColorTheme, LightAction } from './types';
import { DEFAULT_PRESETS, MOOD_DEFAULTS, SHAPE_POOL } from './constants';
import Canvas3D from './components/Canvas3D';
import UIOverlay from './components/UIOverlay';
import { audioService } from './services/audioService';
import { visionService, DualHandResult, VisionStatus } from './services/visionService';

const DEFAULT_CONFIG: AppConfig = {
    mood: Mood.CALM,
    motionStyle: 'FLOATING',
    glowIntensity: 'SOFT',
    soundPresence: 'MINIMAL',
    colorTemp: 'COOL',
    shapePresets: [...DEFAULT_PRESETS],
    particleSpeed: 1.0
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentShape, setCurrentShape] = useState<ShapeType>(ShapeType.SPHERE);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [visionStatus, setVisionStatus] = useState<VisionStatus>('STARTING');
  const [isMuted, setIsMuted] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  const [interactionPoint, setInteractionPoint] = useState({ x: 0, y: 0 }); 
  const [rotationPoint, setRotationPoint] = useState<{ x: number, y: number } | null>(null); 
  const [isInteracting, setIsInteracting] = useState(false); 
  
  const [leftHandPinch, setLeftHandPinch] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState('Idle');
  const [zoomLevel, setZoomLevel] = useState(0.4); 
  
  const [colorMode, setColorMode] = useState<ColorMode>(ColorMode.GRADIENT);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(ColorTheme.NEBULA_PINK);
  const [lightAction, setLightAction] = useState<LightAction>(LightAction.NONE);
  const [particleSpeed, setParticleSpeed] = useState(1.0);

  const currentShapeRef = useRef<ShapeType>(ShapeType.SPHERE); 
  const presetsRef = useRef<ShapeType[]>(DEFAULT_PRESETS);
  const isInteractingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const shapeCooldownRef = useRef(false);
  const activePresetRef = useRef<number | null>(null);

  useEffect(() => {
      currentShapeRef.current = currentShape;
  }, [currentShape]);

  useEffect(() => {
      presetsRef.current = config.shapePresets;
  }, [config.shapePresets]);

  useEffect(() => {
      if (hasStarted && isInteracting !== isInteractingRef.current) {
          audioService.triggerInteractionPing(isInteracting, interactionPoint.x);
          isInteractingRef.current = isInteracting;
      }
  }, [isInteracting, hasStarted, interactionPoint.x]);

  const changeShape = useCallback((newShape: ShapeType) => {
      // Cooldown check to prevent flickering
      if (shapeCooldownRef.current) return;
      
      setCurrentShape(newShape);
      audioService.setShape(newShape); 
      audioService.playWhoosh();
      
      shapeCooldownRef.current = true;
      // Increased cooldown window to 800ms for stability
      setTimeout(() => { shapeCooldownRef.current = false; }, 800);
  }, []);

  const handleVisionResults = useCallback((results: any) => {
    const result: DualHandResult = visionService.processDualHands(results);
    setVisionStatus(result.status);

    // --- RIGHT HAND: Shape Presets Only ---
    if (result.rightHand.active) {
        setInteractionPoint(result.rightHand.cursor);
        setIsInteracting(false);

        const fingerCount = result.rightHand.fingerCount;
        // Strict confidence: visionService already returns stable count or null
        if (fingerCount !== null && fingerCount >= 1 && fingerCount <= 5) {
            const targetShape = presetsRef.current[fingerCount - 1];
            if (targetShape && targetShape !== currentShapeRef.current) {
                changeShape(targetShape);
            }
            activePresetRef.current = fingerCount;
        } else {
            activePresetRef.current = null;
        }
    } else {
        setIsInteracting(false);
        activePresetRef.current = null;
    }

    // --- LEFT HAND: Rotation and Zoom Only ---
    if (result.leftHand.active) {
        setRotationPoint(result.leftHand.cursor);
        setLeftHandPinch(result.leftHand.isLocked);
        setZoomLevel(result.leftHand.handSize);
        setDetectedGesture(result.leftHand.motionStatus);
    } else {
        setRotationPoint(null);
        setLeftHandPinch(false);
        setDetectedGesture('Idle');
    }
    
  }, [changeShape]);

  const handleStart = async (userConfig: AppConfig) => {
    const defaults = MOOD_DEFAULTS[userConfig.mood];
    const finalConfig = { ...userConfig, particleSpeed: defaults.particleSpeed, shapePresets: defaults.shapePresets };
    
    setConfig(finalConfig);
    setHasStarted(true);
    setParticleSpeed(defaults.particleSpeed);
    setColorMode(defaults.colorMode);
    setColorTheme(defaults.colorTheme);
    setLightAction(defaults.lightAction);
    setCurrentShape(defaults.shapePresets[0]);

    audioService.configure(finalConfig);
    audioService.start();

    if (videoRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                visionService.start(videoRef.current, handleVisionResults);
                setIsCameraActive(true);
            }
        }).catch(() => {
            setVisionStatus('ERROR');
            setIsCameraActive(false);
        });
    }
  };

  const updatePresets = (newPresets: ShapeType[]) => {
      setConfig(prev => ({ ...prev, shapePresets: newPresets }));
  };

  const currentShapeName = SHAPE_POOL.find(s => s.type === currentShape)?.label || currentShape;

  return (
    <div 
        className="relative w-full h-screen bg-black overflow-hidden"
        onMouseMove={e => {
            if (isCameraActive) return;
            setInteractionPoint({ x: (e.clientX/window.innerWidth)*2-1, y: -(e.clientY/window.innerHeight)*2+1 });
        }}
        onMouseDown={() => !isCameraActive && setIsInteracting(true)}
        onMouseUp={() => !isCameraActive && setIsInteracting(false)}
    >
      <Canvas3D 
        currentShape={currentShape} 
        interactionPoint={interactionPoint} 
        rotationPoint={rotationPoint}
        isLeftPinching={leftHandPinch}
        leftHandZoom={zoomLevel}
        isInteracting={isInteracting}
        config={config}
        zoomLevel={zoomLevel}
        colorMode={colorMode}
        colorTheme={colorTheme}
        lightAction={lightAction}
        particleSpeed={particleSpeed}
      />
      
      <UIOverlay 
        currentShape={currentShape}
        onManualShapeSelect={changeShape}
        detectedGesture={detectedGesture}
        isCameraActive={isCameraActive}
        visionStatus={visionStatus}
        onStart={handleStart}
        hasStarted={hasStarted}
        isVideoLoading={visionStatus === 'STARTING' && hasStarted}
        isMuted={isMuted}
        onToggleMute={() => { setIsMuted(!isMuted); audioService.setMute(!isMuted); }}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        colorMode={colorMode}
        setColorMode={setColorMode}
        colorTheme={colorTheme}
        setColorTheme={setColorTheme}
        lightAction={lightAction}
        setLightAction={setLightAction}
        shapePresets={config.shapePresets}
        onPresetsChange={updatePresets}
        particleSpeed={particleSpeed}
        onParticleSpeedChange={setParticleSpeed}
        activeMood={config.mood}
        onResetToMood={m => {
            const d = MOOD_DEFAULTS[m];
            setParticleSpeed(d.particleSpeed);
            setColorMode(d.colorMode);
            setColorTheme(d.colorTheme);
            setLightAction(d.lightAction);
            setConfig(prev => ({ ...prev, mood: m, shapePresets: d.shapePresets }));
            changeShape(d.shapePresets[0]);
        }}
        activePresetIndex={activePresetRef.current}
        currentShapeName={currentShapeName}
      />

      <video ref={videoRef} className={`absolute bottom-4 right-4 w-48 h-36 object-cover rounded-lg border-2 border-white/10 z-40 transition-opacity duration-500 ${isCameraActive && hasStarted ? 'opacity-30 blur-[2px]' : 'opacity-0 pointer-events-none'}`} playsInline muted style={{ transform: 'scaleX(-1)' }} />
    </div>
  );
};

export default App;
