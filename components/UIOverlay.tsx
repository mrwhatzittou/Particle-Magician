
import React, { useState, useEffect } from 'react';
import { ShapeType, AppConfig, Mood, MotionStyle, GlowIntensity, SoundPresence, ColorTemp, ColorMode, ColorTheme, LightAction } from '../types';
import { SHAPE_POOL, DEFAULT_PRESETS, PARTICLE_SPEED_OPTIONS, MOOD_DEFAULTS, THEME_PALETTES } from '../constants';
import { HelpCircle, Hand, Volume2, VolumeX, Sparkles, Palette, ZoomIn, ZoomOut, X, Zap, Layers, Info, Activity, RefreshCw, AudioLines, ChevronRight, Check } from 'lucide-react';
import { VisionStatus } from '../services/visionService';
import { audioService } from '../services/audioService';

interface UIOverlayProps {
  currentShape: ShapeType;
  onManualShapeSelect: (shape: ShapeType) => void;
  detectedGesture: string;
  isCameraActive: boolean;
  visionStatus: VisionStatus;
  onStart: (config: AppConfig) => void;
  hasStarted: boolean;
  isVideoLoading: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  lightAction: LightAction;
  setLightAction: (action: LightAction) => void;
  shapePresets: ShapeType[];
  onPresetsChange: (presets: ShapeType[]) => void;
  particleSpeed: number;
  onParticleSpeedChange: (speed: number) => void;
  activeMood: Mood;
  onResetToMood: (mood: Mood) => void;
  activePresetIndex: number | null;
  currentShapeName: string;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  currentShape,
  onManualShapeSelect,
  detectedGesture,
  isCameraActive,
  visionStatus,
  onStart,
  hasStarted,
  isVideoLoading,
  isMuted,
  onToggleMute,
  zoomLevel,
  onZoomChange,
  colorMode,
  setColorMode,
  colorTheme,
  setColorTheme,
  lightAction,
  setLightAction,
  shapePresets,
  onPresetsChange,
  particleSpeed,
  onParticleSpeedChange,
  activeMood,
  onResetToMood,
  activePresetIndex,
  currentShapeName
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showVisualControls, setShowVisualControls] = useState(false);
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  
  const [audioPulse, setAudioPulse] = useState(0);

  const [mood, setMood] = useState<Mood>(Mood.CALM);
  const [motion, setMotion] = useState<MotionStyle>('FLOATING');
  const [glow, setGlow] = useState<GlowIntensity>('SOFT');
  const [sound, setSound] = useState<SoundPresence>('MINIMAL');
  const [colorTemp, setColorTemp] = useState<ColorTemp>('COOL');

  useEffect(() => {
    if (!hasStarted) return;
    let frameId: number;
    const update = () => {
      const data = audioService.getAudioData();
      setAudioPulse(data.avg);
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [hasStarted]);

  const handleMoodSelect = (m: Mood) => {
      setMood(m);
      if (m === Mood.CALM) { setMotion('FLOATING'); setGlow('SOFT'); setSound('MINIMAL'); setColorTemp('COOL'); }
      else if (m === Mood.ENERGIZED) { setMotion('DYNAMIC'); setGlow('RADIANT'); setSound('RESPONSIVE'); setColorTemp('WARM'); }
      else { setMotion('FLOWING'); setGlow('BALANCED'); setSound('IMMERSIVE'); setColorTemp('NEUTRAL'); }
  };

  const handlePresetUpdate = (index: number, newType: ShapeType) => {
      const newPresets = [...shapePresets];
      newPresets[index] = newType;
      onPresetsChange(newPresets);
  };

  if (!hasStarted) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white overflow-y-auto">
        <div className="w-full max-w-lg p-10 flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-1 tracking-[0.3em] text-white uppercase text-center">PARTICLE MAGICIAN</h1>
          <p className="text-xs mb-12 text-gray-500 font-medium tracking-widest uppercase">Gestural Interface v2.5</p>
          
          <div className="w-full mb-12 space-y-3">
              {[Mood.CALM, Mood.DREAMLIKE, Mood.ENERGIZED].map((m) => (
                  <button key={m} onClick={() => handleMoodSelect(m)} className={`w-full py-5 rounded-xl border transition-all duration-300 text-sm font-bold tracking-widest uppercase ${mood === m ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'}`}>
                      {m}
                  </button>
              ))}
          </div>

          <button 
            onClick={() => onStart({ 
              mood, 
              motionStyle: motion, 
              glowIntensity: glow, 
              soundPresence: sound, 
              colorTemp: colorTemp, 
              shapePresets: MOOD_DEFAULTS[mood].shapePresets, 
              particleSpeed: MOOD_DEFAULTS[mood].particleSpeed 
            })} 
            className="w-full py-4 bg-white/5 border border-white/20 text-white font-bold text-sm rounded-full hover:bg-white hover:text-black transition-all active:scale-95 tracking-[0.2em]"
          >
            INITIALIZE
          </button>
        </div>
      </div>
    );
  }

  const statusColor = visionStatus === 'ONLINE' ? 'text-green-500' : visionStatus === 'ERROR' ? 'text-red-500' : 'text-yellow-500';

  return (
    <>
      {/* --- HUD --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-40 pointer-events-none">
        <div className="bg-black/20 p-3 rounded-lg border border-white/5 backdrop-blur-sm space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-tighter">
             <span className="text-gray-500 uppercase">Sys:</span>
             <span className={`${statusColor} font-bold uppercase`}>{visionStatus}</span>
          </div>
          {isCameraActive && (
              <>
                <div className="flex items-center gap-2 text-[9px] font-mono tracking-tighter">
                    <span className="text-gray-500 uppercase">Input:</span>
                    <span className="text-white/80">{activePresetIndex !== null ? `${activePresetIndex}F` : '--'}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono tracking-tighter">
                    <span className="text-gray-500 uppercase">Shape:</span>
                    <span className="text-white/80">{currentShapeName}</span>
                </div>
              </>
          )}
        </div>
        
        <div className="pointer-events-auto flex gap-1.5">
            <button onClick={() => { setShowVisualControls(!showVisualControls); setShowPresetPanel(false); }} className={`p-2 rounded-lg transition-all border ${showVisualControls ? 'bg-white text-black border-white' : 'bg-black/40 border-white/5 text-white/40 hover:text-white'}`}>
                <Palette className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowPresetPanel(!showPresetPanel); setShowVisualControls(false); }} className={`p-2 rounded-lg transition-all border ${showPresetPanel ? 'bg-white text-black border-white' : 'bg-black/40 border-white/5 text-white/40 hover:text-white'}`}>
                <Layers className="w-4 h-4" />
            </button>
            <button onClick={onToggleMute} className="p-2 rounded-lg bg-black/40 border border-white/5 text-white/40 hover:text-white transition-all">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowHelp(true)} className="p-2 rounded-lg bg-black/40 border border-white/5 text-white/40 hover:text-white transition-all">
                <HelpCircle className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* --- VISUAL SETTINGS PANEL --- */}
      {showVisualControls && (
          <div className="absolute top-16 right-4 w-60 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40 pointer-events-auto shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Visual Configuration</span>
                  <button onClick={() => setShowVisualControls(false)}><X className="w-3 h-3 text-gray-600 hover:text-white" /></button>
              </div>

              <div className="space-y-4">
                  <div>
                      <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Flow Speed</div>
                      <div className="grid grid-cols-4 gap-1">
                          {PARTICLE_SPEED_OPTIONS.map(opt => (
                              <button key={opt} onClick={() => onParticleSpeedChange(opt)} className={`text-[9px] py-1 rounded border ${particleSpeed === opt ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}>
                                  {opt}x
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Theme</div>
                      <div className="grid grid-cols-2 gap-1">
                          {[
                            { id: ColorTheme.NEBULA_PINK, name: 'Nebula' },
                            { id: ColorTheme.DEEP_SPACE, name: 'Space' },
                            { id: ColorTheme.AURORA, name: 'Aurora' },
                            { id: ColorTheme.SUNSET, name: 'Sunset' },
                            { id: ColorTheme.MONO_ICE, name: 'Ice' },
                            { id: ColorTheme.MONO_WARM, name: 'Warm' }
                          ].map(t => (
                              <button key={t.id} onClick={() => setColorTheme(t.id)} className={`text-[9px] py-1 rounded border transition-all ${colorTheme === t.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}>
                                  {t.name}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Light Mode</div>
                      <div className="grid grid-cols-3 gap-1">
                          {[ColorMode.GRADIENT, ColorMode.SOLID, ColorMode.MULTI].map(m => (
                              <button key={m} onClick={() => setColorMode(m)} className={`text-[8px] py-1 rounded border uppercase ${colorMode === m ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                  {m}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Action</div>
                      <div className="grid grid-cols-2 gap-1">
                          {[
                            { id: LightAction.NONE, name: 'Static' },
                            { id: LightAction.FADE, name: 'Breath' },
                            { id: LightAction.FLASH, name: 'Spark' },
                            { id: LightAction.STROBE, name: 'Shimmer' }
                          ].map(a => (
                              <button key={a.id} onClick={() => setLightAction(a.id)} className={`text-[9px] py-1 rounded border ${lightAction === a.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}>
                                  {a.name}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- FINGER PRESETS PANEL (SHRUNK) --- */}
      {showPresetPanel && (
          <div className="absolute top-16 right-4 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40 pointer-events-auto">
              <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-1.5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Mapping</span>
                  <button onClick={() => setShowPresetPanel(false)}><X className="w-3 h-3 text-gray-600" /></button>
              </div>
              <div className="space-y-2">
                  {shapePresets.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">{i+1} Finger</span>
                          <select 
                            value={p} 
                            onChange={(e) => handlePresetUpdate(i, e.target.value as ShapeType)}
                            className="flex-1 bg-white/5 border border-white/5 text-white rounded-lg py-1 px-1.5 text-[9px] focus:outline-none appearance-none cursor-pointer"
                          >
                              {SHAPE_POOL.map(s => (
                                  <option key={s.type} value={s.type} className="bg-black">{s.label}</option>
                              ))}
                          </select>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- ZOOM SLIDER (NEUTRAL REFINEMENT) --- */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-auto flex flex-col items-center gap-2">
         <button onClick={() => onZoomChange(Math.min(1, zoomLevel + 0.1))} className="text-white/20 hover:text-white transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
         <div className="h-24 w-0.5 bg-white/5 rounded-full relative overflow-hidden border border-white/5">
            <input type="range" min="0" max="1" step="0.01" value={zoomLevel} onChange={(e) => onZoomChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} />
            <div className="absolute bottom-0 left-0 w-full bg-white/40 rounded-full" style={{ height: `${zoomLevel * 100}%` }} />
         </div>
         <button onClick={() => onZoomChange(Math.max(0, zoomLevel - 0.1))} className="text-white/20 hover:text-white transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
      </div>

      {/* --- BOTTOM FINGER BAR (SHRUNK) --- */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center z-40 pointer-events-none px-4">
        <div className="flex gap-1 p-1 bg-black/30 backdrop-blur-md rounded-xl pointer-events-auto border border-white/5 max-w-full overflow-x-auto no-scrollbar shadow-lg">
          {shapePresets.map((type, idx) => {
            const label = SHAPE_POOL.find(p => p.type === type)?.label || type;
            const isActive = currentShape === type;
            const isFingerActive = activePresetIndex === idx + 1;
            
            return (
              <button 
                key={idx} 
                onClick={() => onManualShapeSelect(type)} 
                className={`relative px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap flex flex-col items-center leading-none ${isActive ? 'bg-white/10 text-white border border-white/20' : 'bg-transparent text-gray-600 hover:text-white'}`}
              >
                  <span className="opacity-40 text-[7px] mb-0.5">{idx + 1}F</span>
                  <span className="tracking-tight uppercase">{label}</span>
                  {isFingerActive && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-black" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- HELP / COMMAND GUIDE (MINIMAL) --- */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#050508] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-white">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
            
            <h3 className="text-[10px] font-bold mb-6 uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2">Interface Map</h3>
            
            <div className="space-y-6">
                <div>
                  <h4 className="text-[9px] text-white/40 font-bold mb-3 uppercase tracking-widest">Right Hand: Shapes</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                      {shapePresets.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded border border-white/5">
                              <span className="text-[8px] text-gray-600">{i+1}F</span>
                              <span className="text-[9px] font-bold">{SHAPE_POOL.find(s => s.type === p)?.label}</span>
                          </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[9px] text-white/40 font-bold mb-3 uppercase tracking-widest">Left Hand: Motion</h4>
                  <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded border border-white/5">
                          <span className="text-[8px] text-gray-600 uppercase">Move X/Y</span>
                          <span className="text-[9px] font-bold uppercase">Rotate</span>
                      </div>
                      <div className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded border border-white/5">
                          <span className="text-[8px] text-gray-600 uppercase">Scale/Dist</span>
                          <span className="text-[9px] font-bold uppercase">Zoom</span>
                      </div>
                      <div className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded border border-white/5">
                          <span className="text-[8px] text-gray-600 uppercase">Pinch</span>
                          <span className="text-[9px] font-bold uppercase">Lock Rot</span>
                      </div>
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] text-gray-600 text-center italic">
                      Camera: Mirrored orientation.
                    </p>
                </div>
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2 bg-white text-black font-bold rounded-lg transition-all uppercase tracking-widest text-[9px]"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UIOverlay;
