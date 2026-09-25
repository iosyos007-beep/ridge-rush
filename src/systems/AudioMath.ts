/**
 * Pure numeric helpers for `AudioManager`, split out so the "feel" of the engine pitch curve
 * and volume clamping can be unit tested without a real `AudioContext`.
 */

/** Maps a 0..1 "how hard is the engine working" ratio to an oscillator frequency (Hz),
 * linearly interpolating between an idle hum and a redline pitch. Ratio is clamped so
 * out-of-range callers (e.g. a wheel spin briefly exceeding max speed) can't produce an
 * inaudible or ear-piercing frequency. */
export function engineFrequency(rpmRatio: number, idleHz: number, maxHz: number): number {
  const clamped = Math.max(0, Math.min(1, rpmRatio));
  return idleHz + (maxHz - idleHz) * clamped;
}

/** Clamps a volume slider value (or a `volume * muted` product) into the valid gain range. */
export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

/** Effective gain for a channel given its slider volume and mute toggle: muting always wins,
 * regardless of the slider position (so un-muting later restores the previous slider value). */
export function effectiveVolume(volume: number, muted: boolean): number {
  return muted ? 0 : clampVolume(volume);
}
