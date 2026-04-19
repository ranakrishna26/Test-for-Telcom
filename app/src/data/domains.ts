import type { DomainId, DomainInfo } from '../types'

export const DOMAINS: DomainInfo[] = [
  { id: 'ran', label: 'RAN', shortLabel: 'RAN' },
  { id: 'core', label: 'Core', shortLabel: 'Core' },
  { id: 'security', label: 'Security', shortLabel: 'Sec' },
  { id: 'transport', label: 'Transport', shortLabel: 'Trans' },
]

export const DOMAIN_IDS = DOMAINS.map((d) => d.id) as DomainId[]
