# Echo Pantry presentation kit

Audience: general audience. Prepared September 8, 2026.

## Session timing

This schedule treats the one-minute recording as additional to the spoken presentation.

| Part | Duration | What to do |
|---|---|---|
| Talk | Aim for 2:30; allowed range 2:00-3:00 | Use the script and cue card below. |
| Recorded website demo | 1:00 | Play a local video of the actual working website. Short captions can explain the actions without additional narration. |
| Questions | 2:00 | Answer one point at a time, usually in 15-25 seconds. |

Target total: 5:30. Confirm the event's timing convention before rehearsal.

## Spoken script

This draft describes intended behavior while implementation is in progress. Pause briefly at each paragraph. Read it aloud with a timer; the word count is a pacing guide, not a measured speaking duration.

<!-- speech:start -->
Hi everyone. Today I'm sharing Echo Pantry, a project about a familiar question: what can I cook with the food I already have?

A fridge can be full, but deciding what to make can still be difficult. Echo Pantry is designed to connect the ingredients in your kitchen with meals you might actually want to cook.

The planned experience starts with a sample pantry. You can explore it without creating an account. Meals that need no shopping come first. Among similar options, meals using ingredients that need attention sooner take priority.

Each suggestion explains why it appears. You can also choose the ingredients you want to use today, so the suggestions follow your choices.

Another part of the design is being clear about missing ingredients. Buying a whole package costs more than using a small portion. Echo Pantry would show that difference, label estimates, and show when a price is unavailable.

For your own pantry, the planned cooking flow includes a review. After cooking, you check what you actually used before the pantry is updated. The aim is to make keeping the pantry accurate feel manageable.

This is still a work in progress. The project includes a product plan, a design system, and prepared recipe and price references. Implementation is underway. A complete, tested website is the next milestone.

The first question for user testing is simple: can people find a meal they want to make, and does updating their pantry feel worth the effort?

The goal is to make one everyday decision easier. Echo Pantry: cook from what you already have. Thank you.
<!-- speech:end -->

To shorten the talk, omit the paragraph beginning "Another part of the design." Keep the other paragraphs and the pauses.

Before presenting, update the build-status paragraph to match the latest verified app. Describe only observed features as working. After the recording has been created and checked, replace the closing "Thank you" with: "I'll now play a one-minute recording of the working website." Add thanks after playback.

## One cue card

**QUESTION > MEALS > CHOICES > TRUST > NEXT**

| Cue | Reminder |
|---|---|
| QUESTION | Full fridge. What can I cook? |
| MEALS | Sample pantry. No shopping first. Clear reasons. |
| CHOICES | Choose ingredients for today. |
| TRUST | Honest estimates. Review what was used. |
| NEXT | Current progress. Test usefulness. Introduce the verified video. |

Keep the full script nearby if notes are allowed. Practice the opening and closing until they feel familiar. You can pause, look at your card, and continue.

If you lose your place: **"The main idea is to help people choose a meal from food they already have."** Then continue from the next cue.

## Q&A preparation

These are alternatives to prepare for, not six answers to deliver in sequence. Leave time for the audience to ask each question.

| Likely question | Short answer |
|---|---|
| How is this different from searching for recipes? | The focus is your pantry. The planned suggestions consider what you already have, what needs attention sooner, and why each meal is a match. |
| What works today? | Implementation is in progress. The plan, design system, and recipe and price references are prepared. I have not yet verified a complete working website. **Update this answer after the recording is verified.** |
| Will I have to enter everything manually? | Manual entry is part of the first version. The design also includes reviewing ingredients after cooking and checking the pantry. Whether that effort feels worthwhile is one of the first things to test. |
| Does it use AI to create recipes? | The baseline plan uses a curated collection of 30 real recipes and explicit matching rules. It does not need live AI. Optional assistance is a separate proposed feature. |
| Are prices current, and can it prove savings? | The prepared prices are dated reference snapshots, not live store prices. Some ingredients have no price available. Real user evidence would be needed before claiming money saved or waste prevented. |
| What will you test first? | Whether people can find a meal they want to make, understand why it was suggested, and keep their pantry updated without too much effort. |

Useful phrases:

- To take a moment: "Let me think for a second."
- To check the question: "Do you mean how the recommendations are chosen?"
- When something is untested: "I haven't tested that yet. I'd need to check it before giving you a reliable answer."

## Actual screen recording plan

**Required output:** a one-minute video captured from the real website running in the browser. This plan is not a video. The earlier concept storyboard does not satisfy this requirement.

Use a readable desktop window, a steady cursor, and a clearly labeled sample pantry. Default to short captions without microphone narration. Choose the exact ingredient and recipe only after checking real results. Do not invent a successful match or use a mock page as app footage.

| Time | Actual browser action to record | Suggested caption |
|---|---|---|
| 0:00-0:08 | Show the landing screen and click **Try a sample pantry**. | Cook from what you already have. |
| 0:08-0:20 | Show loaded meal recommendations. Pause over a complete match and its reason. | See meals that need no shopping. |
| 0:20-0:34 | Open **Choose ingredients for today**, select one verified sample ingredient, and apply the selection. | Choose what you want to use today. |
| 0:34-0:52 | Open an actual matching recipe. Slowly show available ingredients, any missing ingredients, and the explanation. | Understand why this meal fits. |
| 0:52-1:00 | Return to the results and hold the final view. | Echo Pantry. Cook from what you already have. |

The sample journey stays read-only. Keep account registration and cooking deductions out of this short recording. They can be discussed as planned features until independently verified.

Before capture, make one complete practice pass through these actions. After capture, play the exported file from beginning to end. Check duration, readable text, cursor visibility, actual loaded results, and clean beginning/end. Keep a local copy available for presentation playback.

## Recording readiness

The last check in this session found no `frontend/index.html`, no frontend application screens, and no service accepting connections on `localhost:3000` or `localhost:8000`. Implementation files are changing, so check again before recording. **No video has been created.**

The recording requires the real frontend, local Django API, seeded sample data, matching, selection controls, and recipe detail to work. Complete applicable browser verification before claiming those flows are ready. Follow the [required browser QA procedure](../../../docs/testing.md#required-browser-qa), including real screenshot evidence and the acceptance checklist. This presentation kit does not close any implementation or browser acceptance task.

## Rehearsal

1. Read the talk aloud once with a timer. Aim for 2:30, leaving room for pauses.
2. Practice once using the five cue words. Use the full script whenever you need it.
3. Practice three randomly chosen questions. Keep each answer to one main point.
4. Once the video exists, rehearse the complete order: talk, play the video, then questions.

## Source basis

- [Product overview](../../../README.md), [MVP specification](../../../specs/001-echo-pantry-mvp/spec.md), and [implementation tasks](../../../specs/001-echo-pantry-mvp/tasks.md).
- [Prepared reference data](../../../data/demo/README.md) and [price examples](../../../data/demo/price-examples.json).
- [Frontend guide](../../../docs/frontend.md) and [design rules](../../../planning/design/design.md).
