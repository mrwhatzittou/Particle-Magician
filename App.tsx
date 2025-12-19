
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShapeType, AppConfig, Mood, ColorMode, ColorTheme, LightAction } from './types';
import { SHAPE_CONFIGS } from './constants';
import Canvas3D from './components/Canvas3D';
import UIOverlay from './components/UIOverlay';
import { audioService } from './services/audioService';
import { visionService, DualHandResult } from './services/visionService';

const DEFAULT_CONFIG: AppConfig = {
    mood: Mood.CALM,
    motionStyle: 'FLOATING',
    glowIntensity: 'SOFT',
    soundPresence: 'MINIMAL',
    colorTemp: 'COOL'
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentShape, setCurrentShape] = useState<ShapeType>(ShapeType.SPHERE);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  // DUAL INTERACTION STATE
  const [interactionPoint, setInteractionPoint] = useState({ x: 0, y: 0 }); // RIGHT HAND
  const [rotationPoint, setRotationPoint] = useState<{ x: number, y: number } | null>(null); // LEFT HAND
  const [isInteracting, setIsInteracting] = useState(false); // RIGHT HAND PINCH
  
  // LEFT HAND EXTENDED STATE
  const [leftHandPinch, setLeftHandPinch] = useState(false);
  const [leftHandZoom, setLeftHandZoom] = useState(0.4);

  const [detectedGesture, setDetectedGesture] = useState('Wait...');
  
  const [zoomLevel, setZoomLevel] = useState(0.4); 
  
  // NEW VISUAL STATE
  const [colorMode, setColorMode] = useState<ColorMode>(ColorMode.GRADIENT);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(ColorTheme.NEBULA_PINK);
  const [lightAction, setLightAction] = useState<LightAction>(LightAction.NONE);

  // Refs
  const openHandStartTimeRef = useRef<number>(0);
  const supernovaTimeoutRef = useRef<number | null>(null);
  const lastGestureRef = useRef<string | null>(null);
  const isSupernovaActiveRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Tracking Continuity
  const gestureBufferRef = useRef<ShapeType[]>([]);
  const GESTURE_BUFFER_SIZE = 8; 
  const trackingTimeoutRef = useRef<number | null>(null);
  const TRACKING_GRACE_PERIOD = 500; 

  const handleStart = async (userConfig: AppConfig) => {
    setConfig(userConfig);
    setHasStarted(true);
    
    // Set initial theme based on Mood (Personalization)
    if (userConfig.mood === Mood.CALM) setColorTheme(ColorTheme.NEBULA_PINK);
    if (userConfig.mood === Mood.DREAMLIKE) setColorTheme(ColorTheme.AURORA);
    if (userConfig.mood === Mood.ENERGIZED) setColorTheme(ColorTheme.SUNSET);

    audioService.configure(userConfig);
    await audioService.start();

    setIsVideoLoading(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            visionService.start(videoRef.current, handleVisionResults);
            setIsCameraActive(true);
        }
    } catch (err) {
        console.warn("Camera permission denied or unavailable. Falling back to mouse.", err);
        setIsCameraActive(false);
    } finally {
        setIsVideoLoading(false);
    }
  };

  const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      audioService.setMute(newState);
  };

  const handleVisionResults = useCallback((results: any) => {
    // 1. Process Dual Hands
    const { rightHand, leftHand }: DualHandResult = visionService.processDualHands(results);

    // 2. Tracking Continuity Logic
    if (!rightHand.active && !leftHand.active) {
        if (!trackingTimeoutRef.current) {
            trackingTimeoutRef.current = window.setTimeout(() => {
                setDetectedGesture('No Hands');
                setIsInteracting(false);
                setRotationPoint(null); 
                setLeftHandPinch(false);
            }, TRACKING_GRACE_PERIOD);
        }
    } else {
        if (trackingTimeoutRef.current) {
            clearTimeout(trackingTimeoutRef.current);
            trackingTimeoutRef.current = null;
        }
    }

    // 3. RIGHT HAND: Interaction & Shape
    if (rightHand.active) {
        setInteractionPoint(rightHand.cursor);
        setIsInteracting(rightHand.isPinching);

        // --- EASTER EGG: SUPERNOVA ---
        if (rightHand.shape === ShapeType.FIREWORKS && !isSupernovaActiveRef.current) {
            if (lastGestureRef.current !== ShapeType.FIREWORKS) {
                openHandStartTimeRef.current = Date.now();
            } else {
                const elapsed = Date.now() - openHandStartTimeRef.current;
                if (elapsed > 5000) {
                    triggerSupernova();
                }
            }
        } else {
            openHandStartTimeRef.current = 0; 
        }
        lastGestureRef.current = rightHand.shape;

        // --- SHAPE SWITCHING (RIGHT HAND ONLY) ---
        // CRITICAL UPDATE: FREEZE SHAPE DETECTION WHILE PINCHING
        // This prevents the shape from breaking when the user pinches (which looks like 2 fingers).
        if (!isSupernovaActiveRef.current && !rightHand.isPinching) {
             if (rightHand.shape) {
                gestureBufferRef.current.push(rightHand.shape);
                if (gestureBufferRef.current.length > GESTURE_BUFFER_SIZE) {
                    gestureBufferRef.current.shift();
                }

                // Majority Vote
                const counts = gestureBufferRef.current.reduce((acc, curr) => {
                    acc[curr] = (acc[curr] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const threshold = Math.ceil(GESTURE_BUFFER_SIZE * 0.7); 
                for (const [s, count] of Object.entries(counts)) {
                    if (count >= threshold && s !== currentShape) {
                        changeShape(s as ShapeType);
                        break;
                    }
                }
            }
        } else {
            // While pinching, we clear buffer to ensure stability upon release
            gestureBufferRef.current = [];
        }
    }

    // 4. LEFT HAND: Rotation, Zoom, Lock
    if (leftHand.active) {
        setRotationPoint(leftHand.cursor);
        setLeftHandPinch(leftHand.isPinching);
        setLeftHandZoom(leftHand.handSize);
    } else {
        // If left hand lost, rotation point becomes null (Canvas3D will hold last value)
        setRotationPoint(null);
        setLeftHandPinch(false);
    }

    // 5. UI Updates
    if (!isSupernovaActiveRef.current && currentShape !== ShapeType.SPIRAL_GALAXY) {
         let status = 'Tracking';
         if (leftHand.active && rightHand.active) status = 'Dual Control';
         else if (leftHand.active) status = leftHand.isPinching ? 'Rotation Locked' : 'Rotating & Zooming';
         else if (rightHand.active) status = 'Interacting';
         
         const shapeLabel = SHAPE_CONFIGS.find(c => c.type === rightHand.shape)?.label;
         if (shapeLabel) status = `${shapeLabel} ${rightHand.isPinching ? '(Pinch)' : ''}`;
         
         setDetectedGesture(status);
    } 

  }, [currentShape]);

  const triggerSupernova = () => {
      if (isSupernovaActiveRef.current) return;
      isSupernovaActiveRef.current = true;
      setDetectedGesture('SUPERNOVA EVENT');
      changeShape(ShapeType.SUPERNOVA);
      
      if (supernovaTimeoutRef.current) clearTimeout(supernovaTimeoutRef.current);
      supernovaTimeoutRef.current = window.setTimeout(() => {
          isSupernovaActiveRef.current = false;
          changeShape(ShapeType.SPHERE); 
      }, 3000);
  };

  // Mouse Fallback (Maps to Interaction Only)
  const handleMouseMove = (e: React.MouseEvent) => {
      if (isCameraActive) return; 
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setInteractionPoint({ x, y });
  };

  const handleMouseDown = () => {
      if (isCameraActive) return;
      setIsInteracting(true);
  };

  const handleMouseUp = () => {
      if (isCameraActive) return;
      setIsInteracting(false);
  };

  const changeShape = (newShape: ShapeType) => {
      setCurrentShape(newShape);
      audioService.setShape(newShape); 
      audioService.playWhoosh();
  };

  return (
    <div 
        className="relative w-full h-screen bg-black overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchMove={(e) => {
             if (isCameraActive) return;
             const touch = e.touches[0];
             const x = (touch.clientX / window.innerWidth) * 2 - 1;
             const y = -(touch.clientY / window.innerHeight) * 2 + 1;
             setInteractionPoint({ x, y });
        }}
    >
      <Canvas3D 
        currentShape={currentShape} 
        interactionPoint={interactionPoint} 
        rotationPoint={rotationPoint}
        isLeftPinching={leftHandPinch}
        leftHandZoom={leftHandZoom}
        isInteracting={isInteracting}
        config={config}
        zoomLevel={zoomLevel}
        colorMode={colorMode}
        colorTheme={colorTheme}
        lightAction={lightAction}
      />
      
      <UIOverlay 
        currentShape={currentShape}
        onManualShapeSelect={changeShape}
        detectedGesture={detectedGesture}
        isCameraActive={isCameraActive}
        onStart={handleStart}
        hasStarted={hasStarted}
        isVideoLoading={isVideoLoading}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        colorMode={colorMode}
        setColorMode={setColorMode}
        colorTheme={colorTheme}
        setColorTheme={setColorTheme}
        lightAction={lightAction}
        setLightAction={setLightAction}
      />

      <video 
        ref={videoRef} 
        className={`absolute bottom-4 right-4 w-48 h-36 object-cover rounded-lg border-2 border-violet-500/50 z-40 transition-opacity duration-500 ${isCameraActive && hasStarted ? 'opacity-50 blur-[1px]' : 'opacity-0 pointer-events-none'}`}
        playsInline 
        muted
        style={{ transform: 'scaleX(-1)' }} 
      />
      
      {/* Right Hand Indicator */}
      {isCameraActive && isInteracting && (
          <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)] pointer-events-none z-50 animate-pulse" />
      )}
    </div>
  );
};

export default App;
