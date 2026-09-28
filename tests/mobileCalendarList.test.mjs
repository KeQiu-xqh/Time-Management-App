import test from 'node:test';
import assert from 'node:assert/strict';

const mobileList = await import('../components/mobileCalendarList.ts').catch(() => ({}));
const { calendarTasksForDate, calendarTaskGroups } = mobileList;

const task = (id, day, startTime) => ({
  id,
  title: id,
  isCompleted: false,
  doDate: day,
  startTime,
});

test('calendar day list keeps local-date tasks and sorts all-day before timed tasks', () => {
  assert.equal(typeof calendarTasksForDate, 'function');
  const selected = new Date(2026, 8, 29);
  const tasks = [
    task('late', new Date(2026, 8, 29), '18:00'),
    task('other-day', new Date(2026, 8, 30), '08:00'),
    task('all-day', new Date(2026, 8, 29)),
    task('early', new Date(2026, 8, 29), '08:30'),
  ];

  assert.deepEqual(calendarTasksForDate(tasks, selected).map(item => item.id), [
    'all-day',
    'early',
    'late',
  ]);
});

test('calendar week groups retain all requested dates including empty days', () => {
  assert.equal(typeof calendarTaskGroups, 'function');
  const days = [new Date(2026, 8, 28), new Date(2026, 8, 29), new Date(2026, 8, 30)];
  const groups = calendarTaskGroups([
    task('monday', new Date(2026, 8, 28), '09:00'),
    task('wednesday', new Date(2026, 8, 30)),
  ], days);

  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(group => group.tasks.map(item => item.id)), [
    ['monday'],
    [],
    ['wednesday'],
  ]);
});
