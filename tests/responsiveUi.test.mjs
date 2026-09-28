import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('desktop modal keeps its header visible and scrolls its body inside the viewport', async () => {
  const css = await read('../components/MobileUI.css');
  const desktopRules = css.slice(0, css.indexOf('@media (max-width: 767.98px)'));

  assert.match(desktopRules, /\.app-modal-shell\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*max-height:\s*calc\(100dvh - 32px\);/s);
  assert.match(desktopRules, /\.app-modal-header\s*\{[^}]*flex-shrink:\s*0;/s);
  assert.match(desktopRules, /\.app-modal-body\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s);
});

test('desktop week list fits all seven days without a forced horizontal canvas', async () => {
  const [calendar, taskCard] = await Promise.all([
    read('../components/CalendarView.tsx'),
    read('../components/TaskCard.tsx'),
  ]);

  assert.doesNotMatch(calendar, /min-w-\[800px\]/);
  assert.match(calendar, /week-list-grid[^"']*grid-cols-7/);
  assert.match(taskCard, /week-list-card[^"']*min-w-0/);
  assert.doesNotMatch(calendar, /week-list-scroll[^"']*overflow-x-auto/);
});
