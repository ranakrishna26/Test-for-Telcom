import type { HeatGradient } from './HeatLayer'

/**
 * Single impact heatmap: cool (low) → warm (high). Matches smooth “density” style
 * rather than flat solid blobs.
 */
export const HEAT_GRADIENT_IMPACT: HeatGradient = {
  0.2: '#3f6212',
  0.35: '#65a30d',
  0.48: '#84cc16',
  0.58: '#eab308',
  0.72: '#f59e0b',
  0.84: '#f97316',
  0.94: '#ea580c',
  1: '#dc2626',
}

/** leaflet.heat: minor → green (normal) */
export const HEAT_GRADIENT_MINOR: HeatGradient = {
  0.35: '#14532d',
  0.55: '#22c55e',
  0.8: '#86efac',
  1: '#bbf7d0',
}

/** leaflet.heat: major → yellow (warning) */
export const HEAT_GRADIENT_MAJOR: HeatGradient = {
  0.35: '#713f12',
  0.55: '#ca8a04',
  0.8: '#eab308',
  1: '#fef08a',
}

/** leaflet.heat: critical → red */
export const HEAT_GRADIENT_CRITICAL: HeatGradient = {
  0.35: '#450a0a',
  0.55: '#b91c1c',
  0.8: '#ef4444',
  1: '#fecaca',
}
