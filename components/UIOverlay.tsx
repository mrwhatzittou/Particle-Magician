
import React, { useState } from 'react';
import { ShapeType, AppConfig, Mood, MotionStyle, GlowIntensity, SoundPresence, ColorTemp, ColorMode, ColorTheme, LightAction } from '../types';
import { SHAPE_CONFIGS } from '../constants';
import { HelpCircle, Hand, MousePointer2, Volume2, VolumeX, Settings2, Sparkles, Wind, Palette, Volume1, ZoomIn, ZoomOut, X, Sun, Moon, Zap, Aperture } from 'lucide-react';

interface UIOverlayProps {
  currentShape: ShapeType;
  onManualShapeSelect: (shape: ShapeType) => void;
  detectedGesture: string;
  isCameraActive: boolean;
  onStart: (config: AppConfig) => void;
  hasStarted: boolean;
  isVideoLoading: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  // Visual Props
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  lightAction: LightAction;
  setLightAction: (action: LightAction) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  currentShape,
  onManualShapeSelect,
  detectedGesture,
  isCameraActive,
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
  setLightAction
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showFineTune, setShowFineTune] = useState(false);
  const [showVisualControls, setShowVisualControls] = useState(false);
  
  // Configuration State for Start Screen
  const [mood, setMood] = useState<Mood>(Mood.CALM);
  const [motion, setMotion] = useState<MotionStyle>('FLOATING');
  const [glow, setGlow] = useState<GlowIntensity>('SOFT');
  const [sound, setSound] = useState<SoundPresence>('MINIMAL');
  const [colorTemp, setColorTemp] = useState<ColorTemp>('COOL');

  // Logic to update fine-tune defaults when Mood changes
  const handleMoodSelect = (m: Mood) => {
      setMood(m);
      if (m === Mood.CALM) {
          setMotion('FLOATING'); setGlow('SOFT'); setSound('MINIMAL'); setColorTemp('COOL');
      } else if (m === Mood.ENERGIZED) {
          setMotion('DYNAMIC'); setGlow('RADIANT'); setSound('RESPONSIVE'); setColorTemp('WARM');
      } else {
          setMotion('FLOWING'); setGlow('BALANCED'); setSound('IMMERSIVE'); setColorTemp('NEUTRAL');
      }
  };

  const handleStartClick = () => {
      onStart({
          mood,
          motionStyle: motion,
          glowIntensity: glow,
          soundPresence: sound,
          colorTemp: colorTemp
      });
  };

  if (!hasStarted) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white backdrop-blur-md overflow-y-auto">
        <div className="w-full max-w-2xl p-8 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-600 tracking-tight text-center">
            PARTICLE MAGICIAN
          </h1>
          <p className="text-xl mb-10 text-gray-400 font-light tracking-wide">
            Interactive Particle Experience
          </p>

          {/* MOOD SELECTOR */}
          <div className="w-full mb-8">
              <p className="text-sm text-gray-500 uppercase tracking-widest text-center mb-6">Select your Mood</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[Mood.CALM, Mood.DREAMLIKE, Mood.ENERGIZED].map((m) => (
                      <button
                          key={m}
                          onClick={() => handleMoodSelect(m)}
                          className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2
                              ${mood === m 
                                  ? 'bg-white/10 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.2)] scale-105' 
                                  : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                              }
                          `}
                      >
                          <span className="text-lg font-medium tracking-wide">
                              {m.charAt(0) + m.slice(1).toLowerCase()}
                          </span>
                      </button>
                  ))}
              </div>
          </div>

          {/* EXTENDED PERSONALIZATION TOGGLE */}
          <button 
            onClick={() => setShowFineTune(!showFineTune)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            {showFineTune ? 'Hide Customization' : 'Personalize Experience'}
          </button>

          {/* EXTENDED OPTIONS */}
          {showFineTune && (
             <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8 bg-white/5 p-6 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                 
                 {/* Motion */}
                 <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider">
                         <Wind className="w-3 h-3" /> Motion
                     </div>
                     <div className="flex gap-2">
                         {(['FLOWING', 'FLOATING', 'DYNAMIC'] as MotionStyle[]).map(opt => (
                             <button key={opt} onClick={() => setMotion(opt)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${motion === opt ? 'bg-violet-500/20 border-violet-500 text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                                 {opt.charAt(0) + opt.slice(1).toLowerCase()}
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Glow */}
                 <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider">
                         <Sparkles className="w-3 h-3" /> Glow
                     </div>
                     <div className="flex gap-2">
                         {(['SOFT', 'BALANCED', 'RADIANT'] as GlowIntensity[]).map(opt => (
                             <button key={opt} onClick={() => setGlow(opt)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${glow === opt ? 'bg-pink-500/20 border-pink-500 text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                                 {opt.charAt(0) + opt.slice(1).toLowerCase()}
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Sound */}
                 <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider">
                         <Volume1 className="w-3 h-3" /> Sound
                     </div>
                     <div className="flex gap-2">
                         {(['MINIMAL', 'IMMERSIVE', 'RESPONSIVE'] as SoundPresence[]).map(opt => (
                             <button key={opt} onClick={() => setSound(opt)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${sound === opt ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                                 {opt.charAt(0) + opt.slice(1).toLowerCase()}
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Color */}
                 <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider">
                         <Palette className="w-3 h-3" /> Color
                     </div>
                     <div className="flex gap-2">
                         {(['COOL', 'NEUTRAL', 'WARM'] as ColorTemp[]).map(opt => (
                             <button key={opt} onClick={() => setColorTemp(opt)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${colorTemp === opt ? 'bg-white/20 border-white text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                                 {opt.charAt(0) + opt.slice(1).toLowerCase()}
                             </button>
                         ))}
                     </div>
                 </div>

             </div>
          )}

          <button
            onClick={handleStartClick}
            className="w-full max-w-sm py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
          >
            ENTER EXPERIENCE
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none">
        <div>
          <h2 className="text-lg md:text-2xl font-bold tracking-widest text-white opacity-80">PARTICLE MAGICIAN</h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-cyan-400">
             {isCameraActive ? <Hand className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
             <span className="uppercase tracking-wide font-mono">
               {isCameraActive ? 'Vision Mode' : 'Mouse Mode'}
             </span>
          </div>
          {isCameraActive && (
              <div className="mt-1 font-mono text-xs text-gray-400">
                  {isVideoLoading ? 'Loading Vision Model...' : `Detected: ${detectedGesture}`}
              </div>
          )}
        </div>
        
        <div className="pointer-events-auto flex gap-4">
            {/* Visual Controls Toggle */}
            <button
              onClick={() => setShowVisualControls(!showVisualControls)}
              className={`p-2 rounded-full transition-colors text-white ${showVisualControls ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Palette className="w-6 h-6" />
            </button>
            <button
              onClick={onToggleMute}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* Visual Controls Panel */}
      {showVisualControls && (
          <div className="absolute top-24 right-6 w-64 bg-[#050510]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 z-40 pointer-events-auto shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visual Control</span>
                  <button onClick={() => setShowVisualControls(false)}><X className="w-4 h-4 text-gray-500 hover:text-white" /></button>
              </div>

              {/* Color Mode */}
              <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 text-violet-400 text-[10px] uppercase font-bold tracking-wider">
                      <Aperture className="w-3 h-3" /> Mode
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
                      {[ColorMode.GRADIENT, ColorMode.SOLID, ColorMode.MULTI].map(m => (
                          <button 
                            key={m} 
                            onClick={() => setColorMode(m)}
                            className={`text-[10px] py-1.5 rounded-md transition-all ${colorMode === m ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                          >
                              {m.charAt(0) + m.slice(1).toLowerCase()}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Theme */}
              <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 text-cyan-400 text-[10px] uppercase font-bold tracking-wider">
                      <Sun className="w-3 h-3" /> Theme
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {[
                        { t: ColorTheme.NEBULA_PINK, label: 'Nebula' }, 
                        { t: ColorTheme.DEEP_SPACE, label: 'Space' },
                        { t: ColorTheme.AURORA, label: 'Aurora' },
                        { t: ColorTheme.SUNSET, label: 'Sunset' },
                        { t: ColorTheme.MONO_ICE, label: 'Ice' },
                        { t: ColorTheme.MONO_WARM, label: 'Warm' }
                      ].map(item => (
                          <button 
                            key={item.t} 
                            onClick={() => setColorTheme(item.t)}
                            className={`text-[11px] py-1.5 rounded-lg border transition-all ${colorTheme === item.t ? 'bg-white/10 border-white/40 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                          >
                              {item.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Light Action */}
              <div>
                  <div className="flex items-center gap-2 mb-2 text-pink-400 text-[10px] uppercase font-bold tracking-wider">
                      <Zap className="w-3 h-3" /> Light Action
                  </div>
                  <div className="flex flex-col gap-1">
                      {[
                          { a: LightAction.NONE, label: 'None' },
                          { a: LightAction.FADE, label: 'Fade (Breath)' },
                          { a: LightAction.FLASH, label: 'Flash (Spark)' },
                          { a: LightAction.STROBE, label: 'Shimmer' }
                      ].map(item => (
                          <button 
                            key={item.a} 
                            onClick={() => setLightAction(item.a)}
                            className={`text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors flex items-center gap-2 ${lightAction === item.a ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                          >
                              <div className={`w-1.5 h-1.5 rounded-full ${lightAction === item.a ? 'bg-green-400' : 'bg-gray-700'}`} />
                              {item.label}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Right Side - Zoom Control */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 pointer-events-auto flex flex-col items-center gap-3">
         <button onClick={() => onZoomChange(Math.min(1, zoomLevel + 0.1))} className="text-white/50 hover:text-white transition-colors">
            <ZoomIn className="w-5 h-5" />
         </button>
         
         <div className="h-32 w-1.5 bg-white/10 rounded-full relative overflow-hidden group">
            <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={zoomLevel}
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                style={{
                  writingMode: 'vertical-lr', 
                  direction: 'rtl',
                }}
            />
            {/* Track Fill */}
            <div 
                className="absolute bottom-0 left-0 w-full bg-white/80 rounded-full transition-all duration-100 ease-out"
                style={{ height: `${zoomLevel * 100}%` }}
            />
         </div>

         <button onClick={() => onZoomChange(Math.max(0, zoomLevel - 0.1))} className="text-white/50 hover:text-white transition-colors">
            <ZoomOut className="w-5 h-5" />
         </button>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-40 pointer-events-none">
        <div className="flex gap-2 p-2 bg-black/40 backdrop-blur-md rounded-2xl pointer-events-auto border border-white/10">
          {SHAPE_CONFIGS.map((config) => (
            <button
              key={config.type}
              onClick={() => onManualShapeSelect(config.type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentShape === config.type
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Reference Guide (Help Modal) */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#050510] border border-white/10 rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
                <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold mb-8 text-white tracking-widest border-b border-white/10 pb-4">CONTROLS</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              
              {/* Right Hand Section */}
              <div className="space-y-6">
                  {/* Shape Selection Guide */}
                  <div>
                      <div className="flex items-center gap-2 mb-4 text-violet-400">
                          <Hand className="w-4 h-4" />
                          <h4 className="font-bold uppercase tracking-wider text-xs">Right Hand • Finger Count Standard</h4>
                      </div>
                      
                      <div className="space-y-4">
                          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                              <p className="text-xs text-gray-400 font-mono text-center leading-relaxed">
                                  Standard Counting: Index = 1, up to Open Hand = 5.
                              </p>
                          </div>
                          
                          <ul className="space-y-3">
                              {[
                                  { label: '1 Finger', desc: 'Index Only', shape: 'Sphere' },
                                  { label: '2 Fingers', desc: 'Index + Middle', shape: 'Flower' },
                                  { label: '3 Fingers', desc: 'Index + Mid + Ring', shape: 'Saturn' },
                                  { label: '4 Fingers', desc: 'All except Thumb', shape: 'Heart' },
                                  { label: '5 Fingers', desc: 'Open Hand', shape: 'Fireworks' },
                              ].map((item) => (
                                  <li key={item.label} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                      <div className="flex flex-col gap-0.5">
                                          <span className="text-gray-200 font-medium">{item.label}</span>
                                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">{item.desc}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-gray-700 text-xs">→</span>
                                          <span className="text-violet-300 font-mono text-xs bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                                              {item.shape}
                                          </span>
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>
              </div>

              {/* Left Hand Section */}
              <div className="space-y-8">
                   <div>
                      <div className="flex items-center gap-2 mb-4 text-cyan-400">
                          <Wind className="w-4 h-4" />
                          <h4 className="font-bold uppercase tracking-wider text-xs">Left Hand • Rotation & Zoom</h4>
                      </div>
                      <ul className="space-y-3">
                           <li className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">Rotate Shape</span>
                                  <span className="text-gray-500 font-mono text-xs bg-white/5 px-2 py-1 rounded border border-white/5">Move Left / Right</span>
                          </li>
                          <li className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">Tilt Shape</span>
                                  <span className="text-gray-500 font-mono text-xs bg-white/5 px-2 py-1 rounded border border-white/5">Move Up / Down</span>
                          </li>
                           <li className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">Zoom In</span>
                                  <span className="text-gray-500 font-mono text-xs bg-white/5 px-2 py-1 rounded border border-white/5">Move Closer</span>
                          </li>
                           <li className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">Zoom Out</span>
                                  <span className="text-gray-500 font-mono text-xs bg-white/5 px-2 py-1 rounded border border-white/5">Move Farther</span>
                          </li>
                           <li className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">Lock Rotation</span>
                                  <span className="text-gray-500 font-mono text-xs bg-white/5 px-2 py-1 rounded border border-white/5">Pinch</span>
                          </li>
                      </ul>
                  </div>
                  
                  {/* Mirror Notice */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                             <Settings2 className="w-3 h-3" />
                             <h4 className="font-bold uppercase tracking-wider text-[10px]">Camera Mirroring</h4>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            If the camera feed is mirrored, left and right hand movements will feel reversed on screen. This is expected. Use whichever hand feels natural.
                        </p>
                  </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UIOverlay;
