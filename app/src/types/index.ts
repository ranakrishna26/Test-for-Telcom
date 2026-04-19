export type DomainId = 'ran' | 'core' | 'security' | 'transport'

export type Severity = 'critical' | 'major' | 'minor'

export type ImpactScope = 'localized' | 'widespread'

export type Trend = 'worsening' | 'improving' | 'stable'

export type TimeRangePreset = '24h' | '7d' | '30d'

export interface TimeWindow {
  start: number
  end: number
}

export interface Incident {
  id: string
  name: string
  severity: Severity
  impactScope: ImpactScope
  trend: Trend
  /** Unix ms — active when window overlaps [activeFrom, activeTo] */
  activeFrom: number
  activeTo: number
  /** Relative impact weight per domain (0–1). Used for penalties and Sankey. */
  domainImpact: Partial<Record<DomainId, number>>
  /** Optional detail for tooltips / drilldown */
  impactSummary?: string
  affectedRegions?: string[]
}

export interface DomainInfo {
  id: DomainId
  label: string
  shortLabel: string
}
