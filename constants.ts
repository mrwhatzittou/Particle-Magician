
import { ShapeType, ColorTheme } from './types';

export const PARTICLE_COUNT = 15000;

export const SHAPE_CONFIGS = [
  { type: ShapeType.SPHERE, label: 'Sphere', gesture: '1 Finger' }, // Default/Fallback
  { type: ShapeType.FLOWER, label: 'Flower', gesture: '2 Fingers' },
  { type: ShapeType.SATURN, label: 'Saturn', gesture: '3 Fingers' },
  { type: ShapeType.HEART, label: 'Heart', gesture: '4 Fingers' },
  { type: ShapeType.FIREWORKS, label: 'Fireworks', gesture: '5 Fingers' },
];

export const COLORS = {
  primary: '#8b5cf6', // Violet
  secondary: '#ec4899', // Pink
  accent: '#3b82f6', // Blue
};

// NEW: Theme Palettes for Color Control
export const THEME_PALETTES: Record<ColorTheme, {
    primary: string;
    secondary: string;
    accent: string;
    solid: string; // Used for Solid Mode
}> = {
    [ColorTheme.NEBULA_PINK]: { 
        primary: '#8b5cf6', secondary: '#ec4899', accent: '#d946ef', solid: '#d946ef' 
    },
    [ColorTheme.DEEP_SPACE]: { 
        primary: '#3b82f6', secondary: '#1e3a8a', accent: '#60a5fa', solid: '#3b82f6' 
    },
    [ColorTheme.AURORA]: { 
        primary: '#10b981', secondary: '#06b6d4', accent: '#34d399', solid: '#0ea5e9' 
    },
    [ColorTheme.SUNSET]: { 
        primary: '#f59e0b', secondary: '#db2777', accent: '#f97316', solid: '#fb923c' 
    },
    [ColorTheme.MONO_ICE]: { 
        primary: '#e0f2fe', secondary: '#7dd3fc', accent: '#bae6fd', solid: '#a5f3fc' 
    },
    [ColorTheme.MONO_WARM]: { 
        primary: '#fcd34d', secondary: '#fbbf24', accent: '#fde68a', solid: '#fbbf24' 
    },
};

export const AUDIO_FREQUENCIES = {
  base: 55, // A1
  modulateMax: 200,
};
