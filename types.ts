
export enum ShapeType {
  SPHERE = 'SPHERE',
  HEART = 'HEART',
  FLOWER = 'FLOWER',
  SATURN = 'SATURN',
  FIREWORKS = 'FIREWORKS',
  // Hidden Easter Eggs
  SPIRAL_GALAXY = 'SPIRAL_GALAXY',
  SUPERNOVA = 'SUPERNOVA',
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface VisionState {
  isHandDetected: boolean;
  gesture: string;
  cursorPosition: { x: number; y: number }; // Normalized -1 to 1
  isPinching: boolean;
}

// Personalization Types
export enum Mood {
  CALM = 'CALM',
  ENERGIZED = 'ENERGIZED',
  DREAMLIKE = 'DREAMLIKE'
}

export type MotionStyle = 'FLOWING' | 'FLOATING' | 'DYNAMIC';
export type GlowIntensity = 'SOFT' | 'BALANCED' | 'RADIANT';
export type SoundPresence = 'MINIMAL' | 'IMMERSIVE' | 'RESPONSIVE';
export type ColorTemp = 'COOL' | 'NEUTRAL' | 'WARM';

export interface AppConfig {
  mood: Mood;
  motionStyle: MotionStyle;
  glowIntensity: GlowIntensity;
  soundPresence: SoundPresence;
  colorTemp: ColorTemp;
}

// --- NEW VISUAL CONTROLS ---

export enum ColorMode {
  GRADIENT = 'GRADIENT',
  SOLID = 'SOLID',
  MULTI = 'MULTI'
}

export enum ColorTheme {
  NEBULA_PINK = 'NEBULA_PINK',
  DEEP_SPACE = 'DEEP_SPACE',
  AURORA = 'AURORA',
  SUNSET = 'SUNSET',
  MONO_ICE = 'MONO_ICE',
  MONO_WARM = 'MONO_WARM'
}

export enum LightAction {
  NONE = 'NONE',
  FADE = 'FADE',
  FLASH = 'FLASH',
  STROBE = 'STROBE' // Implemented as "Soft Shimmer"
}

// MediaPipe Type Definitions (simplified for global usage)
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}
