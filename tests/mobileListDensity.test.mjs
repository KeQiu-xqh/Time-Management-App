import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('phone backlog and category pages use the approved ultra-compact density', async () => {
  const css = await read('../components/MobileUI.css');
  const mobile = css.slice(css.indexOf('@media (max-width: 767.98px)'));

  assert.match(mobile, /\.mobile-page-header\s*\{[^}]*padding:\s*8px 10px 6px;/s);
  assert.match(mobile, /\.categories-page \.mobile-page-title\s*\{[^}]*margin-bottom:\s*6px;/s);
  assert.match(mobile, /:is\(\.categories-page, \.backlog-page\) \.mobile-page-title p\s*\{[^}]*display:\s*none;/s);
  assert.match(mobile, /\.mobile-page-content\s*\{[^}]*padding:\s*8px 10px 0;[^}]*gap:\s*10px;/s);
  assert.match(mobile, /\.task-card\s*\{[^}]*padding:\s*6px 7px;[^}]*gap:\s*5px;/s);
  assert.match(mobile, /\.task-toggle\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;/s);
  assert.match(mobile, /\.task-list-grid\s*\{[^}]*gap:\s*5px;/s);
  assert.match(mobile, /\.task-metadata\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*gap:\s*2px 4px;/s);
  assert.match(mobile, /\.task-card-title\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*16px;/s);
  assert.match(mobile, /\.category-tabs > button\s*\{[^}]*min-height:\s*34px;/s);
  assert.match(mobile, /\.category-tabs > button:last-child\s*\{[^}]*min-width:\s*36px;/s);
  assert.match(mobile, /\.category-habit-card\s*\{[^}]*padding:\s*10px;/s);
  assert.match(mobile, /\.habit-card\s*\{[^}]*padding:\s*10px;/s);
  assert.match(mobile, /\.habit-week button\s*\{[^}]*max-width:\s*38px;[^}]*height:\s*38px;/s);
});

test('mobile list components expose the compact semantic hooks', async () => {
  const [backlog, categories, habits, habitCard] = await Promise.all([
    read('../components/BacklogView.tsx'),
    read('../components/CategoriesView.tsx'),
    read('../components/HabitsView.tsx'),
    read('../components/HabitCard.tsx'),
  ]);

  assert.match(backlog, /task-list-grid/);
  assert.match(categories, /category-habit-card/);
  assert.match(categories, /task-list-grid/);
  assert.match(habits, /habit-list-grid/);
  assert.match(habitCard, /habit-card-header/);
});

test('mobile calendar offers compact day and week list controls', async () => {
  const [calendar, css] = await Promise.all([
    read('../components/MobileCalendar.tsx'),
    read('../components/MobileCalendar.css'),
  ]);

  assert.match(calendar, /useState<'timeline' \| 'list'>\('timeline'\)/);
  assert.match(calendar, /mc-display-toggle/);
  assert.match(calendar, /displayMode === 'list'/);
  assert.match(calendar, /mc-list/);
  assert.match(calendar, /preview && <div className="mc-hint"/);
  assert.match(calendar, /mc-toolbar[\s\S]*mc-precision[\s\S]*mc-navigation/);
  assert.match(css, /\.mc-toolbar\{[^}]*display:flex/);
  assert.match(css, /\.mc-list\{[^}]*overflow-y:auto/);
  assert.match(css, /\.mc-list-row\{[^}]*min-height:40px/);
});

test('bottom navigation is compact and keeps a safe touch target', async () => {
  const [navigation, css, app] = await Promise.all([
    read('../components/BottomNav.tsx'),
    read('../components/MobileUI.css'),
    read('../App.tsx'),
  ]);
  const mobile = css.slice(css.indexOf('@media (max-width: 767.98px)'));

  assert.match(navigation, /bottom-nav/);
  assert.match(navigation, /bottom-nav-item/);
  assert.match(navigation, /bottom-nav-icon/);
  assert.match(navigation, /bottom-nav-label/);
  assert.match(mobile, /\.bottom-nav\s*\{[^}]*padding-top:\s*4px;[^}]*env\(safe-area-inset-bottom\)/s);
  assert.match(mobile, /\.bottom-nav-item\s*\{[^}]*min-height:\s*40px;/s);
  assert.match(mobile, /\.category-create-button\s*\{[^}]*bottom:\s*calc\(60px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(app, /pb-\[calc\(50px\+env\(safe-area-inset-bottom\)\)\]/);
  assert.doesNotMatch(app, /pb-\[calc\(80px\+env\(safe-area-inset-bottom\)\)\]/);
});
