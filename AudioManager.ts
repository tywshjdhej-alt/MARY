export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private chaseGain: GainNode | null = null;
  private chaseOsc: OscillatorNode | null = null;
  private volume = 0.75;
  private muted = false;
  private initialized = false;
  private lastFootstepTime = 0;
  private lastHeartbeatTime = 0;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Ambient dark drone
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.14;

      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.value = 260;

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 46; // Deep F#1 sub drone

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 69.3; // Detuned fifth

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 110;
      lfo.connect(lfoGain);
      lfoGain.connect(this.droneFilter.frequency);

      osc1.connect(this.droneFilter);
      osc2.connect(this.droneFilter);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      osc1.start();
      osc2.start();
      lfo.start();

      // Dynamic chase layer
      this.chaseGain = this.ctx.createGain();
      this.chaseGain.gain.value = 0;
      this.chaseOsc = this.ctx.createOscillator();
      this.chaseOsc.type = 'sawtooth';
      this.chaseOsc.frequency.value = 92;

      const chaseFilter = this.ctx.createBiquadFilter();
      chaseFilter.type = 'bandpass';
      chaseFilter.frequency.value = 340;
      chaseFilter.Q.value = 4;

      this.chaseOsc.connect(chaseFilter);
      chaseFilter.connect(this.chaseGain);
      this.chaseGain.connect(this.masterGain);
      this.chaseOsc.start();

      this.initialized = true;
    } catch {
      // Audio blocked until gesture
    }
  }

  public setVolume(vol: number, muted: boolean): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setRoomTone(roomKey: string): void {
    if (!this.droneFilter || !this.ctx) return;
    const freqMap: Record<string, number> = {
      room_bedroom: 220,
      room_hallway: 310,
      room_parlor: 260,
      room_study: 175,
    };
    const target = freqMap[roomKey] ?? 240;
    this.droneFilter.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  public updateHorrorIntensity(maryDistance: number, isHunting: boolean, nowSec: number): void {
    if (!this.ctx || !this.chaseGain || !this.chaseOsc) return;
    const proximity = Math.max(0, Math.min(1, 1 - (maryDistance - 1.5) / 11));
    const targetChase = isHunting ? 0.22 : proximity * 0.12;
    this.chaseGain.gain.setTargetAtTime(targetChase, this.ctx.currentTime, 0.15);
    this.chaseOsc.frequency.setTargetAtTime(isHunting ? 110 + Math.sin(nowSec * 9) * 12 : 82, this.ctx.currentTime, 0.1);

    // Heartbeat thump when Mary is within 8m
    if (maryDistance < 8.5) {
      const interval = Math.max(0.32, 0.9 - proximity * 0.55);
      if (nowSec - this.lastHeartbeatTime >= interval) {
        this.lastHeartbeatTime = nowSec;
        this.playHeartbeat(0.15 + proximity * 0.35);
      }
    }
  }

  public playFootstep(sprinting: boolean, crouching: boolean, nowSec: number): void {
    if (!this.ctx || !this.masterGain) return;
    const interval = crouching ? 0.56 : sprinting ? 0.28 : 0.44;
    if (nowSec - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = nowSec;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(crouching ? 78 : sprinting ? 125 : 98, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.09);

    const vol = crouching ? 0.05 : sprinting ? 0.18 : 0.11;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playFlashlightClick(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.035);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  public playDoorCreak(locked = false): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (locked) {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.setValueAtTime(140, t + 0.06);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, t);
      osc.frequency.linearRampToValueAtTime(240, t + 0.25);
      osc.frequency.linearRampToValueAtTime(135, t + 0.55);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.6);
    }
  }

  public playPhoneRing(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [0, 0.14, 0.28].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = idx % 2 === 0 ? 1180 : 1480;
      gain.gain.setValueAtTime(0.14, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.12);
    });
  }

  public playPickup(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  public playMaryWhisper(aggressive = false): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // Filtered noise whisper + dissonant high chime
    const bufferSize = this.ctx.sampleRate * 0.9;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(aggressive ? 1850 : 1250, t);
    filter.frequency.linearRampToValueAtTime(750, t + 0.85);
    filter.Q.value = 6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(aggressive ? 0.34 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);

    if (aggressive) {
      const sting = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      sting.type = 'sawtooth';
      sting.frequency.setValueAtTime(615, t);
      sting.frequency.exponentialRampToValueAtTime(190, t + 0.55);
      sGain.gain.setValueAtTime(0.18, t);
      sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      sting.connect(sGain);
      sGain.connect(this.masterGain);
      sting.start(t);
      sting.stop(t + 0.62);
    }
  }

  public playPowerRestore(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.45);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  private playHeartbeat(strength: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [0, 0.16].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 64 : 52, t + offset);
      osc.frequency.exponentialRampToValueAtTime(28, t + offset + 0.12);
      gain.gain.setValueAtTime(strength * (idx === 0 ? 1 : 0.7), t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.13);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.14);
    });
  }
}
