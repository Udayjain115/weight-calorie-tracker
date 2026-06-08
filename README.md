# Strength Calories

A deployable workout and body-weight tracker built around one principle: gym strength should guide calorie intake.

## Product Principle

The app assumes the user wants to maintain body fat while keeping gym performance stable or improving. Calories should usually stay unchanged unless body weight is moving too quickly or strength drops while body weight is flat.

## Core User Workflows

- Track current body weight and current daily calories.
- Toggle between imperial and metric units.
- Create custom training splits, such as Upper A, Lower A, Upper B, Lower B, or Full Body A/B/C.
- Add common exercises or custom exercises to each split.
- Log workout sets with weight, reps, and intensity.
- Measure intensity as RIR, meaning reps in reserve.
- Mark workouts as affected by extenuating factors, such as bad sleep, illness, hangover, travel, or stress.
- Review 14-day rolling body weight and gym performance trends.
- See alerts when comparable strength appears to decline.
- Access the app from a phone over the local network during development.

## Business Rules

### Rolling Windows

- Body weight and gym performance are interpreted through rolling 14-day windows.
- Recent data is compared with the previous rolling window where possible.
- Extenuating workouts are retained in history but excluded from strength-loss calorie escalation logic.

### Strength Loss

Strength loss means doing fewer reps at the same weight with the same or higher intensity.

In RIR terms, lower RIR is higher intensity. A set at 1 RIR is harder than a set at 3 RIR.

The app should not treat increased weight with reduced reps as automatic strength loss.

### Body Weight Targets

- The main goal is maintenance or very slow gain.
- Desired gain range is roughly 0 to 0.5 lb per week.
- Slight weight loss or gain of about 0.25 to 0.5 lb per week does not require a calorie change.
- Gaining 1+ lb per week should trigger a calorie decrease.

### Calorie Guidance

#### Standard Maingain

- No weight gain plus maintained or improved gym performance: no change.
- Slight weight loss or gain of 0.25 to 0.5 lb per week: no change.
- No gain or loss plus worse gym performance: increase calories.
- Weight gain of 1+ lb per week: decrease calories.
- Poor gym performance marked as extenuating should not automatically cause a calorie increase.

#### Small Deficit

- Slow weekly loss is acceptable when training performance is stable or improving.
- Loss of roughly 0.25 to 1 lb per week with no comparable strength decline: no change.
- Flat weight with stable/improving training: decrease calories slightly.
- Weight gain while in small-deficit mode: decrease calories.
- Weight loss faster than 1 lb per week: increase calories.
- Any comparable strength decline during the deficit: increase calories unless clearly explained by extenuating factors.

## Visualisation

- Body weight chart shows raw weigh-ins and a moving average.
- Exercise chart shows the selected exercise's top set load per workout date and a moving average.
- Exercise raw values show weight, reps, and RIR separately so the app does not collapse performance into a misleading single score.
- Exercise progression table shows top set weight, reps, RIR, and changes from the previous session.
- Exercise progression labels are intentionally transparent: load up, reps up, easier, possible drop, load down, mixed, or baseline.
- Exercise progression can be viewed across all sessions or within one specific workout split.
- Specific workout view helps account for exercise order and fatigue differences, such as biceps curls after back work on Upper A versus earlier curls on Upper B.
- Comparison strings are always ordered as Load / Reps / RIR and should be labeled in the UI, for example `Load: No change / Reps: -2 reps / RIR: -1 RIR`.

## Workout Logging Flow

- User selects the workout day/split before logging sets.
- The app presents one exercise at a time in the split's configured order.
- While logging an exercise, the user can see that exercise's active-cycle breakdown.
- The exercise breakdown shown during logging includes current history, vs last week, vs cycle start, vs current cycle peak, and vs previous cycle peak.
- The user can add multiple sets for the current exercise, then move to the next or previous exercise.
- RIR is not pre-filled; the user should intentionally enter intensity after seeing that RIR means reps in reserve.
- Saving the workout stores all logged sets together under the selected split and active training cycle.

## Training Cycles

- Users can archive the current training cycle when they move to a materially different split or exercise order.
- Archived cycles keep historical workouts and remain available for comparison.
- Starting a new cycle creates a fresh active cycle and starter splits.
- Archived cycles can be restored if the user accidentally archives the wrong cycle.
- Restoring a cycle makes it active again and attempts to restore the split setup saved when that cycle was archived.
- Archived cycles can be permanently deleted after a confirmation prompt; deleting also removes that cycle's workout history.
- Active cycle exercise breakdown compares each exercise against the prior week, the start of the active cycle, and the peak from the most recently archived cycle.
- Active cycle exercise breakdown also compares against the current cycle peak.
- Previous cycle peak uses the best top set from the archived cycle, while active-cycle comparisons use the latest/current top set.

## Current Technical Scope

- React and Vite single-page app.
- Express API for authentication and tracker-state sync.
- MongoDB Atlas storage for users and per-user tracker state.
- Local browser storage remains as a client cache.
- Static deployment-ready for Netlify.

## Environment

Create `.env` with:

```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-long-random-secret
MONGODB_DB=workout_diet_tracker
PORT=8787
```

`MONGODB_URI` and `JWT_SECRET` are required for the API. `.env` is intentionally ignored by git.

## Future Auth Work

- Forgot-password is intentionally not part of the MVP unless an email provider is added.
- A production reset flow should send a secure one-time reset link by email.
- Brevo is a potential future transactional email provider because its free plan can support low-volume transactional emails.

## Demo Admin

- In non-production, the API seeds a demo account with username `admin` and password `admin`.
- The demo admin account has the same permissions as a normal user; it is not a privileged role.
- The demo admin account is loaded with mock tracker data.
- In production, `admin/admin` is disabled unless `ENABLE_DEMO_ADMIN=true` is explicitly set.

## Run Locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Express API and Vite web app. Open the local network URL Vite prints to use it from your phone on the same Wi-Fi.

## Deploy To Netlify

Use these settings:

- Build command: `npm run build`
- Publish directory: `dist`

The included `netlify.toml` already sets those defaults.
