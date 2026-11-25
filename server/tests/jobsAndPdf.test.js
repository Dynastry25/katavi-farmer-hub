const test = require('node:test');
const assert = require('node:assert/strict');
const {
  escapePdfText,
  wrapLines,
  buildPdf,
} = require('../services/pdf.service');
const {
  nextAttemptDelay,
  canRetry,
  summarizeJobs,
} = require('../services/jobQueue.service');

test('PDF text is escaped and wrapped to the page width', () => {
  assert.equal(escapePdfText('Bei (TZS) \\ 5'), 'Bei \\(TZS\\) \\\\ 5');
  const wrapped = wrapLines('mazao ya mahindi na mpunga katika wilaya ya katavi', 20);
  assert.ok(wrapped.length > 1);
  assert.ok(wrapped.every((line) => line.length <= 20));
});

test('buildPdf produces a valid header, xref and multi-page count', () => {
  const lines = Array.from({ length: 60 }, (_, i) => `Mstari wa ${i + 1}`);
  const pdf = buildPdf({ title: 'Ripoti ya Mapato', lines });
  const text = pdf.toString('ascii');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.includes('/Type /Catalog'));
  assert.ok(text.includes('/Count 2'));
  assert.ok(text.includes('Ripoti ya Mapato'));
  assert.ok(text.includes('xref'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
});

test('job retries back off exponentially up to one hour', () => {
  assert.equal(nextAttemptDelay(1), 60000);
  assert.equal(nextAttemptDelay(2), 120000);
  assert.equal(nextAttemptDelay(3), 240000);
  assert.equal(nextAttemptDelay(20), 3600000);
});

test('canRetry respects the attempt ceiling and summarize counts statuses', () => {
  assert.equal(canRetry({ attempts: 2, maxAttempts: 3 }), true);
  assert.equal(canRetry({ attempts: 3, maxAttempts: 3 }), false);
  assert.deepEqual(
    summarizeJobs([
      { status: 'queued' }, { status: 'queued' }, { status: 'failed' }, { status: 'completed' },
    ]),
    { queued: 2, running: 0, completed: 1, failed: 1, total: 4 },
  );
});
