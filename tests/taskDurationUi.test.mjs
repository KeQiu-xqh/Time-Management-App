import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('task form accepts and persists an optional estimated duration', async () => {
  const [types, form] = await Promise.all([
    read('../types.ts'),
    read('../components/AddTaskModal.tsx'),
  ]);

  assert.match(types, /estimatedDuration\?: number/);
  assert.match(form, /aria-label="预估时长"/);
  assert.match(form, /placeholder="例如：2h40min"/);
  assert.match(form, /data\.estimatedDuration\s*=\s*estimatedDuration/);
  assert.match(form, /预估时长格式应为/);
});

test('default and compact task cards display estimates as decimal hours', async () => {
  const { TaskCard } = await import('../components/TaskCard.tsx');
  const task = { id: 'estimate', title: '准备报告', isCompleted: false, estimatedDuration: 160 };
  const props = { task, onToggle: () => {} };

  const regular = renderToStaticMarkup(React.createElement(TaskCard, props));
  const compact = renderToStaticMarkup(React.createElement(TaskCard, { ...props, variant: 'compact' }));
  assert.match(regular, /预估 2\.67h/);
  assert.match(compact, /预估 2\.67h/);
});

test('desktop backlog and mobile detail include estimated duration', async () => {
  const [calendar, mobile] = await Promise.all([
    read('../components/CalendarView.tsx'),
    read('../components/MobileCalendar.tsx'),
  ]);

  assert.match(calendar, /formatDurationHours\(task\.estimatedDuration\)/);
  assert.match(mobile, /formatDurationHours\(detail\.estimatedDuration\)/);
});
