
import { ShapeType } from "../types";

export type VisionStatus = 'STARTING' | 'ONLINE' | 'NO_HANDS' | 'ERROR';

class AdaptiveSmoother {
  private current: { x: number; y: number } | null = null;
  private minAlpha = 0.05;
  private maxAlpha = 0.4;
  private velocityThreshold = 0.1;
  private deadzone = 0.005;

  public update(target: { x: number; y: number }): { x: number; y: number } {
    if (!this.current) {
      this.current = { ...target };
      return target;
    }

    const dx = target.x - this.current.x;
    const dy = target.y - this.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.deadzone) return { ...this.current };

    let factor = Math.min(1, dist / this.velocityThreshold);
    const alpha = this.minAlpha + (this.maxAlpha - this.minAlpha) * factor;

    const maxDelta = 0.15;
    const clampedDx = Math.max(-maxDelta, Math.min(maxDelta, dx));
    const clampedDy = Math.max(-maxDelta, Math.min(maxDelta, dy));

    this.current.x += clampedDx * alpha;
    this.current.y += clampedDy * alpha;

    return { ...this.current };
  }

  public reset() { this.current = null; }
}

class ScalarSmoother {
    private current: number | null = null;
    private alpha = 0.12; // Slightly more damped for stable zoom
    private lastOutput = 0;
    private deadzone = 0.002;
    
    public update(target: number, customAlpha?: number): number {
        if (this.current === null) {
            this.current = target;
            this.lastOutput = target;
            return target;
        }
        const a = customAlpha ?? this.alpha;
        this.current += (target - this.current) * a;
        if (Math.abs(this.current - this.lastOutput) > this.deadzone) {
            this.lastOutput = this.current;
        }
        return this.lastOutput;
    }
    public reset() { this.current = null; this.lastOutput = 0; }
}

export interface DualHandResult {
    status: VisionStatus;
    rightHand: {
        fingerCount: number | null;
        cursor: { x: number; y: number };
        active: boolean;
    };
    leftHand: {
        cursor: { x: number; y: number };
        active: boolean;
        isLocked: boolean;
        handSize: number;
        motionStatus: string;
    };
}

export class VisionService {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: ((results: any) => void) | null = null;
  private status: VisionStatus = 'STARTING';
  
  private rightHandSmoother = new AdaptiveSmoother();
  private leftHandSmoother = new AdaptiveSmoother();
  private leftLockSmoother = new ScalarSmoother();
  private leftDepthSmoother = new ScalarSmoother();
  
  private rightFingerBuffer: number[] = [];
  private readonly BUFFER_SIZE = 28;

  constructor() {
    if (window.Hands) {
      this.hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      this.hands.onResults((results: any) => {
        this.status = results.multiHandLandmarks?.length > 0 ? 'ONLINE' : 'NO_HANDS';
        if (this.onResultsCallback) this.onResultsCallback(results);
      });
    }
  }

  public async start(videoElement: HTMLVideoElement, onResults: (results: any) => void) {
    this.videoElement = videoElement;
    this.onResultsCallback = onResults;
    this.status = 'STARTING';
    
    this.rightHandSmoother.reset();
    this.leftHandSmoother.reset();
    this.leftDepthSmoother.reset();
    this.rightFingerBuffer = [];

    if (this.hands && window.Camera) {
      this.camera = new window.Camera(videoElement, {
        onFrame: async () => {
          if (this.videoElement) await this.hands.send({ image: this.videoElement });
        },
        width: 640,
        height: 480,
      });
      try {
        await this.camera.start();
      } catch (e) {
        this.status = 'ERROR';
      }
    }
  }

  public processDualHands(results: any): DualHandResult {
      const output: DualHandResult = {
          status: this.status,
          rightHand: { fingerCount: null, cursor: {x:0, y:0}, active: false },
          leftHand: { cursor: {x:0, y:0}, active: false, isLocked: false, handSize: 0.4, motionStatus: 'Idle' }
      };

      if (!results.multiHandLandmarks || !results.multiHandedness) return output;

      const videoWidth = this.videoElement?.videoWidth || 640;
      const videoHeight = this.videoElement?.videoHeight || 480;
      const aspect = videoWidth / videoHeight;

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          const handedness = results.multiHandedness[i];
          const isRight = handedness.label === 'Right';
          
          const wrist = landmarks[0];
          const indexTip = landmarks[8];
          const rawCursor = { x: (1 - indexTip.x) * 2 - 1, y: -(indexTip.y * 2 - 1) };

          if (isRight) {
              output.rightHand.active = true;
              output.rightHand.cursor = this.rightHandSmoother.update(rawCursor);
              const count = this.countFingersRobust(landmarks);
              if (count !== null) {
                this.rightFingerBuffer.push(count);
                if (this.rightFingerBuffer.length > this.BUFFER_SIZE) this.rightFingerBuffer.shift();
                output.rightHand.fingerCount = this.getStableCount(this.rightFingerBuffer);
              }
          } else {
              output.leftHand.active = true;
              output.leftHand.cursor = this.leftHandSmoother.update(rawCursor);
              
              // ZOOM DECOUPLED: Respond purely to landmark scale relative to wrist
              const d1 = this.getIsotropicDist(wrist, landmarks[5], aspect); 
              const d2 = this.getIsotropicDist(wrist, landmarks[9], aspect);
              const avgSize = (d1 + d2) / 2;
              
              // Extended range for closer close-ups. 0.05 is far, 0.45 is very close.
              let rawZoom = (avgSize - 0.04) / (0.46 - 0.04);
              rawZoom = Math.max(0, Math.min(1, rawZoom));
              const curvedZoom = Math.pow(rawZoom, 1.25);
              output.leftHand.handSize = this.leftDepthSmoother.update(curvedZoom);

              const thumbTip = landmarks[4];
              const pinchDist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
              const isLocked = pinchDist < 0.06 || this.detectFist(landmarks);
              output.leftHand.isLocked = this.leftLockSmoother.update(isLocked ? 1 : 0) > 0.5;
              output.leftHand.motionStatus = output.leftHand.isLocked ? 'Locked' : 'Rotating';
          }
      }
      return output;
  }

  private getIsotropicDist(l1: any, l2: any, aspect: number) {
      const dx = (l1.x - l2.x) * aspect;
      const dy = (l1.y - l2.y);
      const dz = (l1.z - l2.z);
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  private getStableCount(buffer: number[]): number | null {
      if (buffer.length < 10) return null;
      const counts: Record<number, number> = {};
      buffer.forEach(c => counts[c] = (counts[c] || 0) + 1);
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [topVal, topCount] = sorted[0];
      return topCount >= buffer.length * 0.8 ? parseInt(topVal) : null;
  }

  private countFingersRobust(landmarks: any[]): number | null {
    const isUp = (tip: number, pip: number, mcp: number) => {
        const t = landmarks[tip], p = landmarks[pip], m = landmarks[mcp];
        return t.y < p.y && p.y < m.y;
    };
    let count = 0;
    if (isUp(8, 6, 5)) count++;
    if (isUp(12, 10, 9)) count++;
    if (isUp(16, 14, 13)) count++;
    if (isUp(20, 18, 17)) count++;
    const thumbTip = landmarks[4], indexBase = landmarks[5];
    if (Math.abs(thumbTip.x - indexBase.x) > 0.12) count++;
    return count > 0 ? count : null;
  }

  private detectFist(landmarks: any[]): boolean {
    const wrist = landmarks[0];
    const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    return tips.every(tip => Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2)) < 0.2);
  }
}

export const visionService = new VisionService();
