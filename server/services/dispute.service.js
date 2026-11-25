const MAX_EVIDENCE = 10;
const MAX_ATTACHMENTS_PER_REQUEST = 5;
const EVIDENCE_KINDS = ['photo', 'document'];

const isEvidenceUrl = (value) => (
  typeof value === 'string' &&
  value.trim().length >= 8 &&
  value.trim().length <= 500 &&
  /^(https?:\/\/|\/)/i.test(value.trim())
);

// Accepts either a bare URL or `{ url, kind, note }` rows, drops anything that
// is not a usable attachment, and caps a single request so one party cannot
// flood a case.
const normalizeEvidence = (input, { addedBy = null, kind = 'photo', note = '' } = {}) => {
  const rows = Array.isArray(input) ? input : input ? [input] : [];
  return rows.slice(0, MAX_ATTACHMENTS_PER_REQUEST).map((row) => {
    const url = typeof row === 'string' ? row : row?.url;
    if (!isEvidenceUrl(url)) return null;
    const rowKind = typeof row === 'object' && EVIDENCE_KINDS.includes(row?.kind)
      ? row.kind
      : (EVIDENCE_KINDS.includes(kind) ? kind : 'photo');
    return {
      url: url.trim(),
      kind: rowKind,
      note: String((typeof row === 'object' && row?.note) || note || '').slice(0, 200),
      addedBy,
      addedAt: new Date(),
    };
  }).filter(Boolean);
};

const remainingEvidenceSlots = (evidence = []) => (
  Math.max(0, MAX_EVIDENCE - (Array.isArray(evidence) ? evidence.length : 0))
);

module.exports = {
  MAX_EVIDENCE,
  MAX_ATTACHMENTS_PER_REQUEST,
  EVIDENCE_KINDS,
  isEvidenceUrl,
  normalizeEvidence,
  remainingEvidenceSlots,
};
