const { test } = require('node:test');
const assert = require('node:assert');
const {
  MAX_EVIDENCE,
  MAX_ATTACHMENTS_PER_REQUEST,
  isEvidenceUrl,
  normalizeEvidence,
  remainingEvidenceSlots,
} = require('../services/dispute.service');

test('normalizeEvidence keeps valid photos and documents', () => {
  const rows = normalizeEvidence([
    'https://res.cloudinary.com/katavi/lot.jpg',
    { url: '/uploads/receipt.pdf', kind: 'document', note: 'Risiti ya malipo' },
  ], { addedBy: 'user-1' });

  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].url, 'https://res.cloudinary.com/katavi/lot.jpg');
  assert.strictEqual(rows[0].kind, 'photo');
  assert.strictEqual(rows[0].addedBy, 'user-1');
  assert.strictEqual(rows[1].kind, 'document');
  assert.strictEqual(rows[1].note, 'Risiti ya malipo');
  assert.ok(rows[0].addedAt instanceof Date);
});

test('normalizeEvidence drops unusable urls and caps one request', () => {
  const urls = Array.from({ length: 8 }, (_, index) => `https://example.com/${index}.jpg`);
  const rows = normalizeEvidence([...urls, 'javascript:alert(1)', 'not-a-url', 42]);
  assert.strictEqual(rows.length, MAX_ATTACHMENTS_PER_REQUEST);
  assert.ok(rows.every((row) => row.url.startsWith('https://example.com/')));
});

test('normalizeEvidence accepts a single url and applies the note', () => {
  const rows = normalizeEvidence('https://example.com/lot.jpg', { note: 'Mfuko ulioharibika' });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].note, 'Mfuko ulioharibika');
});

test('normalizeEvidence ignores empty input', () => {
  assert.deepStrictEqual(normalizeEvidence(null), []);
  assert.deepStrictEqual(normalizeEvidence([]), []);
  assert.deepStrictEqual(normalizeEvidence(['']), []);
});

test('remainingEvidenceSlots stops at the per-order cap', () => {
  assert.strictEqual(remainingEvidenceSlots([]), MAX_EVIDENCE);
  assert.strictEqual(remainingEvidenceSlots(new Array(3).fill({})), MAX_EVIDENCE - 3);
  assert.strictEqual(remainingEvidenceSlots(new Array(MAX_EVIDENCE + 2).fill({})), 0);
});

test('isEvidenceUrl only accepts http(s) urls and server paths', () => {
  assert.strictEqual(isEvidenceUrl('https://example.com/a.jpg'), true);
  assert.strictEqual(isEvidenceUrl('http://example.com/a.jpg'), true);
  assert.strictEqual(isEvidenceUrl('/uploads/a.jpg'), true);
  assert.strictEqual(isEvidenceUrl('ftp://example.com/a.jpg'), false);
  assert.strictEqual(isEvidenceUrl('data:image/png;base64,AAAA'), false);
  assert.strictEqual(isEvidenceUrl('short'), false);
  assert.strictEqual(isEvidenceUrl(null), false);
});
