# End-to-end demo

Open http://localhost:3000/. Django must be running at http://localhost:8000.

From the sign-in screen, select **Continue With Demo Data** to open the prepared pantry
without an email, password, or account. This leaves any account session and uses the
existing isolated demo data. Direct access is also available at `http://localhost:3000/#/pantry`
when signed out. A connection banner means the local API is unavailable; the demo still
needs Django to read and save its SQLite data.

1. **Home**: Introduce Echo Pantry as a way to track ingredients, see what needs using soon,
   and make dinner with what is already available. Select **My Pantry**.
2. **My Pantry**: Show the nine prepared ingredients, quantities, and estimated dates.
   Cherry tomatoes need attention tomorrow, followed by burrata and basil.
3. **Add Ingredients**: Open the form with one blank ingredient. Enter its name and adjust
   quantity, unit, storage location, and optional date. Select **Add Ingredient** to save,
   or **Add One More** to append another blank row. With multiple rows, **Add Ingredients**
   saves them together. Unfinished entries are restored when reopening the form.
4. Select **Meals** to browse recipes. The Pantry action opens the Meals page.
   For the prepared pasta walkthrough, open `/#/kitchen?screen=recipe&dish=tomato`,
   then select **Start Guided Cooking**.
5. Walk through six steps: prepare ingredients, cook pasta, warm garlic, make tomato sauce,
   toss pasta with sauce and basil, then add burrata and serve. Use **Next Step** at your own
   pace. These instructions can be demonstrated without waiting for timers.
6. On step six, select **Finish Cooking**. Review the selected pantry entries and uncheck
   anything with leftovers. Confirm **Finish Cooking** to remove the selected entries and
   receive **150 points**: 100 for cooking at home and 50 for a colorful plate.
7. Select **View My Pantry** to show the updated inventory and cooking points. Reloading
   retains the saved inventory and rewards.

Before another rehearsal, use **Reset Demo** in My Pantry and confirm. This restores the
nine starting ingredients, clears demo rewards/history, and removes demo additions.

## Scope

This is an isolated local demonstration, saved in Django SQLite and shared by browsers
connected to this local app. It does not change owned account records or the sample catalogue.
No login or external AI service is required for this demo. Reset is limited to demo data.
Cooking and ingredient-addition retries have duplicate protection. Selected pantry entries
are removed in full; partial leftovers are kept by unchecking that entry in the review.
The seed portions match the pasta recipe so the default review can remove all six used entries.
Points encourage cooking habits and are not a nutritional assessment or proof of health,
money saved, or waste prevented. Estimated pantry dates are editable examples.

This owner-requested demo updates the earlier UI simulation; it does not mark the remaining
baseline account, exact partial-quantity deduction, history/undo, or release tasks complete.
See the [browser verification](../artifacts/browser-qa/2026-09-08-demo-ready/report.md).
