const { test } = require('node:test');
const assert = require('node:assert');
const {
  canTransitionRequest,
  requirementsCatalog,
  missingRequirements,
  detailsForRole,
  normalizeDocuments,
} = require('../services/kyc.service');

test('every requested role declares the documents and details the UI must ask for', () => {
  const catalog = requirementsCatalog();
  assert.strictEqual(catalog.length, 6);
  for (const role of catalog) {
    assert.ok(role.label);
    assert.ok(role.documents.length > 0);
    assert.ok(role.documents.every((doc) => doc.type && doc.label));
    assert.ok(role.details.length > 0);
    assert.ok(role.details.every((field) => field.key && field.label));
  }
});

test('missingRequirements lists every gap, including unuploaded documents', () => {
  const missing = missingRequirements({
    requestedRole: 'farmer',
    documents: [{ type: 'national_id', fileUrl: 'not-a-url' }],
    details: {},
  });
  assert.strictEqual(missing.length, 3);

  const complete = missingRequirements({
    requestedRole: 'farmer',
    documents: [{ type: 'national_id', fileUrl: 'https://res.cloudinary.com/kyc/id.jpg' }],
    details: { farmLocation: 'Mpanda', farmSize: '3 ekari' },
  });
  assert.deepStrictEqual(complete, []);
});

test('missingRequirements treats zero as a real value for numeric fields', () => {
  const result = missingRequirements({
    requestedRole: 'expert',
    documents: [{ type: 'professional_certificate', fileUrl: 'https://example.com/cert.pdf' }],
    details: { qualifications: 'BSc Agronomy', yearsExperience: 0 },
  });
  assert.deepStrictEqual(result, []);
});

test('normalizeDocuments keeps valid uploads only and removes duplicates', () => {
  const docs = normalizeDocuments([
    { type: 'tin', fileUrl: 'https://example.com/tin.pdf', number: ' 123-456 ' },
    { type: 'tin', fileUrl: 'https://example.com/tin-2.pdf' },
    { type: 'unknown_type', fileUrl: 'https://example.com/x.pdf' },
    { type: 'national_id', fileUrl: 'javascript:alert(1)' },
  ]);
  assert.strictEqual(docs.length, 1);
  assert.strictEqual(docs[0].fileUrl, 'https://example.com/tin-2.pdf');
});

test('detailsForRole keeps only the role fields and coerces numbers', () => {
  const details = detailsForRole('logistics', {
    vehiclePlate: '  T123 ABC ',
    vehicleType: 'Canter',
    capacityKg: '3500',
    unknownKey: 'drop me',
  });
  assert.deepStrictEqual(details, {
    vehiclePlate: 'T123 ABC',
    vehicleType: 'Canter',
    capacityKg: 3500,
  });
});

test('request transitions follow the review workflow', () => {
  assert.strictEqual(canTransitionRequest('submitted', 'under_review'), true);
  assert.strictEqual(canTransitionRequest('under_review', 'approved'), true);
  assert.strictEqual(canTransitionRequest('approved', 'suspended'), true);
  assert.strictEqual(canTransitionRequest('suspended', 'approved'), true);

  assert.strictEqual(canTransitionRequest('submitted', 'approved'), false);
  assert.strictEqual(canTransitionRequest('approved', 'under_review'), false);
  assert.strictEqual(canTransitionRequest('cancelled', 'submitted'), false);
  assert.strictEqual(canTransitionRequest('unknown', 'approved'), false);
});
