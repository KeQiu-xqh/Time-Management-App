import test from 'node:test';
import assert from 'node:assert/strict';

const duration = await import('../components/taskDuration.ts').catch(() => ({
  parseEstimatedDuration: () => null,
  formatDurationInput: () => '',
  formatDurationHours: () => '',
}));

test('parses hour and minute duration input into integer minutes', () => {
  assert.equal(duration.parseEstimatedDuration('2h40min'), 160);
  assert.equal(duration.parseEstimatedDuration('2H 40MIN'), 160);
  assert.equal(duration.parseEstimatedDuration('2h'), 120);
  assert.equal(duration.parseEstimatedDuration('40min'), 40);
  assert.equal(duration.parseEstimatedDuration('160min'), 160);
  assert.equal(duration.parseEstimatedDuration('0h40min'), 40);
});

test('rejects empty, zero, fractional and malformed duration input', () => {
  for (const value of ['', '0min', '0h', '2h60min', '2.5h', '-30min', '2hours', 'min']) {
    assert.equal(duration.parseEstimatedDuration(value), null, value);
  }
});

test('formats stored minutes for editing with minute precision', () => {
  assert.equal(duration.formatDurationInput(160), '2h40min');
  assert.equal(duration.formatDurationInput(120), '2h');
  assert.equal(duration.formatDurationInput(40), '40min');
});

test('formats estimates as decimal hours with at most two decimals', () => {
  assert.equal(duration.formatDurationHours(160), '2.67h');
  assert.equal(duration.formatDurationHours(90), '1.5h');
  assert.equal(duration.formatDurationHours(120), '2h');
  assert.equal(duration.formatDurationHours(1), '0.02h');
});
