
import { ShapeType, ColorTheme, Mood, ColorMode, LightAction } from './types';

export const PARTICLE_COUNT = 40000;

export const DEFAULT_PRESETS: ShapeType[] = [
  ShapeType.SPHERE,
  ShapeType.FLOWER,
  ShapeType.SATURN,
  ShapeType.HEART,
  ShapeType.FIREWORKS,
];

export const SHAPE_POOL = [
  { type: ShapeType.SPHERE, label: 'Sphere' },
  { type: ShapeType.FLOWER, label: 'Lotus' },
  { type: ShapeType.SATURN, label: 'Saturn' },
  { type: ShapeType.HEART, label: 'Heart' },
  { type: ShapeType.FIREWORKS, label: 'Fireworks' },
  { type: ShapeType.SPIRAL_GALAXY, label: 'Galaxy' },
  { type: ShapeType.BLACK_HOLE, label: 'Black Hole' },
  { type: ShapeType.VORTEX, label: 'Vortex' },
  { type: ShapeType.CYLINDER, label: 'Cylinder' },
  { type: ShapeType.CRYSTAL, label: 'Crystal' },
];

export const MOOD_DEFAULTS = {
  [Mood.CALM]: {
    particleSpeed: 0.25,
    shapePresets: [ShapeType.SPHERE, ShapeType.FLOWER, ShapeType.SPIRAL_GALAXY, ShapeType.SATURN, ShapeType.FIREWORKS],
    colorMode: ColorMode.GRADIENT,
    lightAction: LightAction.NONE,
    colorTheme: ColorTheme.MONO_ICE,
  },
  [Mood.DREAMLIKE]: {
    particleSpeed: 0.5,
    shapePresets: [ShapeType.SPIRAL_GALAXY, ShapeType.FLOWER, ShapeType.VORTEX, ShapeType.HEART, ShapeType.CRYSTAL],
    colorMode: ColorMode.GRADIENT,
    lightAction: LightAction.FADE,
    colorTheme: ColorTheme.NEBULA_PINK,
  },
  [Mood.ENERGIZED]: {
    particleSpeed: 2.0,
    shapePresets: [ShapeType.VORTEX, ShapeType.BLACK_HOLE, ShapeType.FIREWORKS, ShapeType.CYLINDER, ShapeType.SPIRAL_GALAXY],
    colorMode: ColorMode.MULTI,
    lightAction: LightAction.FLASH,
    colorTheme: ColorTheme.SUNSET,
  }
};

export const PARTICLE_SPEED_OPTIONS = [-2, -1, -0.5, -0.25, 0.25, 0.5, 1, 2];

export const COLORS = {
  primary: '#8b5cf6',
  secondary: '#ec4899',
  accent: '#3b82f6',
};

export const THEME_PALETTES: Record<ColorTheme, {
    primary: string;
    secondary: string;
    accent: string;
    solid: string;
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
  base: 55,
  modulateMax: 200,
};
