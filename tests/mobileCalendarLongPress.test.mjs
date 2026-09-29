import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('mobile calendar keeps touch gestures pending until long-press activation', async () => {
  const source = await read('../components/MobileCalendar.tsx');
  const begin = source.slice(source.indexOf('const begin ='), source.indexOf('const finish ='));

  assert.match(source, /LONG_PRESS_MS/);
  assert.match(source, /HAPTIC_MS/);
  assert.match(source, /requiresCalendarLongPress/);
  assert.match(source, /exceedsTouchSlop/);
  assert.match(source, /phase: 'pending' \| 'active' \| 'cancelled'/);
  assert.match(source, /window\.setTimeout\([\s\S]*LONG_PRESS_MS\)/);
  assert.match(source, /const activateGesture =/);
  assert.match(source, /activateGesture[\s\S]*setPointerCapture/);
  assert.match(source, /navigator\.vibrate\(HAPTIC_MS\)/);
  assert.match(source, /g\.phase === 'pending'[\s\S]*exceedsTouchSlop/);
  assert.match(source, /g\.phase !== 'active'/);
  assert.match(source, /e\.preventDefault\(\)/);
  assert.doesNotMatch(begin, /setPointerCapture/);
});

test('mobile calendar cancels gesture resources on cancellation and unmount', async () => {
  const source = await read('../components/MobileCalendar.tsx');

  assert.match(source, /clearLongPressTimer/);
  assert.match(source, /cancelAnimationFrame\(frame\.current\)/);
  assert.match(source, /onPointerDownCapture/);
  assert.match(source, /onPointerCancel=\{e => finish\(e, true\)\}/);
  assert.match(source, /onLostPointerCapture=\{e => finish\(e, true\)\}/);
});

test('task cards allow vertical scrolling before activation and explain long press', async () => {
  const [source, css] = await Promise.all([
    read('../components/MobileCalendar.tsx'),
    read('../components/MobileCalendar.css'),
  ]);

  assert.match(css, /\.mc-task\{[^}]*touch-action:pan-y/s);
  assert.match(css, /\.mc-resize\{[^}]*touch-action:pan-y/s);
  assert.match(css, /\.mc-active\{[^}]*touch-action:none;[^}]*transform:/s);
  assert.match(css, /\.mc-active \.mc-resize\{[^}]*touch-action:none/s);
  assert.match(css, /\.mc-active \.mc-resize i\{[^}]*background:/s);
  assert.match(source, /轻点查看，长按调整/);
  assert.match(source, /手机端长按任务后拖动改时间/);
});
