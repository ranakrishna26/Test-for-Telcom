/**
 * Mock Jira linkage for incidents — replace with API integration later.
 */
export type JiraTicketStatus = 'open' | 'in_progress' | 'resolved'

export type MockJiraLinked = {
  kind: 'linked'
  /** e.g. NET-4821 */
  key: string
  status: JiraTicketStatus
  assignee: string
  url: string
}

export type MockJiraUnlinked = {
  kind: 'none'
}

export type MockJiraInfo = MockJiraLinked | MockJiraUnlinked

const MOCK_BY_INCIDENT: Record<string, MockJiraInfo> = {
  'inc-core-dns': {
    kind: 'linked',
    key: 'NET-4412',
    status: 'in_progress',
    assignee: 'A. Okonkwo',
    url: 'https://telcom-ops.atlassian.net/browse/NET-4412',
  },
  'inc-ran-metro': {
    kind: 'linked',
    key: 'RAN-8891',
    status: 'open',
    assignee: 'Unassigned',
    url: 'https://telcom-ops.atlassian.net/browse/RAN-8891',
  },
  'inc-trans-fiber': {
    kind: 'linked',
    key: 'TRN-2104',
    status: 'open',
    assignee: 'M. Chen',
    url: 'https://telcom-ops.atlassian.net/browse/TRN-2104',
  },
  'inc-core-upgrade': {
    kind: 'linked',
    key: 'NET-3988',
    status: 'resolved',
    assignee: 'S. Patel',
    url: 'https://telcom-ops.atlassian.net/browse/NET-3988',
  },
  'inc-trans-backhaul': {
    kind: 'linked',
    key: 'TRN-2097',
    status: 'in_progress',
    assignee: 'K. Naidoo',
    url: 'https://telcom-ops.atlassian.net/browse/TRN-2097',
  },
}

/** Default: no Jira ticket yet (Create flow). */
export function getMockJiraInfo(incidentId: string): MockJiraInfo {
  return MOCK_BY_INCIDENT[incidentId] ?? { kind: 'none' }
}

export function jiraStatusLabel(status: JiraTicketStatus): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'in_progress':
      return 'In progress'
    case 'resolved':
      return 'Resolved'
    default:
      return status
  }
}
