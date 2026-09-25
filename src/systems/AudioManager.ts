import { engineFrequency, effectiveVolume } from "./AudioMath.ts";
import { getMusicTheme } from "../config/audio.ts";
import type { SaveManager } from "./SaveManager.ts";

const ENGINE_IDLE_HZ = 55;
const ENGINE_MAX_HZ = 240;

/**
 * All game audio is synthesized at runtime via the Web Audio API rather than played from
 * asset files — this keeps every sound in the game as original, license-free "art" (matching
 * the project's procedural-graphics approach) and avoids adding any binary asset pipeline.
 *
 * A single `AudioManager` instance (see `getAudioManager()`) is shared for the lifetime of
 * the page, since its `AudioContext` and master gain nodes should persist across Phaser scene
 * transitions (e.g. background music keeps playing while the results screen is shown).
 */
export class AudioManager {
  private ctx: AudioContext | undefined;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;

  private musicVolume = 0.7;
  private musicMuted = false;
  private sfxVolume = 0.8;
  private sfxMuted = false;

  private engineOsc?: OscillatorNode;
  private engineGain?: GainNode;
  private engineFilter?: BiquadFilterNode;

  private musicNodes: AudioNode[] = [];
  private currentMusicStageId?: string;

  private unlocked = false;

  /** Lazily creates the `AudioContext` (browsers disallow creating one before a user
   * gesture in some cases, and Vitest/SSR environments don't have `AudioContext` at all). */
  private getContext(): AudioContext | undefined {
    if (this.ctx) return this.ctx;
    const Ctor = globalThis.AudioContext ?? (globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!Ctor) return undefined;
    this.ctx = new Ctor();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = effectiveVolume(this.musicVolume, this.musicMuted);
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = effectiveVolume(this.sfxVolume, this.sfxMuted);
    this.sfxGain.connect(this.ctx.destination);
    return this.ctx;
  }

  /** Loads the persisted volume/mute settings; call once at startup before playing anything. */
  loadSettings(saveManager: SaveManager): void {
    const settings = saveManager.getSettings();
    this.musicVolume = settings.musicVolume;
    this.musicMuted = settings.musicMuted;
    this.sfxVolume = settings.sfxVolume;
    this.sfxMuted = settings.sfxMuted;
    this.applyGains();
  }

  /** Resumes the (possibly browser-suspended) audio context; call this from the first
   * pointerdown/keydown handler in the app, since autoplay policies block sound otherwise. */
  unlock(): void {
    if (this.unlocked) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlocked = true;
    if (ctx.state === "suspended") void ctx.resume();
  }

