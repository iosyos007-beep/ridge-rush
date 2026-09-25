/**
 * Per-stage background music "theme": everything is synthesized at runtime via the Web
 * Audio API (no audio asset files), so each theme is just a small set of oscillator/filter
 * parameters rather than a track reference. Keeping it here (rather than inline in
 * `AudioManager`) matches the project's data-driven config convention and makes each
 * stage's musical mood a one-line diff to retune.
 */
export interface MusicTheme {
  /** Base drone frequency (Hz); a second oscillator plays a detuned fifth above it. */
  baseFrequencyHz: number;
  waveform: OscillatorType;
  /** Lowpass filter center frequency (Hz); higher = brighter/thinner, lower = darker/warmer. */
  filterHz: number;
  /** Slow LFO rate (Hz) that gently sweeps the filter cutoff, giving the drone some motion. */
  filterLfoHz: number;
  /** How far the LFO sweeps the filter cutoff, in Hz either side of `filterHz`. */
  filterLfoDepthHz: number;
}

export const MUSIC_THEMES: Record<string, MusicTheme> = {
  "green-hills": {
    baseFrequencyHz: 130.81, // C3 — warm, open, default mood
    waveform: "triangle",
    filterHz: 900,
    filterLfoHz: 0.08,
    filterLfoDepthHz: 250,
  },
  "desert-dunes": {
    baseFrequencyHz: 146.83, // D3 — a touch brighter, sun-baked
    waveform: "triangle",
    filterHz: 1100,
    filterLfoHz: 0.05,
    filterLfoDepthHz: 300,
  },
  "frozen-peaks": {
    baseFrequencyHz: 174.61, // F3 — thin and bright, icy
    waveform: "sine",
    filterHz: 1800,
    filterLfoHz: 0.12,
    filterLfoDepthHz: 400,
  },
  "night-forest": {
    baseFrequencyHz: 98.0, // G2 — low and dark
    waveform: "sine",
    filterHz: 500,
    filterLfoHz: 0.06,
    filterLfoDepthHz: 150,
  },
  scrapyard: {
    baseFrequencyHz: 116.54, // A#2 — slightly dissonant/metallic
    waveform: "sawtooth",
    filterHz: 700,
    filterLfoHz: 0.15,
    filterLfoDepthHz: 350,
  },
  "lunar-base": {
    baseFrequencyHz: 110.0, // A2 — spacious, slow-moving
    waveform: "sine",
    filterHz: 1200,
    filterLfoHz: 0.03,
    filterLfoDepthHz: 500,
  },
};

export function getMusicTheme(stageId: string): MusicTheme {
  return MUSIC_THEMES[stageId] ?? MUSIC_THEMES["green-hills"]!;
}
