import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('new tasks start without an execution date', async () => {
  const form = await read('../components/AddTaskModal.tsx');
  const resetForm = form.slice(form.indexOf('const resetForm'), form.indexOf('const doDateObj'));

  assert.match(resetForm, /setDoDateStr\(''\)/);
  assert.doesNotMatch(resetForm, /setDoDateStr\(formatDateToLocal\(new Date\(\)\)\)/);
});

test('category creation and editing expose the same complete palette', async () => {
  const categories = await read('../components/CategoriesView.tsx');
  const completePaletteUses = categories.match(/CATEGORY_COLORS\.map\(/g) ?? [];

  assert.doesNotMatch(categories, /CATEGORY_COLORS\.slice\(0,\s*5\)/);
  assert.equal(completePaletteUses.length, 2);
  assert.match(categories, /category-color-palette[^"']*flex-wrap/);
});
