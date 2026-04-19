import type { Incident, TimeRangePreset } from '../types'
import { getMockJiraInfo, jiraStatusLabel } from '../data/jiraMocks'
import { DOMAINS } from '../data/domains'
import { formatTrendTooltipTime } from '../lib/chartFormat'

function affectedDomainLabels(incident: Incident): string[] {
  const labels: string[] = []
  for (const d of DOMAINS) {
    const v = incident.domainImpact[d.id]
    if (v !== undefined && v > 0.001) labels.push(d.label)
  }
  return labels
}

function buildMockCreateIssueUrl(
  incident: Incident,
  domainLabels: string[],
  range: TimeRangePreset,
): string {
  const summary = encodeURIComponent(`[Incident] ${incident.name}`)
  const body = [
    `Severity: ${incident.severity}`,
    `Affected domains: ${domainLabels.join(', ') || '—'}`,
    `Start: ${formatTrendTooltipTime(incident.activeFrom, range)}`,
    '',
    'Created from Telecom health dashboard (mock link).',
  ].join('\n')
  const description = encodeURIComponent(body)
  return `https://telcom-ops.atlassian.net/secure/CreateIssue.jspa?pid=10000&issuetype=10002&summary=${summary}&description=${description}`
}

type Props = {
  incident: Incident
  range: TimeRangePreset
  onClose: () => void
}

export function JiraIncidentPanel({ incident, range, onClose }: Props) {
  const jira = getMockJiraInfo(incident.id)
  const domains = affectedDomainLabels(incident)

  return (
    <div className="jira-panel__inner">
      <div className="jira-panel__head">
        <div>
          <p className="jira-panel__kicker">Jira</p>
          <h2 className="jira-panel__title">{incident.name}</h2>
          <p className="jira-panel__meta" aria-label="Incident severity">
            <span
              className={`domain-panel__sev domain-panel__sev--${incident.severity}`}
            >
              {incident.severity}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="jira-panel__close"
          onClick={onClose}
          aria-label="Close Jira panel"
        >
          ×
        </button>
      </div>

      <div className="jira-panel__body">
        {jira.kind === 'linked' ? (
          <div className="jira-panel__card">
            <dl className="jira-panel__dl">
              <div className="jira-panel__row">
                <dt>Ticket</dt>
                <dd>
                  <a
                    href={jira.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="jira-panel__link"
                  >
                    {jira.key}
                  </a>
                </dd>
              </div>
              <div className="jira-panel__row">
                <dt>Status</dt>
                <dd>
                  <span
                    className={`jira-panel__status jira-panel__status--${jira.status}`}
                  >
                    {jiraStatusLabel(jira.status)}
                  </span>
                </dd>
              </div>
              <div className="jira-panel__row">
                <dt>Assignee</dt>
                <dd>{jira.assignee}</dd>
              </div>
            </dl>
            <a
              className="jira-panel__btn jira-panel__btn--primary"
              href={jira.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Jira
            </a>
          </div>
        ) : (
          <div className="jira-panel__card jira-panel__card--create">
            <p className="jira-panel__hint">
              No ticket yet — fields pre-filled below.
            </p>
            <div className="jira-panel__prefill" aria-label="Prefilled issue fields">
              <div className="jira-panel__prefill-row">
                <span className="jira-panel__prefill-label">Summary</span>
                <span className="jira-panel__prefill-value">{incident.name}</span>
              </div>
              <div className="jira-panel__prefill-row">
                <span className="jira-panel__prefill-label">Severity</span>
                <span className="jira-panel__prefill-value">{incident.severity}</span>
              </div>
              <div className="jira-panel__prefill-row">
                <span className="jira-panel__prefill-label">Affected domains</span>
                <span className="jira-panel__prefill-value">
                  {domains.length ? domains.join(', ') : '—'}
                </span>
              </div>
              <div className="jira-panel__prefill-row">
                <span className="jira-panel__prefill-label">Start time</span>
                <span className="jira-panel__prefill-value">
                  {formatTrendTooltipTime(incident.activeFrom, range)}
                </span>
              </div>
            </div>
            <a
              className="jira-panel__btn jira-panel__btn--primary"
              href={buildMockCreateIssueUrl(incident, domains, range)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Create Jira ticket
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