  setMusicVolume(volume: number, saveManager: SaveManager): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    saveManager.updateSettings({ musicVolume: this.musicVolume });
    this.applyGains();
  }

  setSfxVolume(volume: number, saveManager: SaveManager): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    saveManager.updateSettings({ sfxVolume: this.sfxVolume });
    this.applyGains();
  }

  setMusicMuted(muted: boolean, saveManager: SaveManager): void {
    this.musicMuted = muted;
    saveManager.updateSettings({ musicMuted: muted });
    this.applyGains();
  }

  setSfxMuted(muted: boolean, saveManager: SaveManager): void {
    this.sfxMuted = muted;
    saveManager.updateSettings({ sfxMuted: muted });
    this.applyGains();
  }

  get isMusicMuted(): boolean {
    return this.musicMuted;
  }

  get isSfxMuted(): boolean {
    return this.sfxMuted;
  }

  get currentMusicVolume(): number {
    return this.musicVolume;
  }

  get currentSfxVolume(): number {
    return this.sfxVolume;
  }

  private applyGains(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !this.sfxGain) return;
    const now = ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(effectiveVolume(this.musicVolume, this.musicMuted), now, 0.05);
    this.sfxGain.gain.setTargetAtTime(effectiveVolume(this.sfxVolume, this.sfxMuted), now, 0.05);
  }

  // --- Engine (continuous, pitch follows wheel RPM) -------------------------------------

  startEngine(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain || this.engineOsc) return;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = ENGINE_IDLE_HZ;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;

    const gain = ctx.createGain();
    gain.gain.value = 0.18;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();

    this.engineOsc = osc;
    this.engineFilter = filter;
    this.engineGain = gain;
  }

  /** Call every frame with a 0..1 "how hard is the engine working" ratio (e.g. current wheel
   * angular speed divided by the vehicle's max wheel speed). */
  updateEngine(rpmRatio: number): void {
    if (!this.ctx || !this.engineOsc || !this.engineFilter) return;
    const now = this.ctx.currentTime;
    const freq = engineFrequency(rpmRatio, ENGINE_IDLE_HZ, ENGINE_MAX_HZ);
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(400 + rpmRatio * 1800, now, 0.08);
  }

  stopEngine(): void {
    if (!this.engineOsc) return;
    const osc = this.engineOsc;
    const gain = this.engineGain;
    this.engineOsc = undefined;
    this.engineFilter = undefined;
    this.engineGain = undefined;
    if (gain && this.ctx) {
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    // Give the fade-out a moment before actually stopping the oscillator, to avoid a click.
    setTimeout(() => {
      try {
        osc.stop();
      } catch {
        // Already stopped (e.g. scene torn down quickly); nothing to do.
      }
    }, 120);
  }

  // --- One-shot SFX -----------------------------------------------------------------------

  playCoin(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    this.playTone(ctx, this.sfxGain, 880, 0.08, "sine", ctx.currentTime);
    this.playTone(ctx, this.sfxGain, 1320, 0.1, "sine", ctx.currentTime + 0.06);
  }

  playFuel(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.18);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playCrash(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    // Low thud.
    const thud = ctx.createOscillator();
    thud.type = "triangle";
    const thudGain = ctx.createGain();
    thud.frequency.setValueAtTime(140, now);
    thud.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    thudGain.gain.setValueAtTime(0.35, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.35);

    // Noise burst on top for an impact "crunch".
    const noise = this.createNoiseBuffer(ctx, 0.25);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noise;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(now);
  }

  playUiClick(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    this.playTone(ctx, this.sfxGain, 520, 0.04, "square", ctx.currentTime, 0.12);
  }

  private playTone(
    ctx: AudioContext,
    destination: AudioNode,
    frequencyHz: number,
    durationSeconds: number,
    waveform: OscillatorType,
    startTime: number,
    peakGain = 0.2,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = frequencyHz;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSeconds);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + durationSeconds + 0.02);
  }

  private createNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * durationSeconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- Background music (looping, per-stage) ----------------------------------------------

  playMusicForStage(stageId: string): void {
    const ctx = this.getContext();
    if (!ctx || !this.musicGain) return;
    if (this.currentMusicStageId === stageId && this.musicNodes.length > 0) return;
    this.stopMusic();
    this.currentMusicStageId = stageId;

    const theme = getMusicTheme(stageId);
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = theme.filterHz;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 1.2);
    masterGain.connect(this.musicGain);
    filter.connect(masterGain);

    const root = ctx.createOscillator();
    root.type = theme.waveform;
    root.frequency.value = theme.baseFrequencyHz;
    root.connect(filter);
    root.start(now);

    // A detuned "fifth" above the root for a fuller pad sound.
    const fifth = ctx.createOscillator();
    fifth.type = theme.waveform;
    fifth.frequency.value = theme.baseFrequencyHz * 1.5;
    fifth.detune.value = -6;
    fifth.connect(filter);
    fifth.start(now);

    // Slow LFO sweeping the filter cutoff so the drone isn't perfectly static.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = theme.filterLfoHz;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = theme.filterLfoDepthHz;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    this.musicNodes = [root, fifth, lfo, filter, masterGain, lfoGain];
  }

  stopMusic(): void {
    const ctx = this.ctx;
    for (const node of this.musicNodes) {
      if (node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch {
          // Already stopped.
        }
      }
      node.disconnect();
    }
    this.musicNodes = [];
    this.currentMusicStageId = undefined;
    void ctx;
  }
}

let sharedInstance: AudioManager | undefined;

/** Returns the single shared `AudioManager` for the whole page/game instance. */
export function getAudioManager(): AudioManager {
  sharedInstance ??= new AudioManager();
  return sharedInstance;
}
