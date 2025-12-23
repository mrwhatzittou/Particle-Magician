
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
  colorMode: ColorMode;
  colorTheme: ColorTheme;
  lightAction: LightAction;
  particleSpeed: number;
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
    lightAction,
    particleSpeed
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  
  const targetPositionsRef = useRef<{[key in ShapeType]: Float32Array} | null>(null);
  const shapeRef = useRef(currentShape);
  const prevShapeRef = useRef(currentShape);
  const interactionRef = useRef({ point: interactionPoint, active: isInteracting });
  const rotationInputRef = useRef(rotationPoint);
  const isLeftPinchingRef = useRef(isLeftPinching);
  const zoomRef = useRef(zoomLevel);
  const colorThemeRef = useRef(colorTheme);
  const colorModeRef = useRef(colorMode);
  const lightActionRef = useRef(lightAction);
  const particleSpeedRef = useRef(particleSpeed);
  
  const interactionSmoothRef = useRef(0);
  const interactionPosSmoothRef = useRef(new THREE.Vector2(0, 0));

  const rotationRef = useRef({ x: 0, y: 0 }); 
  const targetRotationRef = useRef({ x: 0, y: 0 }); 
  const autoRotRef = useRef(0); 
  const morphProgressRef = useRef(0);
  
  // Tracking drop grace window
  const trackingDropTimeRef = useRef<number | null>(null);

  const accumulatedTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now() / 1000);

  useEffect(() => {
    if (currentShape !== shapeRef.current) {
        prevShapeRef.current = shapeRef.current;
        shapeRef.current = currentShape;
        morphProgressRef.current = 0;
    }
  }, [currentShape]);

  useEffect(() => {
    interactionRef.current = { point: interactionPoint, active: isInteracting };
  }, [interactionPoint, isInteracting]);

  useEffect(() => {
    rotationInputRef.current = rotationPoint;
    isLeftPinchingRef.current = isLeftPinching;
    zoomRef.current = zoomLevel;
    colorThemeRef.current = colorTheme;
    colorModeRef.current = colorMode;
    lightActionRef.current = lightAction;
    particleSpeedRef.current = particleSpeed;
  }, [rotationPoint, isLeftPinching, zoomLevel, colorTheme, colorMode, lightAction, particleSpeed]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Dynamic starting position
    camera.position.z = 8 + (1 - zoomRef.current) * 45;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.5, 0.85);
    bloomPass.threshold = 0.55;
    bloomPass.strength = 0.4;
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    const generateShapes = () => {
      const positions: {[key in ShapeType]: Float32Array} = {
        [ShapeType.SPHERE]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.HEART]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.FLOWER]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.SATURN]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.FIREWORKS]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.SPIRAL_GALAXY]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.BLACK_HOLE]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.VORTEX]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.CYLINDER]: new Float32Array(PARTICLE_COUNT * 3),
        [ShapeType.CRYSTAL]: new Float32Array(PARTICLE_COUNT * 3),
      };

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        
        // Sphere
        const rS = 10 + (Math.random() * 1.5); 
        const thetaS = Math.random() * Math.PI * 2;
        const phiS = Math.acos((Math.random() * 2) - 1);
        positions[ShapeType.SPHERE][idx] = rS * Math.sin(phiS) * Math.cos(thetaS);
        positions[ShapeType.SPHERE][idx+1] = rS * Math.sin(phiS) * Math.sin(thetaS);
        positions[ShapeType.SPHERE][idx+2] = rS * Math.cos(phiS);

        // Heart
        const tH = Math.random() * Math.PI * 2;
        positions[ShapeType.HEART][idx] = 16 * Math.pow(Math.sin(tH), 3) * 0.55;
        positions[ShapeType.HEART][idx+1] = (13 * Math.cos(tH) - 5 * Math.cos(2*tH) - 2 * Math.cos(3*tH) - Math.cos(4*tH)) * 0.55;
        positions[ShapeType.HEART][idx+2] = (Math.random() - 0.5) * 3;

        // Saturn
        if (i < PARTICLE_COUNT * 0.4) {
          const rSat = 6 + Math.random() * 1.2;
          const thetaSat = Math.random() * Math.PI * 2;
          const phiSat = Math.acos((Math.random() * 2) - 1);
          positions[ShapeType.SATURN][idx] = rSat * Math.sin(phiSat) * Math.cos(thetaSat);
          positions[ShapeType.SATURN][idx+1] = rSat * Math.sin(phiSat) * Math.sin(thetaSat);
          positions[ShapeType.SATURN][idx+2] = rSat * Math.cos(phiSat);
        } else {
          const rRing = 10 + Math.random() * 6;
          const thetaRing = Math.random() * Math.PI * 2;
          positions[ShapeType.SATURN][idx] = rRing * Math.cos(thetaRing);
          positions[ShapeType.SATURN][idx+1] = rRing * Math.sin(thetaRing) * 0.12;
          positions[ShapeType.SATURN][idx+2] = rRing * Math.sin(thetaRing);
        }

        // Fireworks
        const rFire = 5 + Math.random() * 25;
        const tFire = Math.random() * Math.PI * 2;
        const pFire = Math.acos((Math.random() * 2) - 1);
        positions[ShapeType.FIREWORKS][idx] = rFire * Math.sin(pFire) * Math.cos(tFire);
        positions[ShapeType.FIREWORKS][idx+1] = rFire * Math.sin(pFire) * Math.sin(tFire);
        positions[ShapeType.FIREWORKS][idx+2] = rFire * Math.cos(pFire);

        // Spiral Galaxy
        if (i < PARTICLE_COUNT * 0.25) {
          const rC = Math.pow(Math.random(), 2.0) * 5.5;
          const tC = Math.random() * Math.PI * 2;
          const pC = Math.acos((Math.random() * 2) - 1);
          positions[ShapeType.SPIRAL_GALAXY][idx] = rC * Math.sin(pC) * Math.cos(tC);
          positions[ShapeType.SPIRAL_GALAXY][idx+1] = rC * Math.cos(pC) * 0.55; 
          positions[ShapeType.SPIRAL_GALAXY][idx+2] = rC * Math.sin(pC) * Math.sin(tC);
        } else {
          const arms = 4;
          const arm = i % arms;
          const rD = 4.5 + Math.pow(Math.random(), 0.9) * 22;
          const armAngle = (arm / arms) * Math.PI * 2;
          const spiralTwist = rD * 0.32;
          const noise = (Math.random() - 0.5) * (1.2 + (18 / rD));
          const tD = armAngle + spiralTwist + noise;
          positions[ShapeType.SPIRAL_GALAXY][idx] = rD * Math.cos(tD);
          const zSpread = (Math.random() - 0.5) * (5.5 * Math.exp(-rD / 8.5));
          positions[ShapeType.SPIRAL_GALAXY][idx+1] = zSpread;
          positions[ShapeType.SPIRAL_GALAXY][idx+2] = rD * Math.sin(tD);
        }

        // Black Hole
        const isCoreBH = i < PARTICLE_COUNT * 0.35;
        const rBH = isCoreBH 
          ? Math.pow(Math.random(), 1.4) * 12.0 
          : 9.0 + Math.pow(Math.random(), 0.8) * 16.0; 
        const thetaBH = Math.random() * Math.PI * 2 + (rBH * 0.35); 
        const wellK = 18.0;
        const wellEpsilon = 1.2;
        let yBH = - (wellK / (rBH + wellEpsilon));
        const volumeFactor = isCoreBH ? 1.0 : 4.0 * Math.exp(-rBH / 10.0);
        yBH += (Math.random() - 0.5) * volumeFactor;
        const finalR = rBH + (Math.random() - 0.5) * 0.8;
        positions[ShapeType.BLACK_HOLE][idx] = finalR * Math.cos(thetaBH);
        positions[ShapeType.BLACK_HOLE][idx+1] = yBH; 
        positions[ShapeType.BLACK_HOLE][idx+2] = finalR * Math.sin(thetaBH);

        // Vortex
        const vArms = 6;
        const vArmIdx = i % vArms;
        const vMinR = 10.0;
        const vMaxR = 75.0;
        const vR = vMinR + (Math.pow(Math.random(), 0.85) * (vMaxR - vMinR));
        const vBaseAngle = (vArmIdx / vArms) * Math.PI * 2;
        const vTwist = vR * 0.42; 
        const vNoise = (Math.random() - 0.5) * (1.8 + (25.0 / vR));
        const vTheta = vBaseAngle + vTwist + vNoise;
        positions[ShapeType.VORTEX][idx] = vR * Math.cos(vTheta);
        const vDepthFactor = (vMaxR - vR) / (vMaxR - vMinR);
        const vZ = -18.0 * Math.pow(vDepthFactor, 1.5) + (Math.random() - 0.5) * 5.0;
        positions[ShapeType.VORTEX][idx+1] = vZ; 
        positions[ShapeType.VORTEX][idx+2] = vR * Math.sin(vTheta);

        // Cylinder
        const cRadius = 9;
        const cHeight = 24;
        const isCap = i < PARTICLE_COUNT * 0.2;
        if (isCap) {
          const capIdx = i < PARTICLE_COUNT * 0.1 ? 1 : -1;
          const r = Math.sqrt(Math.random()) * cRadius;
          const theta = Math.random() * Math.PI * 2;
          positions[ShapeType.CYLINDER][idx] = r * Math.cos(theta);
          positions[ShapeType.CYLINDER][idx+1] = capIdx * (cHeight / 2);
          positions[ShapeType.CYLINDER][idx+2] = r * Math.sin(theta);
        } else {
          const r = cRadius + (Math.random() - 0.5) * 0.8;
          const theta = Math.random() * Math.PI * 2;
          const y = (Math.random() - 0.5) * cHeight;
          positions[ShapeType.CYLINDER][idx] = r * Math.cos(theta);
          positions[ShapeType.CYLINDER][idx+1] = y;
          positions[ShapeType.CYLINDER][idx+2] = r * Math.sin(theta);
        }

        // Crystal
        const cSide = Math.floor(Math.random() * 8); 
        const crystalWidth = 8;
        const crystalHeight = 15;
        const uCr = Math.random();
        const vCr = Math.random();
        const crAngle = (Math.floor(cSide / 2) * Math.PI * 2 / 4);
        const nextCrAngle = ((Math.floor(cSide / 2) + 1) * Math.PI * 2 / 4);
        const interAngle = crAngle + (nextCrAngle - crAngle) * uCr;
        const crRadius = crystalWidth * (1.0 - vCr); 
        positions[ShapeType.CRYSTAL][idx] = crRadius * Math.cos(interAngle);
        positions[ShapeType.CRYSTAL][idx+1] = (cSide % 2 === 0 ? 1 : -1) * crystalHeight * vCr;
        positions[ShapeType.CRYSTAL][idx+2] = crRadius * Math.sin(interAngle);
      }

      // Lotus
      let lotusPtr = 0;
      const lotusArr = positions[ShapeType.FLOWER];
      const coreCount = Math.floor(PARTICLE_COUNT * 0.12);
      for (let i = 0; i < coreCount; i++) {
        const idx = lotusPtr * 3;
        const r = Math.pow(Math.random(), 1.5) * 3.2; 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        lotusArr[idx] = r * Math.sin(phi) * Math.cos(theta);
        lotusArr[idx+1] = r * Math.sin(phi) * Math.sin(theta);
        lotusArr[idx+2] = 2.0 + Math.sqrt(Math.max(0, 1.0 - (r/3.2))) * 1.5;
        lotusPtr++;
      }
      const layers = [
        { count: 6, rMin: 3.5, rMax: 10.0, zBase: 1.5, zArch: 5.5, zEnd: 4.5, pPercent: 0.22 },
        { count: 8, rMin: 8.5, rMax: 16.0, zBase: 0.5, zArch: 3.5, zEnd: 1.5, pPercent: 0.31 },
        { count: 12, rMin: 14.5, rMax: 24.0, zBase: -1.0, zArch: 2.0, zEnd: -2.5, pPercent: 0.35 },
      ];
      layers.forEach(layer => {
        const layerCount = Math.floor(PARTICLE_COUNT * layer.pPercent);
        const particlesPerPetal = Math.floor(layerCount / layer.count);
        for (let p = 0; p < layer.count; p++) {
          const petalBaseAngle = (p / layer.count) * Math.PI * 2;
          for (let i = 0; i < particlesPerPetal; i++) {
            const idx = lotusPtr * 3;
            if (idx >= lotusArr.length) break;
            const u = Math.random();
            const v = (Math.random() - 0.5) * 2;
            const r = layer.rMin + u * (layer.rMax - layer.rMin);
            const widthAtU = Math.sin(u * Math.PI) * 0.6; 
            const angle = petalBaseAngle + v * widthAtU * 0.9;
            lotusArr[idx] = r * Math.cos(angle);
            lotusArr[idx+1] = r * Math.sin(angle);
            lotusArr[idx+2] = layer.zBase + Math.sin(u * Math.PI) * layer.zArch + u * (layer.zEnd - layer.zBase);
            lotusPtr++;
          }
        }
      });
      return positions;
    };

    targetPositionsRef.current = generateShapes();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    const randomOffsets = new Float32Array(PARTICLE_COUNT);
    for(let i=0; i<PARTICLE_COUNT; i++) randomOffsets[i] = Math.random();
    geometry.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1));

    Object.entries(targetPositionsRef.current).forEach(([key, value]) => {
        geometry.setAttribute(`attr_${key}`, new THREE.BufferAttribute(value, 3));
    });

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uInteractionPos: { value: new THREE.Vector2(0, 0) },
        uIsInteracting: { value: 0 },
        uMorphProgress: { value: 0 },
        uCurrentShape: { value: 0 },
        uNextShape: { value: 0 },
        uThemePrimary: { value: new THREE.Color() },
        uThemeSecondary: { value: new THREE.Color() },
        uThemeAccent: { value: new THREE.Color() },
        uLightAction: { value: 0 },
        uColorMode: { value: 0 },
        uAudioLow: { value: 0 },
        uAudioHigh: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uInteractionPos;
        uniform float uIsInteracting;
        uniform float uMorphProgress;
        uniform int uCurrentShape;
        uniform int uNextShape;
        uniform float uAudioLow;
        
        attribute vec3 attr_SPHERE;
        attribute vec3 attr_HEART;
        attribute vec3 attr_FLOWER;
        attribute vec3 attr_SATURN;
        attribute vec3 attr_FIREWORKS;
        attribute vec3 attr_SPIRAL_GALAXY;
        attribute vec3 attr_BLACK_HOLE;
        attribute vec3 attr_VORTEX;
        attribute vec3 attr_CYLINDER;
        attribute vec3 attr_CRYSTAL;
        attribute float randomOffset;

        varying vec3 vPos;
        varying float vInteractionHalo;
        varying float vRipple;
        varying float vRandom;

        vec3 getPos(int id) {
            if (id == 0) return attr_SPHERE;
            if (id == 1) return attr_HEART;
            if (id == 2) return attr_FLOWER;
            if (id == 3) return attr_SATURN;
            if (id == 4) return attr_FIREWORKS;
            if (id == 5) return attr_SPIRAL_GALAXY;
            if (id == 6) return attr_BLACK_HOLE;
            if (id == 7) return attr_VORTEX;
            if (id == 8) return attr_CYLINDER;
            return attr_CRYSTAL;
        }

        void main() {
            vec3 posCurrent = getPos(uCurrentShape);
            vec3 posNext = getPos(uNextShape);
            vec3 pos = mix(posCurrent, posNext, uMorphProgress);
            float beatScale = 1.0 + uAudioLow * 0.15;
            pos *= beatScale;

            if (uCurrentShape == 5 || uNextShape == 5 || uCurrentShape == 6 || uNextShape == 6 || uCurrentShape == 7 || uNextShape == 7) {
                float driftFactor = (uCurrentShape == 5 || uCurrentShape == 6 || uCurrentShape == 7) ? (1.0 - uMorphProgress) : uMorphProgress;
                float dist = length(pos.xz);
                float speedMod = (uCurrentShape == 7 || uNextShape == 7) ? 1.4 : 0.45;
                float speed = speedMod * (1.0 / (1.0 + dist * 0.12));
                float angle = uTime * speed;
                float s = sin(angle);
                float c = cos(angle);
                pos.xz = mat2(c, -s, s, c) * pos.xz;
                
                if (uCurrentShape == 6 || uNextShape == 6 || uCurrentShape == 7 || uNextShape == 7) {
                   float flowRate = (uCurrentShape == 7 || uNextShape == 7) ? 0.35 : 0.15;
                   float flow = (sin(uTime * flowRate - dist * 0.35) * 0.05 + 0.02) * driftFactor;
                   pos.xz *= (1.0 - flow * 0.5);
                   float sinkScale = (uCurrentShape == 7 || uNextShape == 7) ? 4.0 : 2.5;
                   pos.y -= abs(flow) * sinkScale;
                } else {
                   pos *= mix(1.0, 1.0 - sin(uTime * 0.1) * 0.05, driftFactor);
                }
            }

            vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
            mvPos.z = min(mvPos.z, -2.0);
            float distToPinch = distance(uInteractionPos, mvPos.xy);
            float halo = smoothstep(18.0, 0.0, distToPinch);
            vInteractionHalo = halo;
            float ripple = 0.0;
            if (uIsInteracting > 0.05) {
                float wave = sin(distToPinch * 0.4 - uTime * 6.0);
                ripple = wave * halo * uIsInteracting;
            }
            vRipple = ripple;
            if (uIsInteracting > 0.0) {
                vec2 dir = normalize(uInteractionPos - mvPos.xy);
                float pullStrength = smoothstep(22.0, 0.5, distToPinch) * 7.5;
                float pushStrength = smoothstep(1.5, 0.0, distToPinch) * 7.8;
                float totalForce = (pullStrength - pushStrength) * uIsInteracting;
                mvPos.xy += dir * totalForce;
                mvPos.z += (pullStrength * 1.8) * uIsInteracting * (1.0 - smoothstep(4.0, 0.0, distToPinch));
            }
            vPos = pos;
            vRandom = randomOffset;
            float baseSize = (uCurrentShape == 7 || uNextShape == 7) ? 1.25 : 1.45;
            float sizeMod = 0.95 + halo * 0.4 - smoothstep(1.5, 0.0, distToPinch) * 0.25;
            gl_PointSize = (baseSize * sizeMod + abs(ripple) * 0.15) * (35.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uThemePrimary;
        uniform vec3 uThemeSecondary;
        uniform vec3 uThemeAccent;
        uniform float uTime;
        uniform int uLightAction;
        uniform int uColorMode;
        uniform float uAudioHigh;
        varying vec3 vPos;
        varying float vInteractionHalo;
        varying float vRipple;
        varying float vRandom;
        void main() {
            vec3 baseColor;
            if (uColorMode == 0) {
                float distFactor = clamp(length(vPos) * 0.045, 0.0, 1.0);
                baseColor = mix(uThemePrimary, uThemeSecondary, distFactor);
            } else if (uColorMode == 1) {
                float form = 0.7 + 0.3 * clamp(1.0 - length(vPos) * 0.02, 0.0, 1.0);
                baseColor = uThemeAccent * form;
            } else {
                if (vRandom < 0.33) baseColor = uThemePrimary;
                else if (vRandom < 0.66) baseColor = uThemeSecondary;
                else baseColor = uThemeAccent;
            }
            vec3 audioColor = mix(baseColor, uThemeAccent, uAudioHigh * 0.8);
            vec3 glowColor = mix(audioColor, uThemeAccent, vInteractionHalo * 0.65);
            float energyFlash = smoothstep(0.5, 0.9, vRipple);
            vec3 finalColor = glowColor + uThemeAccent * energyFlash * (0.35 + uAudioHigh * 0.5);
            float actionBrightness = 1.0;
            if (uLightAction == 1) {
                actionBrightness = 0.75 + 0.25 * sin(uTime * 1.5);
            } else if (uLightAction == 2) {
                float twinkle = sin(uTime * 12.0 + vRandom * 30.0);
                if (twinkle > 0.975) actionBrightness = 2.5;
            } else if (uLightAction == 3) {
                actionBrightness = 0.85 + 0.2 * sin(uTime * 25.0 + vRandom * 15.0);
            }
            finalColor *= actionBrightness;
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            float rSq = dot(cxy, cxy);
            if (rSq > 1.0) discard;
            float alpha = (0.65 + vInteractionHalo * 0.35 + energyFlash * 0.2) * (1.0 - pow(rSq, 2.0));
            gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    const shapeToIndex = (type: ShapeType): number => {
        const types = [
          ShapeType.SPHERE, ShapeType.HEART, ShapeType.FLOWER, ShapeType.SATURN, ShapeType.FIREWORKS, 
          ShapeType.SPIRAL_GALAXY, ShapeType.BLACK_HOLE, ShapeType.VORTEX, ShapeType.CYLINDER, ShapeType.CRYSTAL
        ];
        return types.indexOf(type);
    };

    const lightActionToIndex = (action: LightAction): number => {
        if (action === LightAction.FADE) return 1;
        if (action === LightAction.FLASH) return 2;
        if (action === LightAction.STROBE) return 3;
        return 0;
    };

    const colorModeToIndex = (mode: ColorMode): number => {
        if (mode === ColorMode.GRADIENT) return 0;
        if (mode === ColorMode.SOLID) return 1;
        return 2;
    };

    const animate = () => {
      requestAnimationFrame(animate);
      const now = performance.now() / 1000;
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      accumulatedTimeRef.current += dt * particleSpeedRef.current;
      const time = accumulatedTimeRef.current;
      
      if (particlesRef.current) {
        const mat = particlesRef.current.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = time;
        const audio = audioService.getAudioData();
        mat.uniforms.uAudioLow.value = audio.low;
        mat.uniforms.uAudioHigh.value = audio.high;

        const targetX = interactionRef.current.point.x * 12;
        const targetY = interactionRef.current.point.y * 2.5; 
        interactionPosSmoothRef.current.lerp(new THREE.Vector2(targetX, targetY), 0.16);
        mat.uniforms.uInteractionPos.value.copy(interactionPosSmoothRef.current);
        
        const targetInteract = interactionRef.current.active ? 1.0 : 0.0;
        interactionSmoothRef.current += (targetInteract - interactionSmoothRef.current) * 0.08;
        mat.uniforms.uIsInteracting.value = interactionSmoothRef.current;
        
        morphProgressRef.current = Math.min(1.0, morphProgressRef.current + 0.012);
        mat.uniforms.uMorphProgress.value = morphProgressRef.current;
        mat.uniforms.uCurrentShape.value = shapeToIndex(prevShapeRef.current);
        mat.uniforms.uNextShape.value = shapeToIndex(shapeRef.current);
        mat.uniforms.uLightAction.value = lightActionToIndex(lightActionRef.current);
        mat.uniforms.uColorMode.value = colorModeToIndex(colorModeRef.current);
        
        const palette = THEME_PALETTES[colorThemeRef.current];
        mat.uniforms.uThemePrimary.value.set(palette.primary);
        mat.uniforms.uThemeSecondary.value.set(palette.secondary);
        mat.uniforms.uThemeAccent.value.set(palette.accent);

        if (rotationInputRef.current) {
            targetRotationRef.current.x = rotationInputRef.current.y * 5.0;
            targetRotationRef.current.y = rotationInputRef.current.x * 5.0;
            trackingDropTimeRef.current = now; 
        }

        const isTrackingLost = rotationInputRef.current === null;
        const graceWindow = 0.4; 
        const withinGrace = isTrackingLost && trackingDropTimeRef.current && (now - trackingDropTimeRef.current < graceWindow);

        if (!isLeftPinchingRef.current && (rotationInputRef.current !== null || withinGrace)) {
            rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * 0.08;
            rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * 0.08;
        }

        particlesRef.current.rotation.x = rotationRef.current.x;
        particlesRef.current.rotation.y = rotationRef.current.y + autoRotRef.current;
        autoRotRef.current += 0.0008 * particleSpeedRef.current;
      }

      // Re-link camera position Z strictly to zoomLevel for consistent depth mapping
      camera.position.z = 8 + (1 - zoomLevel) * 45;
      composer.render();
    };
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-black" />;
};

export default Canvas3D;
