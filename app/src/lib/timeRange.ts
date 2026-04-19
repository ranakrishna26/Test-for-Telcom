import type { TimeRangePreset, TimeWindow } from '../types'

const PRESET_MS: Record<TimeRangePreset, number> = {
  '24h': 24 * 3600000,
  '7d': 7 * 24 * 3600000,
  '30d': 30 * 24 * 3600000,
}

export function getPresetDurationMs(preset: TimeRangePreset): number {
  return PRESET_MS[preset]
}

/** Primary window ending at `end` (typically now). */
export function getWindowForPreset(
  preset: TimeRangePreset,
  end: number = Date.now(),
): TimeWindow {
  const duration = getPresetDurationMs(preset)
  return { start: end - duration, end }
}

/** Immediately preceding window of equal length (for trend comparison). */
export function getPreviousWindow(window: TimeWindow): TimeWindow {
  const duration = window.end - window.start
  return { start: window.start - duration, end: window.start }
}

/** Closed-interval overlap (supports zero-length windows for “instant” samples). */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start <= b.end && b.start <= a.end
}
