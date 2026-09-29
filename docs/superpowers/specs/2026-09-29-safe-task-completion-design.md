# Safe Task Completion Design

## Problem

Completing a task can leave some mobile browsers on a blank, unresponsive page from both the calendar list and backlog views. A clean local task does not reproduce the crash, so the failure depends on browser capabilities or persisted legacy task data.

The current completion path calls `nextRepeatTask` for every completed task. Its default ID argument evaluates `globalThis.crypto.randomUUID()` before the function can reject non-repeating tasks. The same function assumes persisted recurrence fields have their current runtime shapes. A compatibility or malformed-data exception therefore occurs inside a React state update and can abort rendering.

## Chosen Approach

Use one defensive completion path for every view while keeping the existing UI and persistence format unchanged.

1. A non-repeating or unscheduled task completes without accessing a random-ID API.
2. Recurrence data is checked at runtime before date parsing, weekday iteration, or successor creation.
3. A successor ID is created only after recurrence eligibility is established. Prefer `crypto.randomUUID` when it is callable; otherwise fall back to the existing random string strategy. If the browser implementation throws, use the fallback.
4. Invalid legacy recurrence data skips successor creation but does not block completion of the current task.
5. The calendar list, backlog, categories, and desktop task cards continue using the same central `handleToggleTask` function, so the fix applies consistently without view-specific patches.

## Components and Data Flow

- `components/recurrence.ts` owns safe runtime recurrence validation and lazy successor-ID creation.
- `App.tsx` continues to toggle the selected task first, then optionally appends the validated successor returned by `nextRepeatTask`.
- View components remain unchanged; they only send a task ID to the central handler.
- IndexedDB and sync payload schemas remain unchanged. No migration is required.

## Failure Handling

- Missing, unsupported, or malformed recurrence metadata returns no successor.
- Failure to access the browser random UUID implementation uses a local fallback ID.
- The current task's completion state is never dependent on successor generation for non-repeating tasks.
- No alert or modal is shown for repaired legacy records; the app remains interactive and preserves the completed task.

## Tests

Add regression coverage proving:

- Completing a non-repeating task never calls the supplied ID generator.
- A repeating task calls the ID generator only after it is known to need a successor.
- A throwing UUID provider falls back to a usable ID.
- Invalid legacy anchor and weekday values return no successor instead of throwing.
- Existing daily, weekly, monthly, custom, duplicate-successor, and estimate-duration recurrence behavior remains unchanged.
- Manual browser verification covers mobile calendar list, mobile backlog, and desktop backlog completion.

## Acceptance Criteria

- Completing ordinary tasks from the mobile calendar list and backlog never produces a blank page.
- Completing an eligible repeating task still creates exactly one next occurrence.
- Invalid legacy recurrence data cannot crash task completion.
- Desktop completion behavior is unchanged.
- Full tests, TypeScript checking, and production build pass before deployment.
- The fix is pushed to `main` and the Vercel production deployment is verified.

## Out of Scope

- UI redesign or changes to completed-task visibility.
- A global React error boundary.
- Changes to sync, login, or storage formats.
