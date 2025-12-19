
import { ShapeType } from "../types";

// Adaptive Smoother: "Apple-style" fluid motion
class AdaptiveSmoother {
  private current: { x: number; y: number } | null = null;
  
  // Tuning Params
  private minAlpha = 0.03; // More stable when still
  private maxAlpha = 0.35; // Smoother max speed
  private velocityThreshold = 0.15; 

  public update(target: { x: number; y: number }): { x: number; y: number } {
    if (!this.current) {
      this.current = target;
      return target;
    }

    const dx = target.x - this.current.x;
    const dy = target.y - this.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let factor = dist / this.velocityThreshold;
    if (factor > 1) factor = 1;
    
    const easedFactor = 1 - (1 - factor) * (1 - factor); 
    const alpha = this.minAlpha + (this.maxAlpha - this.minAlpha) * easedFactor;

    this.current.x += dx * alpha;
    this.current.y += dy * alpha;

    return { ...this.current };
  }

  public reset() {
    this.current = null;
  }
}

// Scalar Smoother for Depth/Zoom
class ScalarSmoother {
    private current: number | null = null;
    private alpha = 0.1; // Slower smoothing for stable zoom
    
    public update(target: number): number {
        if (this.current === null) {
            this.current = target;
            return target;
        }
        this.current += (target - this.current) * this.alpha;
        return this.current;
    }
    
    public reset() {
        this.current = null;
    }
}

export interface DualHandResult {
    rightHand: {
        shape: ShapeType | null;
        isPinching: boolean;
        cursor: { x: number; y: number };
        active: boolean;
    };
    leftHand: {
        cursor: { x: number; y: number };
        active: boolean;
        isPinching: boolean; // For Rotation Lock
        handSize: number; // For Depth Zoom (0 to 1)
    };
}

export class VisionService {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: ((results: any) => void) | null = null;
  
  // Independent Smoothers for Role Separation
  private rightHandSmoother = new AdaptiveSmoother();
  private leftHandSmoother = new AdaptiveSmoother();
  private rightPinchSmoother = new ScalarSmoother(); 
  private leftPinchSmoother = new ScalarSmoother();
  private leftDepthSmoother = new ScalarSmoother();

  constructor() {
    if (window.Hands) {
      this.hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 2, 
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.hands.onResults((results: any) => {
        if (this.onResultsCallback) {
          this.onResultsCallback(results);
        }
      });
    }
  }

  public start(videoElement: HTMLVideoElement, onResults: (results: any) => void) {
    this.videoElement = videoElement;
    this.onResultsCallback = onResults;
    
    this.rightHandSmoother.reset();
    this.leftHandSmoother.reset();
    this.rightPinchSmoother.reset();
    this.leftPinchSmoother.reset();
    this.leftDepthSmoother.reset();

    if (this.hands && window.Camera) {
      this.camera = new window.Camera(videoElement, {
        onFrame: async () => {
          if (this.videoElement) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480,
      });
      this.camera.start();
    }
  }

  public async stop() {
    if (this.camera) {
      this.camera = null;
    }
  }

  // --- DUAL HAND PROCESSOR ---
  public processDualHands(results: any): DualHandResult {
      const output: DualHandResult = {
          rightHand: { shape: null, isPinching: false, cursor: {x:0, y:0}, active: false },
          leftHand: { cursor: {x:0, y:0}, active: false, isPinching: false, handSize: 0.4 } // default zoom
      };

      if (!results.multiHandLandmarks || !results.multiHandedness) return output;

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          const label = results.multiHandedness[i].label; // "Left" or "Right"
          
          // Index Tip (8) for Cursor
          const indexTip = landmarks[8];
          const rawCursor = {
              x: (1 - indexTip.x) * 2 - 1, // Mirror X
              y: -(indexTip.y * 2 - 1)
          };

          // Pinch Detection (Common for both)
          const thumbTip = landmarks[4];
          const pinchDist = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) + 
              Math.pow(indexTip.y - thumbTip.y, 2)
          );

