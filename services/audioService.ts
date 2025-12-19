
import { AppConfig, Mood, ShapeType } from "../types";

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null; // Spatial Audio
  private reverbNode: ConvolverNode | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;
  
  // Mixer Channels
  private padGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;

  // State
  private isInitialized = false;
  private isMuted = false;
  private isPlaying = false;
  
  // Intelligence State
  private config: AppConfig | null = null;
  private currentShape: ShapeType = ShapeType.SPHERE;
  private interactionIntensity: number = 0; // 0 to 1
  
  // Adaptive Calm System
  private systemStress: number = 0; // 0 (Calm) to 1 (Overloaded)
  
  // Scheduling
  private nextChordTime = 0;
  private nextArpTime = 0;
  private schedulerTimer: number | null = null;
  private chordIndex = 0;

  // Music Theory: 
  // 1. Atmospheric Palette (C Lydian/Minorish - Spacey, Dreamy)
  private chordsAtmospheric = [
    [130.81, 196.00, 246.94, 329.63], // Cmaj7 (C3, G3, B3, E4)
    [164.81, 220.00, 293.66, 392.00], // Em7 (E3, A3, D4, G4)
    [110.00, 164.81, 196.00, 261.63], // Am9 (A2, E3, G3, C4)
    [146.83, 220.00, 246.94, 369.99]  // D6/9 (D3, A3, B3, F#4)
  ];

  // 2. Uplifting Palette (Major - For Fireworks/Celebration)
  private chordsUplifting = [
    [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
    [196.00, 246.94, 293.66, 329.63], // G6 (G3, B3, D4, E4)
    [130.81, 164.81, 196.00, 246.94], // Cmaj9 (C3, E3, G3, B3)
    [220.00, 261.63, 293.66, 329.63]  // Am7 (A3, C4, D4, E4)
  ];
  
  // Pentatonic scale for random arpeggios
  private scale = [523.25, 659.25, 739.99, 783.99, 987.77, 1046.50];

  public init() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // --- Master Chain ---
    this.masterGain = this.ctx.createGain();
    // HEADROOM: Reduced default gain from 0.8 to 0.6 for comfort
    this.masterGain.gain.value = this.isMuted ? 0 : 0.6;

    // Spatial Panner (New)
    this.pannerNode = this.ctx.createStereoPanner();

    // Master Filter (Controlled by Z-depth/Intensity)
    // Constraint: Low Q to avoid whistling, gentle roll-off
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 400; // Start darker
    // RESTRAINT: Lower Q for gentler slope (was 0.5)
    this.masterFilter.Q.value = 0.3; 

    // Analyser (Visualizer)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256; 
    this.analyser.smoothingTimeConstant = 0.9; // Smoother visualizer
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    // Connections: 
    // Mixers -> Reverb/Direct -> Filter -> MasterGain -> Panner -> Analyser -> Destination
    this.masterFilter.connect(this.masterGain);
    this.masterGain.connect(this.pannerNode);
    this.pannerNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // --- Reverb (The "Space") ---
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(3.5, 2.5); // Longer, softer tail
    this.reverbNode.connect(this.masterFilter);

    // --- Sub-Mixers ---
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.5; // Slightly boosted for warmth
    this.padGain.connect(this.reverbNode); 
    this.padGain.connect(this.masterFilter); 

    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = 0.12;
    this.arpGain.connect(this.reverbNode);
    this.arpGain.connect(this.masterFilter);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.04; // Gentle background texture
    this.noiseGain.connect(this.masterFilter);

    this.isInitialized = true;
  }

  public async start() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.isPlaying = true;
    this.schedule();
    this.playCosmicNoise();
  }

  public configure(config: AppConfig) {
    this.config = config;
    if (!this.ctx || !this.masterGain) return;
    
    // Apply initial mood settings immediately
    const now = this.ctx.currentTime;
    let masterVol = 0.6; // Reduced base
    if (config.soundPresence === 'MINIMAL') masterVol = 0.4;
    if (!this.isMuted) this.masterGain.gain.setTargetAtTime(masterVol, now, 2.0); // Slow fade
  }

  public getAudioData() {
    if (!this.analyser || !this.frequencyData) return { low: 0, high: 0 };
    
    this.analyser.getByteFrequencyData(this.frequencyData);
    
    const length = this.frequencyData.length;
    // Low frequency range (bass)
    const lowBound = Math.floor(length * 0.2); 
    
    let lowSum = 0;
    let highSum = 0;
    
    for (let i = 0; i < length; i++) {
        const val = this.frequencyData[i] / 255.0;
        if (i < lowBound) {
            lowSum += val;
        } else {
            highSum += val;
        }
    }
    
    return {
        low: lowSum / lowBound || 0,
        high: highSum / (length - lowBound) || 0
    };
  }

  // --- Intelligent Control Methods ---

  public setShape(shape: ShapeType) {
      this.currentShape = shape;
  }

  // Adaptive Calm: Receives stress level from 0 to 1
  public setSystemStress(stress: number) {
      this.systemStress = stress;
      this.updateFilterAndGain();
  }

  public updateSpatial(panX: number, presenceIntensity: number) {
      // panX: -1 (Left) to 1 (Right)
      // presenceIntensity: 0 (Far/Idle) to 1 (Close/Active)
      
      this.interactionIntensity = presenceIntensity;
      
      if (!this.ctx || !this.pannerNode || !this.arpGain) return;
      const now = this.ctx.currentTime;

      // 1. Spatial Panning
      this.pannerNode.pan.setTargetAtTime(panX * 0.5, now, 0.5); // Narrower field for comfort
      
      this.updateFilterAndGain();

      // 3. Dynamic Volume Mixing
      // Subtle volume bump on interaction
      const targetArpVol = 0.12 + (presenceIntensity * 0.08);
      this.arpGain.gain.setTargetAtTime(targetArpVol, now, 0.5);
  }

  // Centralized filter logic handling both Presence and Stress
  private updateFilterAndGain() {
      if (!this.ctx || !this.masterFilter || !this.masterGain) return;
      const now = this.ctx.currentTime;

      let idleFreq = 300;
      let maxFreq = 1200; 
      
      // Personalization Tuning
      if (this.config?.mood === Mood.CALM) { idleFreq = 200; maxFreq = 800; } 
      if (this.config?.mood === Mood.ENERGIZED) { idleFreq = 400; maxFreq = 1600; }

      // Calculate Target Frequency based on Presence
      let targetFreq = idleFreq + (this.interactionIntensity * (maxFreq - idleFreq));
      
      // ADAPTIVE CALM: Apply Stress dampening
      // As stress goes to 1, we pull the frequency DOWN significantly to "muffle" the chaos
      const stressFactor = 1.0 - (this.systemStress * 0.6); // Reduces max freq by up to 60%
      targetFreq *= stressFactor;

      // Ensure we don't go below a muffled murmur
      targetFreq = Math.max(targetFreq, 150);

      // Slower time constant for smoother swells
      this.masterFilter.frequency.setTargetAtTime(targetFreq, now, 0.6);

      // ADAPTIVE GAIN: Duck volume slightly during high stress
      if (!this.isMuted) {
          let targetVol = 0.6; // Base 0.6
          if (this.config?.soundPresence === 'MINIMAL') targetVol = 0.4;
          
          // Reduce volume by up to 20% during peak stress
          targetVol *= (1.0 - (this.systemStress * 0.2));
          this.masterGain.gain.setTargetAtTime(targetVol, now, 0.6);
      }
  }

  // --- Scheduler & Sound Generation ---

  private schedule() {
    if (!this.ctx || !this.isPlaying) return;
    const lookahead = 0.2; 
    const now = this.ctx.currentTime;

    // Mood-based Tuning
    let arpChance = 0.3;
    let chordWait = 8;
    
    if (this.config?.mood === Mood.CALM) { arpChance = 0.15; chordWait = 12; }
    if (this.config?.mood === Mood.ENERGIZED) { arpChance = 0.5; chordWait = 6; }
    
    // If engaging with the app, music accelerates slightly
    if (this.interactionIntensity > 0.5) {
        chordWait *= 0.85;
    }
    
    // ADAPTIVE CALM: If stressed, slow down music scheduling slightly
    if (this.systemStress > 0.5) {
        chordWait *= 1.2;
        arpChance *= 0.5; // Fewer chaotic notes
    }

    // Schedule Chords
    if (this.nextChordTime < now + lookahead) {
        // Choose Palette based on Shape
        const palette = (this.currentShape === ShapeType.FIREWORKS || this.currentShape === ShapeType.SUPERNOVA) 
            ? this.chordsUplifting 
            : this.chordsAtmospheric;
            
        // Wrap index if palette switched
        const safeIndex = this.chordIndex % palette.length;
        this.triggerChord(palette[safeIndex]);
        
        this.chordIndex = (this.chordIndex + 1) % palette.length;
        this.nextChordTime += chordWait + Math.random() * 3; // More organic variation
    }

    // Schedule Arpeggios
    if (this.nextArpTime < now + lookahead) {
        if (Math.random() > (1 - arpChance)) {
             const note = this.scale[Math.floor(Math.random() * this.scale.length)];
             this.triggerArpNote(note, this.nextArpTime);
        }
        let arpSpeed = 0.5; 
        if (this.config?.mood === Mood.ENERGIZED) arpSpeed = 0.3;
        
        this.nextArpTime += (arpSpeed/2) + Math.random() * arpSpeed;
    }

    this.schedulerTimer = window.setTimeout(() => this.schedule(), 100);
  }

  private triggerChord(freqs: number[]) {
    if (!this.ctx || !this.padGain) return;
    const now = this.nextChordTime;
    // RESTRAINT: Slower Attack/Release for silky transitions
    const attack = 4.0; 
    const release = 8.0;
    const duration = 7.0;

    freqs.forEach((freq, i) => {
        // --- OSC 1: Foundation (Warmth) ---
        const osc1 = this.ctx!.createOscillator();
        const gain1 = this.ctx!.createGain();
        // Use Triangle/Sine for smoother, flute-like pads (removed Sawtooth)
        osc1.type = i % 2 === 0 ? 'triangle' : 'sine'; 
        osc1.frequency.value = freq;
        osc1.detune.value = (Math.random() - 0.5) * 8; // Subtle detune

        const filter1 = this.ctx!.createBiquadFilter();
        filter1.type = 'lowpass';
        // Lower cutoff for softer tone
        filter1.frequency.value = 150 + Math.random() * 100;

        // Envelope 1
        gain1.gain.setValueAtTime(0, now);
        // S-curve approximation via linear -> exponential
        gain1.gain.linearRampToValueAtTime(0.1 / freqs.length, now + attack);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + attack + duration + release);

        // Filter Env 1
        filter1.frequency.setValueAtTime(150, now);
        filter1.frequency.linearRampToValueAtTime(450, now + attack); // Gentle open
        filter1.frequency.linearRampToValueAtTime(100, now + attack + duration + release);

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.padGain!);

        osc1.start(now);
        osc1.stop(now + attack + duration + release + 1);
        setTimeout(() => osc1.disconnect(), (attack + duration + release + 2) * 1000);

        // --- OSC 2: Harmonic Layer (Shimmer) ---
        // Only audible if interaction > 0, adds "gloss"
        // ADAPTIVE CALM: Reduce shimmer if stressed
        if (this.interactionIntensity > 0.05 && this.systemStress < 0.6) {
            const osc2 = this.ctx!.createOscillator();
            const gain2 = this.ctx!.createGain();
            
            osc2.type = 'sine'; // Pure tone
            osc2.frequency.value = freq * 2; // Octave up
            osc2.detune.value = (Math.random() - 0.5) * 10;

            const targetGain = (0.05 / freqs.length) * this.interactionIntensity;

            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(targetGain, now + attack);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + attack + duration + release);

            osc2.connect(gain2);
            gain2.connect(this.padGain!);

            osc2.start(now);
            osc2.stop(now + attack + duration + release + 1);
            setTimeout(() => osc2.disconnect(), (attack + duration + release + 2) * 1000);
        }
    });
  }
  
  private triggerArpNote(freq: number, time: number) {
      if (!this.ctx || !this.arpGain) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine'; // Pure sine for bell-like quality
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.1); // Slower attack to avoid clicks
      gain.gain.exponentialRampToValueAtTime(0.001, time + 3.0); // Long decay
      
      osc.connect(gain);
      gain.connect(this.arpGain);
      
      osc.start(time);
      osc.stop(time + 3.1);
  }

  // Pink Noise Generator (Warmer than white noise)
  private createPinkNoiseBuffer(bufferSize: number): AudioBuffer {
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11; 
          b6 = white * 0.115926;
      }
      return buffer;
  }

  private playCosmicNoise() {
      if (!this.ctx || !this.noiseGain) return;
      
      // Use Pink Noise for background drone (warmer, less hiss)
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.createPinkNoiseBuffer(bufferSize);

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 100; // Deep rumble only
      filter.Q.value = 0.8;

      noise.connect(filter);
      filter.connect(this.noiseGain);
      noise.start();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 1.0);
    }
  }

  private createImpulseResponse(duration: number, decay: number) {
    if (!this.ctx) return null;
    const length = this.ctx.sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const n = i / length;
        // Smooth exponential decay
        const val = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        left[i] = val;
        right[i] = val;
    }
    return impulse;
  }

  // REPLACED: cinematic, smooth transition sound
  public playWhoosh() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Determine type of transition
    const isBigEvent = this.currentShape === ShapeType.FIREWORKS || this.currentShape === ShapeType.SUPERNOVA;

    // 1. Noise Layer (Pink Noise for Air/Pressure feel)
    const duration = isBigEvent ? 4.0 : 2.0;
    const buffer = this.createPinkNoiseBuffer(this.ctx.sampleRate * duration);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    // Lowpass filter swell - never harsh
    filter.type = 'lowpass';
    filter.Q.value = 0.5; // Smooth resonance
    
    const gain = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Filter Envelope (Swell)
    const startFreq = 80;
    const peakFreq = isBigEvent ? 500 : 350; // Keep peaks low/warm
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.linearRampToValueAtTime(peakFreq, now + (duration * 0.3)); // Slow rise
    filter.frequency.exponentialRampToValueAtTime(startFreq, now + duration); // Slow fall

    // Volume Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(isBigEvent ? 0.3 : 0.15, now + (duration * 0.4));
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + duration + 0.1);

    // 2. Tonal "Bloom" Layer (Only for Fireworks/Supernova)
    if (isBigEvent) {
        this.playBloom(now);
    }
    
    // Changing shape adds significant stress to the system
    // This allows the adaptive calm to kick in if user spams shape changes
    this.systemStress = Math.min(1.0, this.systemStress + 0.3);
    this.updateFilterAndGain();
  }

  private playBloom(startTime: number) {
      if (!this.ctx || !this.masterGain) return;
      
      // A gentle major chord swell
      const bloomFreqs = [196.00, 246.94, 293.66]; // G Major / Em7 fragment
      const duration = 5.0;

      bloomFreqs.forEach((freq, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.05, startTime + 1.5); // Slow bloom
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.masterGain!);
          
          osc.start(startTime);
          osc.stop(startTime + duration + 0.1);
      });
  }
}

export const audioService = new AudioService();
