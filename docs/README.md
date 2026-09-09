# Documentation

Echo Pantry's documentation describes the product and its planned implementation.
The sample Meals and recipe-detail workflows are implemented. Phase 2 retains three open
shared-component verification tasks; Phase 3 visual acceptance is pending. Phase 4 account and owned-pantry workflows are implemented, with browser acceptance pending. See [Phase 3 verification](phase-3-verification.md).
V1 runs the frontend and Django API on
localhost with SQLite; public hosting and hosted PostgreSQL are planned for V2.

- [Phase 4 verification](phase-4-verification.md): owned pantry, cooking, automated evidence and browser limitations.

## Guides

The [interactive kitchen simulation](kitchen-simulation.md) implements the owner-selected
reference design and is available at `#/kitchen`. The app root shows the simple landing page. The simulation remains separate from saved pantry data.

| Guide | Read it for |
|---|---|
| [Architecture](architecture.md) | How the browser, API, and database fit together. |
| [Backend](backend.md) | Django app organization, responsibilities, and service dependencies. |
| [Frontend](frontend.md) | Browser structure, navigation, API integration, and state recovery. |
| [UI](ui.md) | Visual design, reusable components, responsive behavior, and accessibility. |
| [API](api.md) | Authentication, ownership, errors, retries, and resource contracts. |
| [Database](database.md) | SQLite, transactions, data-model references, seeds, and recovery. |
| [Local development](local-development.md) | Prerequisites, environment settings, startup, and phone access. |
| [Testing](testing.md) | Automated checks, browser validation, and acceptance evidence. |
| [Phase 3 verification](phase-3-verification.md) | Sample discovery implementation, tests, text-only browser checks, and limits. |
| [Foundation validation](foundation-validation.md) | Phase 2 implementation, data review, checks, and browser evidence. |
| [Setup validation](setup-validation.md) | Phase 1 observed checks, fixes, and remaining dependency advisories. |
| [Future improvements](future-improvements.md) | V2 deployment and other deferred directions. |

## Detailed references

- [Project constitution](../.specify/memory/constitution.md): binding product and engineering requirements.
- [MVP decisions](../planning/mvp-decisions.md): approved behavior and detailed product rules.
- [Feature specification and plan](../specs/001-echo-pantry-mvp/plan.md): requirements, source layout, and implementation work.
- [Data model](../specs/001-echo-pantry-mvp/data-model.md) and
  [API contracts](../specs/001-echo-pantry-mvp/contracts/README.md): precise schemas and behavior.
- [Quickstart](../specs/001-echo-pantry-mvp/quickstart.md) and
  [acceptance checklist](../planning/acceptance-checklist.md): run procedures and verification criteria.
- [Design reference](../planning/design/design.md), [tokens](../planning/design/tokens.ts),
  [component catalogue](../planning/design/components.md), and
  [reference implementations](../planning/design/code.md): detailed UI material.
- [Reference data](../data/demo/README.md): source records and preparation status.

## Keeping documentation consistent

Use this directory for maintained technical guides. Keep the root README as a product
overview and entry point. Describe product requirements, version decisions, and operating
procedures without including private conversation context or the circumstances motivating
a decision. Update each topic in its own guide and link to detailed specifications rather
than maintaining competing copies of schemas or acceptance criteria.

The constitution and current feature scope govern. Earlier design examples or planning
history do not add features to the current release. Distinguish planned behavior from
implemented and verified behavior, and record actual evidence before marking checks complete.

- [Demo walkthrough](demo-walkthrough.md): the prepared pantry-to-pasta presentation and rehearsal reset.
