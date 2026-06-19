import type { Incident } from '../types'

const H = 3600000
const D = 24 * H

/**
 * Mock incidents relative to `referenceNow` so the dashboard always has
 * realistic overlap with 24h / 7d / 30d windows.
 * Affected regions are spread nationally for map demo coverage.
 */
export function getMockIncidents(referenceNow: number = Date.now()): Incident[] {
  return [
    {
      id: 'inc-ran-metro',
      name: 'RAN cell degradation — Metro North',
      severity: 'major',
      impactScope: 'widespread',
      trend: 'worsening',
      activeFrom: referenceNow - 20 * H,
      activeTo: referenceNow + 4 * H,
      domainImpact: { ran: 0.92, transport: 0.28 },
      impactSummary: 'Handover failures elevated; backhaul saturation suspected.',
      affectedRegions: ['Metro North', 'Perth metro'],
    },
    {
      id: 'inc-core-dns',
      name: 'Core DNS latency spike',
      severity: 'critical',
      impactScope: 'widespread',
      trend: 'stable',
      activeFrom: referenceNow - 26 * H,
      activeTo: referenceNow + 2 * H,
      domainImpact: { core: 0.95, security: 0.35, ran: 0.15 },
      impactSummary: 'Recursive resolver pool at capacity.',
      affectedRegions: ['National', 'Brisbane core', 'Adelaide ring'],
    },
    {
      id: 'inc-sec-ddos',
      name: 'DDoS scrubbing — finance VLAN',
      severity: 'major',
      impactScope: 'localized',
      trend: 'improving',
      activeFrom: referenceNow - 3 * D,
      activeTo: referenceNow + 8 * H,
      domainImpact: { security: 0.88, core: 0.22 },
      impactSummary: 'Mitigation active; attack volume declining.',
      affectedRegions: ['Finance edge', 'Melbourne metro'],
    },
    {
      id: 'inc-trans-fiber',
      name: 'Transport fiber cut — East ring',
      severity: 'critical',
      impactScope: 'localized',
      trend: 'worsening',
      activeFrom: referenceNow - 5 * D,
      activeTo: referenceNow + 12 * H,
      domainImpact: { transport: 0.9, ran: 0.45, core: 0.2 },
      impactSummary: 'Protected path failed; traffic rerouted.',
      affectedRegions: ['East ring', 'Gold Coast', 'Cairns north'],
    },
    {
      id: 'inc-ran-minor',
      name: 'Minor RF interference — stadium',
      severity: 'minor',
      impactScope: 'localized',
      trend: 'improving',
      activeFrom: referenceNow - 8 * H,
      activeTo: referenceNow - 1 * H,
      domainImpact: { ran: 0.55 },
      impactSummary: 'Event ended; interference cleared.',
      affectedRegions: ['Stadium cluster', 'Hobart PoP'],
    },
    {
      id: 'inc-core-upgrade',
      name: 'Core IMS patch rollback',
      severity: 'major',
      impactScope: 'localized',
      trend: 'improving',
      activeFrom: referenceNow - 12 * D,
      activeTo: referenceNow - 2 * D,
      domainImpact: { core: 0.75 },
      impactSummary: 'Rollback completed outside peak window.',
      affectedRegions: ['Core site B', 'Canberra hub'],
    },
    {
      id: 'inc-sec-cert',
      name: 'Certificate expiry risk — API gateway',
      severity: 'minor',
      impactScope: 'localized',
      trend: 'worsening',
      activeFrom: referenceNow - 2 * H,
      activeTo: referenceNow + 3 * D,
      domainImpact: { security: 0.62, core: 0.18 },
      impactSummary: 'Renewal in progress; monitoring auth errors.',
      affectedRegions: ['API edge', 'Darwin edge'],
    },
    {
      id: 'inc-trans-backhaul',
      name: 'Backhaul congestion — suburban',
      severity: 'minor',
      impactScope: 'widespread',
      trend: 'stable',
      activeFrom: referenceNow - 30 * H,
      activeTo: referenceNow + 6 * H,
      domainImpact: { transport: 0.55, ran: 0.4 },
      impactSummary: 'Evening peak traffic; QoS adjustments applied.',
      affectedRegions: ['Suburban west', 'Adelaide ring', 'Ring corridor'],
    },
  ]
}
