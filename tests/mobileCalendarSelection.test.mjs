import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('mobile calendar requires first-tap selection before touch dragging', async () => {
  const source = await read('../components/MobileCalendar.tsx');

  assert.match(source, /useState<string \| null>\(null\)/);
  assert.match(source, /canStartTaskGesture\(e\.pointerType, selectedTaskId, task\.id\)/);
  assert.match(source, /setSelectedTaskId\(task\.id\)/);
  assert.match(source, /已选中，可拖动调整时间/);
  assert.match(source, /aria-pressed=\{selectedTaskId === task\.id\}/);
  assert.match(source, /selected \? 'mc-selected' : ''/);
  assert.match(source, /dragging \? 'mc-active' : ''/);
});

test('second tap opens details and selection clears at navigation boundaries', async () => {
  const source = await read('../components/MobileCalendar.tsx');

  assert.match(source, /if \(!g\.moved\) \{[\s\S]*setSelectedTaskId\(null\);[\s\S]*setDetail\(g\.task\)/);
  assert.match(source, /closest\('\[data-task-id\]'\)[\s\S]*setSelectedTaskId\(null\)/);
  assert.match(source, /const changeMode =/);
  assert.match(source, /const changeDisplayMode =/);
  assert.match(source, /const navigate = [\s\S]*setSelectedTaskId\(null\)/);
  assert.match(source, /tasks\.some\(task => task\.id === selectedTaskId/);
});

test('obsolete long-press activation is completely removed', async () => {
  const source = await read('../components/MobileCalendar.tsx');

  for (const obsolete of [
    'LONG_PRESS_MS', 'HAPTIC_MS', 'requiresCalendarLongPress', 'exceedsTouchSlop',
    'longPressTimer', 'activateGesture', 'navigator.vibrate', "phase: 'pending'",
    '长按任务后拖动',
  ]) {
    assert.doesNotMatch(source, new RegExp(obsolete.replace('.', '\\.')));
  }
});

test('gesture cancellation and desktop direct manipulation remain available', async () => {
  const source = await read('../components/MobileCalendar.tsx');

  assert.match(source, /setPointerCapture\(e\.pointerId\)/);
  assert.match(source, /cancelAnimationFrame\(frame\.current\)/);
  assert.match(source, /onPointerCancel=\{e => finish\(e, true\)\}/);
  assert.match(source, /onLostPointerCapture=\{e => finish\(e, true\)\}/);
  assert.match(source, /轻点选中，再次轻点查看；选中后可拖动调整/);
});

test('selected tasks intercept touch while unselected tasks remain scrollable', async () => {
  const css = await read('../components/MobileCalendar.css');

  assert.match(css, /\.mc-task\{[^}]*touch-action:pan-y/s);
  assert.match(css, /\.mc-selected\{[^}]*touch-action:none;[^}]*box-shadow:/s);
  assert.match(css, /\.mc-resize\{[^}]*pointer-events:none;[^}]*opacity:/s);
  assert.match(css, /\.mc-selected \.mc-resize\{[^}]*pointer-events:auto;[^}]*touch-action:none;[^}]*opacity:1/s);
  assert.match(css, /\.mc-active\{[^}]*transform:/s);
  assert.match(css, /@media\(hover:hover\) and \(pointer:fine\)\{\.mc-resize\{[^}]*pointer-events:auto;[^}]*opacity:1/s);
});
