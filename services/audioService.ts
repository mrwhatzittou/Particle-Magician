
import { AppConfig, Mood, ShapeType } from "../types";

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null; 
  private reverbNode: ConvolverNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private frequencyData: Uint8Array | null = null;
  
  private padGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;

  private isInitialized = false;
  private isMuted = false;
  private isPlaying = false;
  
  private config: AppConfig | null = null;
  private currentShape: ShapeType = ShapeType.SPHERE;
  private interactionIntensity: number = 0; 
  private systemStress: number = 0; 
  
  private nextChordTime = 0;
  private nextArpTime = 0;
  private schedulerTimer: number | null = null;
  private chordIndex = 0;

  private chordsAtmospheric = [
    [130.81, 196.00, 246.94, 329.63], 
    [164.81, 220.00, 293.66, 392.00], 
    [110.00, 164.81, 196.00, 261.63], 
    [146.83, 220.00, 246.94, 369.99]  
  ];

  private chordsUplifting = [
    [174.61, 220.00, 261.63, 329.63], 
    [196.00, 246.94, 293.66, 329.63], 
    [130.81, 164.81, 196.00, 246.94], 
    [220.00, 261.63, 293.66, 329.63]  
  ];
  
  private scale = [523.25, 659.25, 739.99, 783.99, 987.77, 1046.50];

  public init() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    // Significantly increased master gain for laptop speaker visibility
    this.masterGain.gain.value = this.isMuted ? 0 : 2.0;

    this.pannerNode = this.ctx.createStereoPanner();

    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 400; 
    this.masterFilter.Q.value = 1.2;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256; 
    this.analyser.smoothingTimeConstant = 0.8; 
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.compressor = this.ctx.createDynamicsCompressor();
    // Adjusted threshold and ratio for "safer" loudness
    this.compressor.threshold.setValueAtTime(-15, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(25, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterFilter.connect(this.masterGain);
    this.masterGain.connect(this.pannerNode);
    this.pannerNode.connect(this.analyser);
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(3.5, 2.5); 
    this.reverbNode.connect(this.masterFilter);

    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 1.0; // Boosted pads
    this.padGain.connect(this.reverbNode); 
    this.padGain.connect(this.masterFilter); 

    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = 0.35; // Boosted arps
    this.arpGain.connect(this.reverbNode);
    this.arpGain.connect(this.masterFilter);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.12; 
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
    const now = this.ctx.currentTime;
    let masterVol = 2.0; 
    if (config.soundPresence === 'MINIMAL') masterVol = 1.2;
    if (!this.isMuted) this.masterGain.gain.setTargetAtTime(masterVol, now, 1.0); 
  }

  public getAudioData() {
    if (!this.analyser || !this.frequencyData) return { low: 0, high: 0, avg: 0 };
    this.analyser.getByteFrequencyData(this.frequencyData);
    const length = this.frequencyData.length;
    const lowBound = Math.floor(length * 0.15); 
    const midBound = Math.floor(length * 0.5);
    
    let lowSum = 0;
    let highSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < length; i++) {
        const val = this.frequencyData[i] / 255.0;
        totalSum += val;
        if (i < lowBound) lowSum += val;
        else if (i > midBound) highSum += val;
    }
    
    return { 
      low: lowSum / lowBound || 0, 
      high: highSum / (length - midBound) || 0,
      avg: totalSum / length || 0
    };
  }

  public setShape(shape: ShapeType) {
      this.currentShape = shape;
  }

  public triggerInteractionPing(start: boolean, pan: number = 0) {
      if (!this.ctx || this.isMuted || !this.arpGain) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      
      osc.type = 'sine';
      osc.frequency.value = start ? 880 + Math.random() * 20 : 220;
      panner.pan.value = pan;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(start ? 0.25 : 0.1, now + 0.05); // Louder interaction
      gain.gain.exponentialRampToValueAtTime(0.001, now + (start ? 1.5 : 0.8));

      osc.connect(panner);
      panner.connect(gain);
      gain.connect(this.reverbNode!);

      osc.start(now);
      osc.stop(now + 1.6);
  }

  public setSystemStress(stress: number) {
      this.systemStress = stress;
      this.updateFilterAndGain();
  }

  public updateSpatial(panX: number, presenceIntensity: number) {
      this.interactionIntensity = presenceIntensity;
      if (!this.ctx || !this.pannerNode || !this.arpGain) return;
      const now = this.ctx.currentTime;
      this.pannerNode.pan.setTargetAtTime(panX * 0.5, now, 0.5); 
      this.updateFilterAndGain();
      const targetArpVol = 0.35 + (presenceIntensity * 0.2);
      this.arpGain.gain.setTargetAtTime(targetArpVol, now, 0.5);
  }

  private updateFilterAndGain() {
      if (!this.ctx || !this.masterFilter || !this.masterGain) return;
      const now = this.ctx.currentTime;
      let idleFreq = 300;
      let maxFreq = 1200; 
      if (this.config?.mood === Mood.CALM) { idleFreq = 200; maxFreq = 800; } 
      if (this.config?.mood === Mood.ENERGIZED) { idleFreq = 400; maxFreq = 1600; }
      let targetFreq = idleFreq + (this.interactionIntensity * (maxFreq - idleFreq));
      const stressFactor = 1.0 - (this.systemStress * 0.6); 
      targetFreq *= stressFactor;
      targetFreq = Math.max(targetFreq, 150);
      this.masterFilter.frequency.setTargetAtTime(targetFreq, now, 0.6);
      if (!this.isMuted) {
          let targetVol = 2.0; 
          if (this.config?.soundPresence === 'MINIMAL') targetVol = 1.2;
          targetVol *= (1.0 - (this.systemStress * 0.2));
          this.masterGain.gain.setTargetAtTime(targetVol, now, 0.6);
      }
  }

  private schedule() {
    if (!this.ctx || !this.isPlaying) return;
    const lookahead = 0.2; 
    const now = this.ctx.currentTime;
    let arpChance = 0.3;
    let chordWait = 8;
    if (this.config?.mood === Mood.CALM) { arpChance = 0.15; chordWait = 12; }
    if (this.config?.mood === Mood.ENERGIZED) { arpChance = 0.5; chordWait = 6; }
    if (this.interactionIntensity > 0.5) chordWait *= 0.85;
    if (this.systemStress > 0.5) { chordWait *= 1.2; arpChance *= 0.5; }
    if (this.nextChordTime < now + lookahead) {
        const palette = (this.currentShape === ShapeType.FIREWORKS) 
            ? this.chordsUplifting 
            : this.chordsAtmospheric;
        const safeIndex = this.chordIndex % palette.length;
        this.triggerChord(palette[safeIndex]);
        this.chordIndex = (this.chordIndex + 1) % palette.length;
        this.nextChordTime += chordWait + Math.random() * 3; 
    }
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
    const attack = 4.0; 
    const release = 8.0;
    const duration = 7.0;
    freqs.forEach((freq, i) => {
        const osc1 = this.ctx!.createOscillator();
        const gain1 = this.ctx!.createGain();
        osc1.type = i % 2 === 0 ? 'triangle' : 'sine'; 
        osc1.frequency.value = freq;
        osc1.detune.value = (Math.random() - 0.5) * 8; 
        const filter1 = this.ctx!.createBiquadFilter();
        filter1.type = 'lowpass';
        filter1.frequency.value = 150 + Math.random() * 100;
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3 / freqs.length, now + attack); // Louder chords
        gain1.gain.exponentialRampToValueAtTime(0.001, now + attack + duration + release);
        filter1.frequency.setValueAtTime(150, now);
        filter1.frequency.linearRampToValueAtTime(450, now + attack); 
        filter1.frequency.linearRampToValueAtTime(100, now + attack + duration + release);
        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.padGain!);
        osc1.start(now);
        osc1.stop(now + attack + duration + release + 1);
        if (this.interactionIntensity > 0.05 && this.systemStress < 0.6) {
            const osc2 = this.ctx!.createOscillator();
            const gain2 = this.ctx!.createGain();
            osc2.type = 'sine'; 
            osc2.frequency.value = freq * 2; 
            osc2.detune.value = (Math.random() - 0.5) * 10;
            const targetGain = (0.2 / freqs.length) * this.interactionIntensity;
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(targetGain, now + attack);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + attack + duration + release);
            osc2.connect(gain2);
            gain2.connect(this.padGain!);
            osc2.start(now);
            osc2.stop(now + attack + duration + release + 1);
        }
    });
  }
  
  private triggerArpNote(freq: number, time: number) {
      if (!this.ctx || !this.arpGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine'; 
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.25, time + 0.1); 
      gain.gain.exponentialRampToValueAtTime(0.001, time + 3.0); 
      osc.connect(gain);
      gain.connect(this.arpGain);
      osc.start(time);
      osc.stop(time + 3.1);
  }

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
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.createPinkNoiseBuffer(bufferSize);
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 100; 
      filter.Q.value = 0.8;
      noise.connect(filter);
      filter.connect(this.noiseGain);
      noise.start();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 2.0, this.ctx.currentTime, 1.0);
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
        const val = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        left[i] = val;
        right[i] = val;
    }
    return impulse;
  }

  public playWhoosh() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const isBigEvent = this.currentShape === ShapeType.FIREWORKS;
    const duration = isBigEvent ? 4.0 : 2.0;
    const buffer = this.createPinkNoiseBuffer(this.ctx.sampleRate * duration);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5; 
    const gain = this.ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    const startFreq = 80;
    const peakFreq = isBigEvent ? 500 : 350; 
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.linearRampToValueAtTime(peakFreq, now + (duration * 0.3)); 
    filter.frequency.exponentialRampToValueAtTime(startFreq, now + duration); 
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(isBigEvent ? 0.8 : 0.4, now + (duration * 0.4));
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.start(now);
    noise.stop(now + duration + 0.1);
    if (isBigEvent) this.playBloom(now);
    this.systemStress = Math.min(1.0, this.systemStress + 0.3);
    this.updateFilterAndGain();
  }

  private playBloom(startTime: number) {
      if (!this.ctx || !this.masterGain) return;
      const bloomFreqs = [196.00, 246.94, 293.66]; 
      const duration = 5.0;
      bloomFreqs.forEach((freq, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.2, startTime + 1.5); 
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(startTime);
          osc.stop(startTime + duration + 0.1);
      });
  }
}

export const audioService = new AudioService();
