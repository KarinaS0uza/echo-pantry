# Project rules

Follow the [constitution](.specify/memory/constitution.md), the current feature's spec and
tasks, and the [design Definition of Done](planning/design/design.md#definition-of-done).
Use the [documentation index](docs/README.md) for the maintained topic guides.

## Screen capture and recording prohibited by the user

Until the user explicitly re-enables recording, do not capture screenshots, record screen
video, create screencasts/GIFs, or enable automated screen capture, including test-runner
screenshots/videos and traces containing screenshots. Do not call screenshot tools or
combined state-and-screenshot tools, even for temporary inspection without saving a file.
Do not set/check viewport dimensions for the purpose of screen capture. Do not start
background recording or capture jobs. If an existing agent-started capture job is found,
stop it without deleting previously saved evidence.

This user instruction overrides capture/recording steps in the browser QA rules below and
their linked procedures. Use text-only DOM/accessibility observations for browser checks.
Preserve existing evidence and leave visual criteria not demonstrated by that evidence
pending. This prohibition persists across tasks and must not be lifted automatically.

## Writing style

Do not use em dashes (Unicode U+2014) in repository files or responses about this project.
Use standard hyphens, commas, colons, parentheses, or separate sentences as appropriate.

## Required user-facing wording review

After every implementation phase, review all user-facing wording introduced or affected by
the phase and fix it before marking the phase complete. Include page and dialog titles,
headings, navigation, buttons, form labels, placeholders, helper text, accessible names,
validation messages, and empty, loading, error, and success states.

- Use clear, natural, concise wording with correct spelling, grammar, and punctuation.
- Capitalize the first word where appropriate. Use consistent title case for short titles
  and action labels, such as "Sign Up", "Sign In", and "Create Account". Never expose
  inconsistent casing or code-style names such as "signUP".
- Use sentence case for full sentences, descriptions, helper text, and messages. Preserve
  proper names, acronyms, intentional brand spelling, and each locale's conventions.
- Use [Apple's website](https://www.apple.com/) and
  [Apple Account](https://account.apple.com/) as references for polished wording and
  context-appropriate capitalization, with the examples above as the project convention.
- Keep wording in the i18n layer and use the same wording for the same action across screens.
- Verify affected copy in the rendered app during required browser QA, including clipping
  or wrapping after wording changes. Record the review, fixes, and any unverified items in
  the phase's verification evidence. If a phase affects no user-facing copy, record that the
  review is not applicable and why.

## Required browser QA

After UI implementation or changes, start the local frontend at **http://localhost:3000**
and Django at **http://localhost:8000**, then use an available browser automation or
computer-use tool to interact with the actual rendered application.

- Click through every implemented screen and its relevant forms, dialogs, navigation, and
  states. Use the controls, enter data, scroll, and exercise keyboard navigation; inspect
  the results in the browser. Cover every in-scope screen before declaring the release done.
- Capture and inspect real screenshots at 320pt wide and the `lg` breakpoint in both themes.
  Compare the rendered results against every item in `planning/design/design.md`'s
  **Definition of Done** and the applicable acceptance criteria. Keep the existing device,
  zoom, reduced-motion, localization, and recovery checks.
- Fix failures, reload the app, repeat the failing interactions, and capture new screenshots.
  After fixes, complete a final click-through to check for regressions. Continue until the
  applicable criteria pass or an actual blocker prevents validation.
- Save screenshots and a report under `artifacts/browser-qa/<run-id>/`; link that evidence
  from `planning/acceptance-checklist.md`. Record the screen, route/state, viewport, theme,
  actions, criterion, observed result, fix, and retest result.
- Source inspection, build success, and unit tests complement this pass; they do not prove
  what the rendered app looks like or how it behaves. Do not fabricate screenshots or mark
  unvisited screens passed. If the app or browser tools are unavailable, record the blocker
  and leave browser acceptance open.

The repeatable procedure and evidence format are in [testing](docs/testing.md#required-browser-qa).
This rule does not mark any existing implementation or acceptance task complete.