          if (label === 'Right') {
              // --- RIGHT HAND LOGIC ---
              output.rightHand.active = true;
              output.rightHand.cursor = this.rightHandSmoother.update(rawCursor);
              output.rightHand.shape = this.detectShape(landmarks);
              
              const smoothedPinch = this.rightPinchSmoother.update(pinchDist);
              output.rightHand.isPinching = smoothedPinch < 0.05;

          } else if (label === 'Left') {
              // --- LEFT HAND LOGIC ---
              output.leftHand.active = true;
              output.leftHand.cursor = this.leftHandSmoother.update(rawCursor);
              
              // Left Hand Pinch (For Rotation Lock)
              const smoothedLeftPinch = this.leftPinchSmoother.update(pinchDist);
              output.leftHand.isPinching = smoothedLeftPinch < 0.05;

              // Depth/Zoom Estimation using Hand Size
              // Distance from Wrist (0) to Middle MCP (9) is a stable proxy for depth
              const wrist = landmarks[0];
              const middleMCP = landmarks[9];
              const rawSize = Math.sqrt(
                  Math.pow(wrist.x - middleMCP.x, 2) + 
                  Math.pow(wrist.y - middleMCP.y, 2)
              );
              
              // Normalize Raw Size (Approx 0.05 far to 0.25 close)
              // We map this to 0 (far) -> 1 (close)
              let zoomFactor = (rawSize - 0.05) / (0.25 - 0.05);
              zoomFactor = Math.max(0, Math.min(1, zoomFactor));
              
              output.leftHand.handSize = this.leftDepthSmoother.update(zoomFactor);
          }
      }

      return output;
  }

  private detectShape(landmarks: any[]): ShapeType | null {
    // Landmarks Map:
    // 4: Thumb Tip
    // 8: Index Tip, 6: Index PIP
    // 12: Middle Tip, 10: Middle PIP
    // 16: Ring Tip, 14: Ring PIP
    // 20: Pinky Tip, 18: Pinky PIP
    // 17: Pinky MCP (Base of Pinky)

    // 1. Detect Extended Fingers (Y-axis points down, so Lower Y = Higher Position)
    // Basic check: Tip above PIP Joint
    
    const isIndexExtended = landmarks[8].y < landmarks[6].y;
    
    // Middle - Add "clearly extended" buffer for 1 vs 2 distinction
    // Must be significantly above PIP joint (0.03 normalized units) to count.
    // This effectively prevents "2 Fingers" detection if the middle finger is lazy/curled.
    const isMiddleExtended = landmarks[12].y < (landmarks[10].y - 0.03); 

    const isRingExtended = landmarks[16].y < landmarks[14].y;
    const isPinkyExtended = landmarks[20].y < landmarks[18].y;

    // Thumb - Only strictly required for 5-finger gesture
    // Using simple X-distance check from Pinky base (Works for open palm facing camera)
    const isThumbExtended = Math.abs(landmarks[4].x - landmarks[17].x) > 0.15;

    // 2. Priority-Based Pattern Matching
    // Order matters: Check most complex shapes first (5 fingers) down to simplest (1 finger)
    
    // 5 FINGERS -> FIREWORKS
    // Strict: All 5 fingers must be extended (including Thumb).
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbExtended) {
        return ShapeType.FIREWORKS;
    }

    // 4 FINGERS -> HEART
    // Index, Middle, Ring, Pinky extended. Thumb ignored (usually down or tucked).
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
        return ShapeType.HEART;
    }

    // 3 FINGERS -> SATURN
    // Index, Middle, Ring. Pinky must be down.
    if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
        return ShapeType.SATURN;
    }

    // 2 FINGERS -> FLOWER
    // Index, Middle. Ring & Pinky must be down.
    // Thumb is explicitly ignored here to fix "1 vs 2" confusion.
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return ShapeType.FLOWER;
    }

    // 1 FINGER -> SPHERE
    // Index only. Middle, Ring, Pinky down.
    // Thumb is explicitly ignored here.
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return ShapeType.SPHERE;
    }

    // No valid shape pattern matched (e.g. Rock on sign, Fist, etc.)
    return null;
  }
}

export const visionService = new VisionService();
