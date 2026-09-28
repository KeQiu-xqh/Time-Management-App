# Mobile Density and Calendar List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new tasks unscheduled by default, expose the same nine category colors everywhere, compact the three mobile list pages and mobile navigation, and add compact day/week calendar list modes.

**Architecture:** Preserve the existing React components and desktop layouts. Put shared phone-only density rules in `MobileUI.css`, keep mobile-calendar-specific layout in `MobileCalendar.css`, and extract date grouping/sorting into a small pure helper so day/week list behavior has real unit tests.

**Tech Stack:** React 19, TypeScript, Tailwind utility classes, plain responsive CSS, Node test runner, Vite.

---

### Task 1: New-task date and category color consistency

**Files:**
- Modify: `components/AddTaskModal.tsx`
- Modify: `components/CategoriesView.tsx`
- Create: `tests/taskDefaultsAndColors.test.mjs`

- [ ] **Step 1: Write the failing source regression tests**

Create tests which read both components and assert that `resetForm()` calls `setDoDateStr('')`, that category creation does not contain `CATEGORY_COLORS.slice(0, 5)`, and that both creation and editing map the complete `CATEGORY_COLORS` array.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/taskDefaultsAndColors.test.mjs`

Expected: FAIL because the task form still defaults to today and the create form still slices the palette.

- [ ] **Step 3: Implement the minimal behavior**

Change the new-task reset to:

```ts
setDoDateStr('');
```

Change category creation to:

```tsx
{CATEGORY_COLORS.map((color, idx) => (/* existing color button */))}
```

Give the create palette a wrapping semantic class shared with the edit palette.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test tests/taskDefaultsAndColors.test.mjs`

Expected: both tests PASS.

### Task 2: Compact phone list pages

**Files:**
- Modify: `components/MobileUI.css`
- Modify: `components/CategoriesView.tsx`
- Modify: `components/BacklogView.tsx`
- Modify: `components/HabitsView.tsx`
- Modify: `components/HabitCard.tsx`
- Modify: `components/TaskCard.tsx`
- Create: `tests/mobileListDensity.test.mjs`

- [ ] **Step 1: Write failing density contract tests**

Assert that the mobile media query contains compact rules for `.mobile-page-header`, `.mobile-page-content`, `.task-card`, `.habit-card`, `.habit-week`, `.category-habit-card`, and list-grid gaps, while the desktop portion remains unchanged.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/mobileListDensity.test.mjs`

Expected: FAIL because the new compact class hooks and target dimensions do not exist.

- [ ] **Step 3: Add semantic hooks and compact CSS**

Add narrowly scoped class names to section headings, task grids, category habit cards, and habit headers. Within the existing `<768px` media query:

- reduce page header/content/section gaps;
- use 8px vertical task-card padding, a 14px title and tighter metadata/deadline spacing;
- keep task action hit areas at 40px;
- reduce habit card/header padding and week/month cell size;
- reduce category habit summary dimensions;
- preserve wrapping and no horizontal overflow.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test tests/mobileListDensity.test.mjs`

Expected: all density contract tests PASS.

### Task 3: Mobile calendar day/week list mode

**Files:**
- Create: `components/mobileCalendarList.ts`
- Create: `tests/mobileCalendarList.test.mjs`
- Modify: `components/MobileCalendar.tsx`
- Modify: `components/MobileCalendar.css`

- [ ] **Step 1: Write failing unit tests for date grouping and ordering**

Define the desired helper API:

```ts
calendarTasksForDate(tasks, date)
calendarTaskGroups(tasks, days)
```

Test that only matching local dates are returned, all-day tasks precede timed tasks, timed tasks are sorted by `startTime`, and week groups retain empty dates.

- [ ] **Step 2: Run the helper test and confirm RED**

Run: `node --import tsx --test tests/mobileCalendarList.test.mjs`

Expected: FAIL because `components/mobileCalendarList.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

Use `dateKey(new Date(task.doDate))` for local date matching and a stable comparison key of `0` for all-day items followed by `timeMinutes(startTime)` for timed items.

- [ ] **Step 4: Run the helper test and confirm GREEN**

Run: `node --import tsx --test tests/mobileCalendarList.test.mjs`

Expected: helper tests PASS.

- [ ] **Step 5: Write failing mobile-calendar structure tests**

Extend `tests/mobileListDensity.test.mjs` to require:

- `displayMode` state with `list` and `timeline`;
- a compact `mc-display-toggle` available only outside month mode;
- a compact inline `mc-precision` control inside `mc-toolbar`;
- list groups and list rows for day/week;
- the hint rendered only while `preview` is active.

- [ ] **Step 6: Run the structure test and confirm RED**

Run: `node --test tests/mobileListDensity.test.mjs`

Expected: FAIL because the calendar still has a separate precision row, no list mode, and a permanent hint.

- [ ] **Step 7: Implement the calendar UI**

Add `displayMode: 'timeline' | 'list'`, place the compact precision select and list/timeline icon toggle in the toolbar, and render:

```tsx
displayMode === 'list'
  ? <div className="mc-list">{/* day/week groups */}</div>
  : <>{/* existing day header, all-day row and timeline */}</>
```

Each list row includes a completion control, time label, title, category and estimate; clicking the content opens the existing detail sheet. Month mode remains unchanged. Render `.mc-hint` only for an active drag preview, and keep the static drag instructions in screen-reader-only text.

- [ ] **Step 8: Add compact calendar CSS and verify GREEN**

Keep the header to two rows, make toolbar controls fit at 320–430px widths, style list groups/rows with controlled density, and preserve 40px touch targets.

Run: `node --import tsx --test tests/mobileCalendarList.test.mjs tests/mobileListDensity.test.mjs`

Expected: all calendar tests PASS.

### Task 4: Compact bottom navigation and release verification

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `components/MobileUI.css`
- Modify: `tests/mobileListDensity.test.mjs`

- [ ] **Step 1: Add a failing bottom-navigation density test**

Require semantic `.bottom-nav`, `.bottom-nav-item`, `.bottom-nav-icon`, and `.bottom-nav-label` hooks plus phone rules that reduce vertical padding while preserving at least a 40px item hit target and `env(safe-area-inset-bottom)`.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/mobileListDensity.test.mjs`

Expected: FAIL because the semantic hooks do not exist.

- [ ] **Step 3: Implement compact navigation and confirm GREEN**

Replace only the mobile navigation spacing classes with the semantic hooks and add the phone-only sizing rules.

Run: `node --test tests/mobileListDensity.test.mjs`

Expected: PASS.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev --audit-level=high
git diff --check
```

Expected: zero TypeScript errors, zero failed tests, successful Vite build, zero high-severity production vulnerabilities, and no whitespace errors.

- [ ] **Step 5: Commit, push and verify deployment**

Commit implementation as `feat: compact mobile views and add calendar lists`, push `main`, wait for the production asset hash to change, and verify the deployed JavaScript contains the new list-view labels.
