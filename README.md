# USA Field Resource Planner MVP

Small internal planning prototype for USA technician support coverage using the current service team and customer coverage model.

The MVP answers one practical question:

> Which resource should cover which direct customer, partner escalation, hotline queue, or middleware support task today?

## What is included

- Daily technician board
- Task intake list
- Weekly intake form for unplanned work and customer support requests
- Simplified USA coverage map
- Automatic initial assignment
- Manual drag and drop overrides
- KPI strip for assignment coverage, travel, utilization, and uncovered work
- CSV export
- Browser print flow for PDF
- Preventive maintenance tracking by site and module family
- PostgreSQL/PostGIS starter schema in `schema.sql`

## Current real-world data loaded

Direct customers with full responsibility:

- Direct Client NY-01 - NY Metro Area: one resource always available, OSE Northeast-03 or OSE Northeast-02
- Direct Client NY-02 - NY Metro Area: Night OSE Northeast-01 for night shift, OSE Northeast-03 or OSE Northeast-02 for day shift
- Direct Client Lab Network Midwest Site: OSE Midwest-01 dedicated
- Direct Client Lab Network Northeast Site MA: OSE Northeast-04 dedicated
- Direct Client MA-01: OSE Northeast-01 dedicated

Partner coverage:

- Partner CA-01, West Remote Site: remote hotline and L2/L3 escalation, onsite only for L3 issues
- Partner Service Provider / Partner TN-01, Southeast Partner Site: partner manages L1, internal team handles L2/L3 escalation
- Partner Service Provider / Partner CA-02, West Partner Site: partner manages L1, internal team handles L2/L3 escalation

Service team classification:

- Technical Leader: Technical Leader Midwest
- Senior FSE: Senior FSE Midwest, Senior FSE Southeast
- OSE / dedicated onsite engineers: OSE Northeast-01, OSE Northeast-02, OSE Northeast-03, OSE Northeast-04, OSE Midwest-01, Night OSE Northeast-01
- Middleware SW: Senior Middleware SW-01, Middleware SW-02, Middleware SW-03

## Preventive maintenance section

The PM section uses the attached preventive maintenance plan workbook:

- Source file: `3M00000022-en-US.09.xlsx`
- Source sheet: `PMP`
- Extracted module templates: 52
- Tracked fields: module/slot, part number, component, operation, tools/materials, required minutes

Each direct customer site has an initial module plan and a checklist progress view. Completed PM activities are saved in the browser with local storage for the current prototype. Partner sites are listed but marked as remote/escalation coverage until a routine onsite PM scope is defined.

## How to run

Open `index.html` in a browser.

No build step is required. The demo uses plain HTML, CSS, and JavaScript so it can be reviewed quickly without installing dependencies.

## Current assignment logic

The prototype scores each task against each resource using:

- Required skill match
- Hard eligibility for dedicated sites
- Preferred resources for shared sites
- Resource classification
- Resource region vs task region
- Estimated travel time from home base
- Current assigned workload
- Task priority
- Daily work and travel limits

Tasks that cannot satisfy the current constraints remain uncovered.

## Weekly intake model

The planner now separates baseline work from unplanned weekly intake:

- Baseline work: fixed site coverage, recurring hotline coverage, partner support queues, and planned weekly work.
- Manual intake: new issues that appear during the week, Salesforce escalations from partners, direct customer support requests, urgent onsite L3 visits, middleware support, and site coverage gaps.

Manual tasks are saved in the browser with local storage for the prototype and are included in the next `Generate plan` run. Each manual task keeps its category, source, customer/site, priority, window, duration, skill requirement, contract type, and remote/onsite mode.

Operational distinction:

- Site coverage tasks protect mandatory presence at direct customer sites.
- Direct customer issue tasks represent L1/L2/L3 support on sites where the team owns the full service responsibility.
- Partner escalation tasks represent L2/L3 support opened by Partner West Provider or Partner Service Provider, typically remote and business-hours unless escalated to onsite L3.
- Middleware support tasks are routed to the SW/middleware team.

## MVP data model

The production version should start with:

- `technicians`
- `technician_skills`
- `technician_availability`
- `customers`
- `tasks`
- `assignments`
- `travel_cache`
- `pm_module_templates`
- `pm_template_activities`
- `site_pm_plans`
- `site_pm_modules`
- `site_pm_activity_status`

For a very lean pilot, the first four tables can be enough if assignments are stored directly on `tasks`.

## Next build steps

1. Replace in-memory demo data with FastAPI endpoints.
2. Store technicians, customers, tasks, and availability in PostgreSQL.
3. Add CSV import validation for dirty address and skill data.
4. Replace linear travel estimate with OSRM or GraphHopper.
5. Add OR-Tools batch optimization for full-day route planning.
6. Add Azure AD or internal SSO before wider rollout.

## Pilot recommendation

Start with one USA region and one real operating team. Measure:

- Total travel time
- Uncovered tasks
- Tasks covered inside SLA
- Technician utilization
- Manual override rate

The best early success metric is not a perfect plan. It is a better first draft than the manual planner can create in the same time.
