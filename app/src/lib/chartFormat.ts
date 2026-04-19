import type { TimeRangePreset } from '../types'

export function trendPointCount(preset: TimeRangePreset): number {
  switch (preset) {
    case '24h':
      return 48
    case '7d':
      return 56
    case '30d':
      return 60
    default:
      return 48
  }
}

export function formatTrendAxisTime(
  ms: number,
  preset: TimeRangePreset,
): string {
  const d = new Date(ms)
  if (preset === '24h') {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  if (preset === '7d') {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatTrendTooltipTime(
  ms: number,
  preset: TimeRangePreset,
): string {
  const d = new Date(ms)
  if (preset === '24h') {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  if (preset === '7d') {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
