This is already strong. I’ll extend it by filling the interaction gaps, system logic, and how pieces connect—without turning it into a checklist.

⸻

Product Requirements Document (Iteration)

Build a single-page dashboard for a telecom product that helps users understand what’s wrong, why it’s wrong, and how it’s evolving over time—without switching contexts.

The system revolves around domains (RAN, Core, Security, Transport) and incidents, where incidents dynamically influence domain health.

⸻

Domain Health Model (Core Logic)

Each domain has a continuously updating health score (0–100). This score is not static—it is computed based on active incidents.

Each incident contributes to one or more domains using:
	•	Severity (critical, major, minor)
	•	Impact scope (localized vs widespread)
	•	Trend (worsening vs improving)

Health score should feel explainable. When a user looks at a domain, they should be able to immediately understand what is pulling the score down.

When time range changes (24h / 7d / 30d), the health score recalculates based on incidents active in that window. This is important—health is time-contextual, not absolute.

⸻

Top Section: Domain Overview (Entry Point)

The top section shows all domains as cards or gauges.

Each card is interactive, not just visual.

Default state:
	•	Shows domain name
	•	Health score
	•	Small trend indicator (arrow + % change based on selected time range)
	•	Optional sparkline preview for quick scan

Hover:
	•	Slight emphasis + quick tooltip showing top 1–2 contributing incidents

Click:
	•	Sets that domain as the active context
	•	Updates all downstream sections (incidents list, charts, Sankey)
	•	Maintains selection state clearly (highlighted card)

The goal here is quick scanning → quick selection.

⸻

Domain Drilldown: Incident Drivers

Below the domain cards, the system shifts into “why this domain looks like this”.

This section lists top contributing incidents for the selected domain.

Each incident row should include:
	•	Incident name
	•	Severity indicator
	•	Contribution weight (implicit via visual prominence, not raw numbers unless needed)
	•	Trend direction (increasing / decreasing)
	•	Mini sparkline showing behavior over selected time range

Interaction:

Hover on incident:
	•	Highlights corresponding connection in Sankey
	•	Highlights affected domains if multi-domain
	•	Shows deeper tooltip (impact description, affected regions, etc.)

Click on incident:
	•	Locks focus on that incident across the dashboard
	•	Updates Sankey to emphasize its connections
	•	Updates charts to show incident-specific trend in detail

This is critical: users move from domain → incident → system-wide impact seamlessly.

⸻

Trend Visualization (Time Behavior)

There should be two synchronized trend views:
	1.	Domain health over time
	2.	Incident behavior over time

Both respect the selected time range (24h / 7d / 30d).

Switching time range should:
	•	Smoothly transition charts (not hard reset)
	•	Recompute values (not just zoom)

Interaction details:

Hover on timeline:
	•	Shows exact values at that point in time
	•	Synchronizes across all charts (domain + incidents)

If an incident is selected:
	•	Its trend becomes primary
	•	Domain trend remains but visually secondary

If no incident is selected:
	•	Domain trend is primary
	•	Top incidents may be overlaid or selectable

Important: time is a shared dimension across the whole dashboard, not isolated per chart.

⸻

Correlation Visualization (Sankey)

This is the core “connection layer” of the system.

Left side: Domains
Right side: Incidents
Flows: Strength of impact

The Sankey should make it immediately clear:
	•	Which incidents affect multiple domains
	•	Which domains are impacted by the same incident
	•	Relative strength of those relationships

Interaction:

Hover on a domain node:
	•	Highlights all connected incidents
	•	Fades unrelated flows

Hover on an incident node:
	•	Highlights all impacted domains
	•	Shows multi-domain spread clearly

Click on node:
	•	Locks selection
	•	Filters rest of dashboard to this context

Click on a flow (link):
	•	Focuses on that specific domain–incident relationship
	•	Updates charts and incident list accordingly

When an incident affects multiple domains, the Sankey should visually split flows clearly (not overlap ambiguously). This is one of the key value moments.

⸻

Cross-Component Interaction (Important)

Everything is connected. No component works in isolation.
	•	Selecting a domain updates incidents, charts, Sankey
	•	Selecting an incident updates domain context + Sankey + charts
	•	Hovering anywhere creates temporary focus across all views

The system should feel like a single interactive surface, not multiple widgets.

⸻

Time Range Control (Global Behavior)

Time range selector (24h / 7d / 30d) sits at top level.

Changing it:
	•	Recomputes domain health
	•	Updates incident ranking
	•	Re-renders charts
	•	Adjusts Sankey weights

No component should remain stale.

Transition should feel continuous (animated interpolation preferred).

⸻

States & Edge Cases
	•	If no incidents affect a domain → show stable/healthy state clearly
	•	If too many incidents exist → show top N + “view more” expansion
	•	If data is sparse in selected range → communicate low confidence (don’t fake trends)
	•	If an incident disappears in selected range → it should not appear artificially

⸻

Outcome

The dashboard should let a user answer, within seconds:
	•	Which domain is unhealthy?
	•	What is causing it?
	•	Is it getting better or worse?
	•	Are these issues isolated or connected across domains?

Most importantly, it should eliminate the need to mentally stitch together data across views.