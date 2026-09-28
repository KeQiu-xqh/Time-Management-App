import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function moduleURL(path) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
  }).outputText.replace(/from ['"]([^'"]+)['"]/g, (_, name) =>
    `from '${name.startsWith('.') ? moduleURL('../components/calendarGesture.ts') : import.meta.resolve(name)}'`);
  return `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
}
const { HabitCard } = await import(moduleURL('../components/HabitCard.tsx'));

test('month habit cells use local dates instead of the preceding UTC date', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'Asia/Shanghai';
  try {
    const html = renderToStaticMarkup(React.createElement(HabitCard, {
      habit: { id: 'h', title: '阅读', streak: 0, completedDates: ['2026-09-26'] },
      viewMode: 'month', viewDate: new Date(2026, 8, 26), onToggle() {},
    }));
    assert.ok(!html.includes('2026-08-31打卡'), 'September must not contain an August date');
    assert.match(html, /aria-label="阅读 2026-09-26打卡" aria-pressed="true"[^>]*>26<\/button>/);
    assert.ok(html.includes('2026-09-30打卡'));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
