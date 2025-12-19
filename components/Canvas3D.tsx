
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShapeType, AppConfig, ColorMode, ColorTheme, LightAction } from '../types';
import { PARTICLE_COUNT, THEME_PALETTES } from '../constants';
import { audioService } from '../services/audioService';

interface Canvas3DProps {
  currentShape: ShapeType;
  interactionPoint: { x: number; y: number };
  rotationPoint: { x: number; y: number } | null;
  isLeftPinching: boolean;
  leftHandZoom: number;
  isInteracting: boolean;
  config: AppConfig;
  zoomLevel: number;
  // New Visual Props
  colorMode: ColorMode;
  colorTheme: ColorTheme;
  lightAction: LightAction;
}

const Canvas3D: React.FC<Canvas3DProps> = ({ 
    currentShape, 
    interactionPoint, 
    rotationPoint, 
    isLeftPinching, 
    leftHandZoom,
    isInteracting, 
    config, 
    zoomLevel,
    colorMode,
    colorTheme,
    lightAction
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  
  // Data refs to avoid re-renders
  const targetPositionsRef = useRef<{[key in ShapeType]: Float32Array} | null>(null);
  const shapeRef = useRef(currentShape);
  const interactionRef = useRef({ point: interactionPoint, active: isInteracting });
  
  // Input Refs
  const rotationInputRef = useRef(rotationPoint);
  const isLeftPinchingRef = useRef(isLeftPinching);
  const leftHandZoomRef = useRef(leftHandZoom);
  const configRef = useRef(config);
  
  // Visual Refs
  const colorThemeRef = useRef(colorTheme);
  const colorModeRef = useRef(colorMode);
  const lightActionRef = useRef(lightAction);

  // Logic Refs
  const pulseRef = useRef({ value: 0, target: 0, lastTriggerTime: 0 });
  const pinchSmoothRef = useRef(0); 
  const wasInteractingRef = useRef(false);
  
  // Adaptive Calm Refs
  const stressRef = useRef(0.0); 
  const lastInteractionPosRef = useRef({ x: 0, y: 0 });
  const prevShapeRef = useRef(currentShape);
  
  // Rotation Logic
  const rotationRef = useRef({ x: 0, y: 0 }); 
  const targetRotationRef = useRef({ x: 0, y: 0 }); 
  const rotationOffsetRef = useRef({ x: 0, y: 0 }); 
  const autoRotRef = useRef(0); 

  // Zoom Logic
  const zoomRef = useRef(zoomLevel);
  const cameraZRef = useRef(30);

  // Sync props to refs
  useEffect(() => {
    shapeRef.current = currentShape;
    if (prevShapeRef.current !== currentShape) {
         stressRef.current = Math.min(1.0, stressRef.current + 0.2); 
         prevShapeRef.current = currentShape;
    }
  }, [currentShape]);

  useEffect(() => {
    interactionRef.current = { point: interactionPoint, active: isInteracting };
  }, [interactionPoint, isInteracting]);

  useEffect(() => {
    rotationInputRef.current = rotationPoint;
    isLeftPinchingRef.current = isLeftPinching;
    leftHandZoomRef.current = leftHandZoom;
  }, [rotationPoint, isLeftPinching, leftHandZoom]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  
  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  // Sync Visual Control Refs
  useEffect(() => {
      colorThemeRef.current = colorTheme;
      colorModeRef.current = colorMode;
      lightActionRef.current = lightAction;
  }, [colorTheme, colorMode, lightAction]);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0005);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true, 
      powerPreference: "high-performance",
      depth: false, 
      stencil: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping; 
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.0, 
      0.02, 
      0.98 
    );
    bloomPassRef.current = bloomPass;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Generate Shapes
    const generateShapes = () => {
      const positions: {[key in ShapeType]: Float32Array} = {
        [ShapeType.SPHERE]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.HEART]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.FLOWER]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.SATURN]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.FIREWORKS]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.SPIRAL_GALAXY]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.SUPERNOVA]: new Float32Array(PARTICLE_COUNT * 3),
      };

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;

        // 1. Sphere
        const r = 10 + (Math.random() * 2); 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        positions[ShapeType.SPHERE][idx] = r * Math.sin(phi) * Math.cos(theta);
        positions[ShapeType.SPHERE][idx + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[ShapeType.SPHERE][idx + 2] = r * Math.cos(phi);

        // 2. Heart
        const t = Math.random() * Math.PI * 2;
        const scaleH = 0.5;
        const rH = Math.sqrt(Math.random()) * 0.9 + 0.1; 
        const xH = 16 * Math.pow(Math.sin(t), 3);
        const yH = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        positions[ShapeType.HEART][idx] = xH * scaleH * rH + (Math.random() - 0.5);
        positions[ShapeType.HEART][idx + 1] = yH * scaleH * rH + (Math.random() - 0.5);
        positions[ShapeType.HEART][idx + 2] = (Math.random() * 4 - 2);

        // 3. Flower
        const k = 4;
        const thetaF = Math.random() * Math.PI * 2;
        const rF = Math.cos(k * thetaF) * 10 + 2;
        const phiF = (Math.random() - 0.5) * 2;
        positions[ShapeType.FLOWER][idx] = rF * Math.cos(thetaF);
        positions[ShapeType.FLOWER][idx + 1] = rF * Math.sin(thetaF);
        positions[ShapeType.FLOWER][idx + 2] = phiF * 2;

        // 4. Saturn
        const isRing = Math.random() > 0.3;
        if (isRing) {
           const inner = 12;
           const outer = 22; 
           const dist = inner + Math.random() * (outer - inner);
           const ang = Math.random() * Math.PI * 2;
           positions[ShapeType.SATURN][idx] = Math.cos(ang) * dist;
           positions[ShapeType.SATURN][idx + 1] = (Math.random() - 0.5) * 0.5;
           positions[ShapeType.SATURN][idx + 2] = Math.sin(ang) * dist;
           const x = positions[ShapeType.SATURN][idx];
           const y = positions[ShapeType.SATURN][idx + 1];
           const tilt = 0.4;
           positions[ShapeType.SATURN][idx] = x * Math.cos(tilt) - y * Math.sin(tilt);
           positions[ShapeType.SATURN][idx + 1] = x * Math.sin(tilt) + y * Math.cos(tilt);
        } else {
           const rS = 6;
           const thetaS = Math.random() * Math.PI * 2;
           const phiS = Math.acos((Math.random() * 2) - 1);
           positions[ShapeType.SATURN][idx] = rS * Math.sin(phiS) * Math.cos(thetaS);
           positions[ShapeType.SATURN][idx + 1] = rS * Math.sin(phiS) * Math.sin(thetaS);
           positions[ShapeType.SATURN][idx + 2] = rS * Math.cos(phiS);
        }

        // 5. Fireworks
        const rFW = Math.random() * 25 + 5; 
        const thetaFW = Math.random() * Math.PI * 2;
        const phiFW = Math.acos((Math.random() * 2) - 1);
        positions[ShapeType.FIREWORKS][idx] = rFW * Math.sin(phiFW) * Math.cos(thetaFW);
        positions[ShapeType.FIREWORKS][idx + 1] = rFW * Math.sin(phiFW) * Math.sin(thetaFW);
        positions[ShapeType.FIREWORKS][idx + 2] = rFW * Math.cos(phiFW);

        // 6. Spiral Galaxy
        const arms = 3;
        const armIndex = i % arms;
        const spin = (i / PARTICLE_COUNT) * Math.PI * 8; 
        const galaxyTheta = spin + (armIndex * (Math.PI * 2 / arms));
        const galaxyR = 2.0 + (spin / 1.5) + (Math.random() * 2); 
        
        positions[ShapeType.SPIRAL_GALAXY][idx] = galaxyR * Math.cos(galaxyTheta);
        positions[ShapeType.SPIRAL_GALAXY][idx + 1] = galaxyR * Math.sin(galaxyTheta);
        const centerDist = Math.sqrt(galaxyR);
        positions[ShapeType.SPIRAL_GALAXY][idx + 2] = (Math.random() - 0.5) * (8 / (centerDist + 1));

        // 7. Supernova
        const rSN = 50 + Math.random() * 50; 
        const thetaSN = Math.random() * Math.PI * 2;
        const phiSN = Math.acos((Math.random() * 2) - 1);
        positions[ShapeType.SUPERNOVA][idx] = rSN * Math.sin(phiSN) * Math.cos(thetaSN);
        positions[ShapeType.SUPERNOVA][idx + 1] = rSN * Math.sin(phiSN) * Math.sin(thetaSN);
        positions[ShapeType.SUPERNOVA][idx + 2] = rSN * Math.cos(phiSN);
      }
      return positions;
    };

    targetPositionsRef.current = generateShapes();

    const geometry = new THREE.BufferGeometry();
    const initialPos = new Float32Array(targetPositionsRef.current[ShapeType.SPHERE]);
    geometry.setAttribute('position', new THREE.BufferAttribute(initialPos, 3));
    
    // Attributes
    const behaviors = new Float32Array(PARTICLE_COUNT);
    const randoms = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT);
    
    for(let i=0; i<PARTICLE_COUNT; i++) {
      const r = Math.random();
      if (r < 0.5) behaviors[i] = 0.0;
      else if (r < 0.7) behaviors[i] = 1.0;
      else if (r < 0.8) behaviors[i] = 2.0;
      else behaviors[i] = 3.0;

      randoms[i] = Math.random();
      velocities[i] = 0.0;
    }
    geometry.setAttribute('aBehavior', new THREE.BufferAttribute(behaviors, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1)); 

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uInteractionPos: { value: new THREE.Vector2(0, 0) },
        uPulse: { value: 0 },
        uIsPinching: { value: 0 },
        uAudioLow: { value: 0 }, 
        uAudioHigh: { value: 0 }, 
        uSpeedMult: { value: 1.0 },
        uRotation: { value: new THREE.Vector2(0, 0) }, 
        
        // NEW: Visual Control Uniforms
        uColorMode: { value: 0.0 }, // 0=Gradient, 1=Solid, 2=Multi
        uLightAction: { value: 0.0 }, // 0=None, 1=Fade, 2=Flash, 3=Strobe
        uThemePrimary: { value: new THREE.Color(THEME_PALETTES[ColorTheme.NEBULA_PINK].primary) },
        uThemeSecondary: { value: new THREE.Color(THEME_PALETTES[ColorTheme.NEBULA_PINK].secondary) },
        uThemeAccent: { value: new THREE.Color(THEME_PALETTES[ColorTheme.NEBULA_PINK].accent) },
        uThemeSolid: { value: new THREE.Color(THEME_PALETTES[ColorTheme.NEBULA_PINK].solid) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec2 uInteractionPos;
        uniform float uPulse;
        uniform float uIsPinching;
        uniform float uAudioLow;
        uniform float uAudioHigh;
        uniform float uSpeedMult;
        uniform vec2 uRotation;
        
        // Visual Control Uniforms
        uniform float uColorMode; // 0=Gradient, 1=Solid, 2=Multi
        uniform float uLightAction; // 0=None, 1=Fade, 2=Flash, 3=Strobe
        uniform vec3 uThemePrimary;
        uniform vec3 uThemeSecondary;
        uniform vec3 uThemeAccent;
        uniform vec3 uThemeSolid;

        attribute float aBehavior;
        attribute float aRandom;
        attribute float velocity; 
        
        varying vec3 vColor;
        varying float vAlpha;

        mat3 rotation3dY(float angle) {
            float s = sin(angle);
            float c = cos(angle);
            return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
        }

        mat3 rotation3dX(float angle) {
            float s = sin(angle);
            float c = cos(angle);
            return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
        }

        void main() {
          vec3 pos = position;
          float time = uTime * uSpeedMult;
          float size = 0.0;
          float ambientSpeed = 0.0;

          // Particle Behavior & Size Logic
          if (aBehavior < 0.5) { 
             pos.y += sin(time * 0.5 + aRandom * 10.0) * 0.2;
             pos.x += cos(time * 0.3 + aRandom * 5.0) * 0.1;
             size = 3.5; 
             ambientSpeed = 0.05;
          }
          else if (aBehavior < 1.5) { 
             float angle = time * 1.5 + aRandom * 6.28;
             float radius = 0.3 + aRandom * 0.2;
             pos.x += cos(angle) * radius;
             pos.z += sin(angle) * radius;
             size = 2.5; 
             ambientSpeed = 0.2;
          }
          else if (aBehavior < 2.5) { 
             float jitSpeed = 15.0;
             pos.x += (sin(time * jitSpeed + aRandom * 10.0) * 0.05);
             pos.y += (cos(time * jitSpeed + aRandom * 20.0) * 0.05);
             size = 1.8; 
             ambientSpeed = 0.3;
          }
          else { 
             float pulse = sin(time * 3.0 + aRandom * 6.28);
             size = 3.0 + (pulse * 1.0);
             ambientSpeed = 0.1;
          }
          
          float bassPulse = uAudioLow * 1.5; 
          size *= (1.0 + bassPulse * 0.5);

          // Apply Rotation
          pos = rotation3dY(uRotation.y) * pos;
          pos = rotation3dX(uRotation.x) * pos;

          // Interaction Logic (Vertex Shader Visualization only - Physics handled in JS)
          if (uPulse > 0.01 && aRandom > 0.7) {
             float dist = distance(pos.xy, uInteractionPos);
             float radius = 5.0; 
             if (dist < radius) {
                float influence = smoothstep(radius, 0.0, dist);
                float effect = influence * uPulse;
                vec2 dir = normalize(pos.xy - uInteractionPos);
                pos.xy += dir * effect * 1.0; 
                pos.z += effect * 2.0;
             }
          }

          if (uIsPinching > 0.01) {
             float pDist = distance(pos.xy, uInteractionPos);
             if (pDist < 8.0) {
                 float pInfluence = smoothstep(8.0, 0.0, pDist) * uIsPinching;
                 size *= (1.0 + pInfluence * 0.3);
             }
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float distToCamera = length(mvPosition.xyz);
          float depthFade = smoothstep(85.0, 45.0, distToCamera);
          
          // --- NEW: COLOR MODE LOGIC ---
          vec3 baseColor;
          
          if (uColorMode < 0.5) { 
              // 0 = Gradient (Primary -> Secondary based on random/position mix)
              // Using aRandom gives a dispersed gradient. 
              // Using velocity gives a dynamic gradient.
              float t = smoothstep(0.0, 1.0, (velocity * 20.0) + (aRandom * 0.3));
              baseColor = mix(uThemePrimary, uThemeSecondary, t);
          } 
          else if (uColorMode < 1.5) {
              // 1 = Solid
              baseColor = uThemeSolid;
              // Add tiny variation for depth
              baseColor += (aRandom - 0.5) * 0.1; 
          } 
          else {
              // 2 = Multi (Step function to pick Primary, Secondary, or Accent)
              if (aRandom < 0.33) baseColor = uThemePrimary;
              else if (aRandom < 0.66) baseColor = uThemeSecondary;
              else baseColor = uThemeAccent;
          }

          // Apply Audio Tint
          vec3 audioColor = vec3(0.8, 0.9, 1.0);
          vColor = mix(baseColor, audioColor, uAudioHigh * 0.3);

          // --- NEW: LIGHT ACTION LOGIC (Safe & Comfort Clamped) ---
          float lightMod = 1.0;
          
          if (uLightAction > 0.5 && uLightAction < 1.5) {
              // 1 = Fade (Slow Breathing)
              lightMod = 0.7 + 0.3 * sin(uTime * 1.5); 
          } 
          else if (uLightAction > 1.5 && uLightAction < 2.5) {
              // 2 = Flash (Sparkle)
              // Only affect some particles, rarely
              float spark = pow(sin(uTime * 3.0 + aRandom * 20.0), 20.0);
              lightMod = 1.0 + (spark * 0.8 * aRandom); // Max 1.8x brightness (Safe)
          } 
          else if (uLightAction > 2.5) {
              // 3 = Strobe (Soft Shimmer)
              // High frequency but low amplitude. Not full on/off.
              // This creates a "glittering" effect rather than a harsh strobe.
              lightMod = 0.85 + 0.15 * sin(uTime * 10.0 + aRandom * 50.0);
          }

          vColor *= lightMod;
          vColor *= (0.5 + 0.5 * depthFade); // Depth darkening
          
          // Pinch Interaction Tint
          if (uIsPinching > 0.01) {
              float pDist = distance(pos.xy, uInteractionPos);
              if (pDist < 8.0) {
                  float pStrength = smoothstep(8.0, 0.0, pDist) * uIsPinching;
                  vColor = mix(vColor, vec3(1.0, 0.9, 0.9), pStrength * 0.4);
              }
          }

          gl_PointSize = size * uPixelRatio * (15.0 / -mvPosition.z);
          vAlpha = 0.5 * depthFade; 
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float dist = length(xy);
          
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.48, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Animation Loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      
      // Update Uniforms from Visual Refs
      const mat = particlesRef.current?.material as THREE.ShaderMaterial;
      if (mat) {
          // Color Mode
          const modeMap = { [ColorMode.GRADIENT]: 0.0, [ColorMode.SOLID]: 1.0, [ColorMode.MULTI]: 2.0 };
          mat.uniforms.uColorMode.value = modeMap[colorModeRef.current];

          // Light Action
          const actionMap = { [LightAction.NONE]: 0.0, [LightAction.FADE]: 1.0, [LightAction.FLASH]: 2.0, [LightAction.STROBE]: 3.0 };
          mat.uniforms.uLightAction.value = actionMap[lightActionRef.current];

          // Theme Colors
          const palette = THEME_PALETTES[colorThemeRef.current];
          mat.uniforms.uThemePrimary.value.set(palette.primary);
          mat.uniforms.uThemeSecondary.value.set(palette.secondary);
          mat.uniforms.uThemeAccent.value.set(palette.accent);
          mat.uniforms.uThemeSolid.value.set(palette.solid);
      }
      
      // ZOOM LOGIC
      const MIN_ZOOM_DIST = 8;
      const MAX_ZOOM_DIST = 48;
      
      let zoomFactor = zoomRef.current;
      if (rotationInputRef.current) {
         zoomFactor = leftHandZoomRef.current;
      }
      
      const targetZ = MAX_ZOOM_DIST - (zoomFactor * (MAX_ZOOM_DIST - MIN_ZOOM_DIST));
      cameraZRef.current += (targetZ - cameraZRef.current) * 0.05;
      camera.position.z = cameraZRef.current;
      
      const audioData = audioService.getAudioData();

      if (vignetteRef.current) {
          const breath = 0.4 + (audioData.low * 0.3);
          vignetteRef.current.style.opacity = breath.toFixed(3);
      }
      
      if (!particlesRef.current || !targetPositionsRef.current) return;

      const { point, active } = interactionRef.current;
      const currentConfig = configRef.current; 
      
      // --- ADAPTIVE CALM SYSTEM LOGIC ---
      const dx = point.x - lastInteractionPosRef.current.x;
      const dy = point.y - lastInteractionPosRef.current.y;
      const moveDist = Math.sqrt(dx*dx + dy*dy);
      const moveStress = Math.min(moveDist * 10.0, 1.0); 
      lastInteractionPosRef.current = { x: point.x, y: point.y };

      let stressInput = 0;
      if (moveStress > 0.1) stressInput += moveStress * 0.05; 
      if (active) stressInput += 0.02; 
      
      stressRef.current += (stressInput - 0.005); 
      stressRef.current = Math.max(0, Math.min(1.0, stressRef.current));
      
      audioService.setSystemStress(stressRef.current);
      
      // --- DUAL HAND ROTATION LOGIC ---
      let autoSpeed = 0.05;
      if (shapeRef.current === ShapeType.SPIRAL_GALAXY) autoSpeed = 0.01;
      autoRotRef.current += autoSpeed * 0.01; 

      const leftHandInput = rotationInputRef.current;
      const isPinchingLock = isLeftPinchingRef.current;

      if (leftHandInput) {
          const rawTargetY = leftHandInput.x * 4.0;
          const rawTargetX = leftHandInput.y * -2.5;

          if (isPinchingLock) {
              rotationOffsetRef.current.x = targetRotationRef.current.x - rawTargetX;
              rotationOffsetRef.current.y = targetRotationRef.current.y - rawTargetY;
          } else {
              targetRotationRef.current.x = rawTargetX + rotationOffsetRef.current.x;
              targetRotationRef.current.y = rawTargetY + rotationOffsetRef.current.y;
          }
      }
      
      const targetY = targetRotationRef.current.y + autoRotRef.current;
      const targetX = targetRotationRef.current.x;

      const rotLerpFactor = 0.05;
      rotationRef.current.x += (targetX - rotationRef.current.x) * rotLerpFactor;
      rotationRef.current.y += (targetY - rotationRef.current.y) * rotLerpFactor;

      const uniforms = (particlesRef.current.material as THREE.ShaderMaterial).uniforms;
      uniforms.uRotation.value.set(rotationRef.current.x, rotationRef.current.y);

      let speedMult = 1.0;
      if (currentConfig.motionStyle === 'FLOATING') speedMult = 0.5;
      if (currentConfig.motionStyle === 'DYNAMIC') speedMult = 1.5;
      
      const calmSpeedFactor = 1.0 - (stressRef.current * 0.5);
      uniforms.uSpeedMult.value = speedMult * calmSpeedFactor;

      const dist = camera.position.z;
      const visibleHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * dist;
      const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);
      
      const mouseX = point.x * (visibleWidth / 2);
      const mouseY = point.y * (visibleHeight / 2);

      uniforms.uTime.value = time;
      uniforms.uInteractionPos.value.set(mouseX, mouseY);
      uniforms.uAudioLow.value = audioData.low; 
      uniforms.uAudioHigh.value = audioData.high;
      
      const targetPinch = active ? 1.0 : 0.0;
      pinchSmoothRef.current += (targetPinch - pinchSmoothRef.current) * 0.1;
      uniforms.uIsPinching.value = pinchSmoothRef.current;
      
      audioService.updateSpatial(point.x, pinchSmoothRef.current);

      const COOLDOWN = 1.5;
      if (active && !wasInteractingRef.current) {
          if (time - pulseRef.current.lastTriggerTime > COOLDOWN) {
              pulseRef.current.target = 1.0;
              pulseRef.current.lastTriggerTime = time;
              setTimeout(() => { pulseRef.current.target = 0; }, 300);
          }
      }
      wasInteractingRef.current = active;
      const easeSpeed = 0.05;
      pulseRef.current.value += (pulseRef.current.target - pulseRef.current.value) * easeSpeed;
      uniforms.uPulse.value = pulseRef.current.value;

      let maxBloomStrength = 0.15; 
      if (currentConfig.glowIntensity === 'SOFT') maxBloomStrength = 0.05;
      if (currentConfig.glowIntensity === 'RADIANT') maxBloomStrength = 0.3;
      
      maxBloomStrength *= (1.0 - (stressRef.current * 0.4));

      const pinchInfluence = pinchSmoothRef.current * maxBloomStrength; 
      const pulseInfluence = pulseRef.current.value * maxBloomStrength;
      const targetBloom = Math.min(pinchInfluence + pulseInfluence, 1.0);
      
      if (bloomPassRef.current) {
          bloomPassRef.current.strength += (targetBloom - bloomPassRef.current.strength) * 0.1;
          if (bloomPassRef.current.strength < 0.005) bloomPassRef.current.strength = 0;
      }

      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const velAttribute = particlesRef.current.geometry.attributes.velocity;
      const velocityArray = velAttribute.array as Float32Array;
      
      const target = targetPositionsRef.current[shapeRef.current];
      
      let baseLerp = 0.04; 
      if (currentConfig.motionStyle === 'FLOATING') baseLerp = 0.02;
      if (currentConfig.motionStyle === 'DYNAMIC') baseLerp = 0.08;
      
      const lerpSpeed = shapeRef.current === ShapeType.SUPERNOVA ? 0.2 : baseLerp; 

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        
        let tx = target[idx];
        let ty = target[idx+1];
        let tz = target[idx+2];

        if (shapeRef.current === ShapeType.SPIRAL_GALAXY) {
             const oldTx = tx;
             const oldTy = ty;
             const rot = time * -0.2 * speedMult; 
             tx = oldTx * Math.cos(rot) - oldTy * Math.sin(rot);
             ty = oldTx * Math.sin(rot) + oldTy * Math.cos(rot);
        }
        
        // Calculate the vector towards the Shape Anchor
        const dx = tx - positions[idx];
        const dy = ty - positions[idx+1];
        const dz = tz - positions[idx+2];
        
        const distSq = dx*dx + dy*dy + dz*dz;
        
        let f = lerpSpeed;
        
        if (distSq > 400.0) { 
            f = lerpSpeed * 3.0; // Snap back fast if lost
        } else if (distSq > 100.0) { 
            f = lerpSpeed * 1.5;
        } else if (distSq < 1.0) { 
            f = lerpSpeed * 0.7;
        }
        
        f = Math.min(f, 0.3);

        let moveX = dx * f;
        let moveY = dy * f;
        let moveZ = dz * f;
        
        // --- NEW PINCH INTERACTION PHYSICS ---
        // Additive force: Pulls towards hand, but Shape Anchor (above) keeps pulling back.
        // Result: Elastic deformation.
        if (active) {
            const pdx = mouseX - positions[idx];
            const pdy = mouseY - positions[idx+1];
            const distToHand = Math.sqrt(pdx*pdx + pdy*pdy);
            
            const PINCH_RADIUS = 20.0; 

            if (distToHand < PINCH_RADIUS) {
                // Calculate strength: Stronger at center, falloff to edge
                const strength = Math.pow(1.0 - (distToHand / PINCH_RADIUS), 2.0);
                const pullFactor = 0.15; // Tuning for "Elasticity"

                moveX += pdx * strength * pullFactor;
                moveY += pdy * strength * pullFactor;
                // Pull Z towards 0 (Center plane) for 3D feel
                moveZ += (0 - positions[idx+2]) * strength * pullFactor; 
            }
        }
        
        positions[idx] += moveX;
        positions[idx+1] += moveY;
        positions[idx+2] += moveZ;
        
        velocityArray[i] = Math.sqrt(moveX*moveX + moveY*moveY + moveZ*moveZ);
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.velocity.needsUpdate = true; 
      
      composer.render();
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      (particlesRef.current?.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (rendererRef.current) {
        containerRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      geometry.dispose();
      material.dispose();
    };
  }, []); 

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0 bg-gradient-to-b from-black via-[#050510] to-black" />
      <div 
        ref={vignetteRef}
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-75"
        style={{
            background: 'radial-gradient(circle, transparent 40%, rgba(10,0,20,0.8) 100%)',
            opacity: 0.4
        }}
      />
    </>
  );
};

export default Canvas3D;
