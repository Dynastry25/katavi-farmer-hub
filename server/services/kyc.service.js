const { DOCUMENT_TYPES, REQUESTED_ROLES } = require('../models/VerificationRequest');

const DOCUMENT_LABELS = {
  national_id: 'Kitambulisho cha NIDA',
  business_license: 'Leseni ya biashara',
  business_registration: 'Cheti cha usajili wa biashara',
  tin: 'Namba ya TIN',
  drivers_license: 'Leseni ya udereva',
  vehicle_registration: 'Kadi ya usajili wa gari',
  vehicle_insurance: 'Bima ya gari',
  professional_certificate: 'Cheti cha taaluma',
  warehouse_license: 'Leseni ya ghala',
  other: 'Nyaraka nyingine',
};

const ROLE_LABELS = {
  farmer: 'Mkulima',
  buyer: 'Mnunuzi',
  seller: 'Muuzaji wa pembejeo',
  logistics: 'Msafirishaji',
  expert: 'Mtaalamu wa kilimo',
  warehouse: 'Mmiliki wa ghala',
};

const ROLE_REQUIREMENTS = {
  farmer: {
    documents: [{ type: 'national_id', label: DOCUMENT_LABELS.national_id }],
    details: [
      { key: 'farmLocation', label: 'Eneo la shamba', type: 'text' },
      { key: 'farmSize', label: 'Ukubwa wa shamba', type: 'text' },
    ],
  },
  buyer: {
    documents: [
      { type: 'business_license', label: DOCUMENT_LABELS.business_license },
      { type: 'tin', label: DOCUMENT_LABELS.tin },
    ],
    details: [
      { key: 'businessName', label: 'Jina la biashara', type: 'text' },
      { key: 'businessLocation', label: 'Eneo la biashara', type: 'text' },
    ],
  },
  seller: {
    documents: [
      { type: 'business_license', label: DOCUMENT_LABELS.business_license },
      { type: 'tin', label: DOCUMENT_LABELS.tin },
    ],
    details: [
      { key: 'businessName', label: 'Jina la duka au kampuni', type: 'text' },
      { key: 'businessLocation', label: 'Eneo la duka', type: 'text' },
    ],
  },
  logistics: {
    documents: [
      { type: 'drivers_license', label: DOCUMENT_LABELS.drivers_license },
      { type: 'vehicle_registration', label: DOCUMENT_LABELS.vehicle_registration },
    ],
    details: [
      { key: 'vehiclePlate', label: 'Namba ya gari', type: 'text' },
      { key: 'vehicleType', label: 'Aina ya gari', type: 'text' },
      { key: 'capacityKg', label: 'Uwezo wa kubeba (kg)', type: 'number' },
    ],
  },
  expert: {
    documents: [{ type: 'professional_certificate', label: DOCUMENT_LABELS.professional_certificate }],
    details: [
      { key: 'qualifications', label: 'Sifa za kitaaluma', type: 'text' },
      { key: 'yearsExperience', label: 'Miaka ya uzoefu', type: 'number' },
    ],
  },
  warehouse: {
    documents: [{ type: 'warehouse_license', label: DOCUMENT_LABELS.warehouse_license }],
    details: [
      { key: 'warehouseName', label: 'Jina la ghala', type: 'text' },
      { key: 'warehouseLocation', label: 'Eneo la ghala', type: 'text' },
      { key: 'capacityBags', label: 'Uwezo wa kuhifadhi (magunia)', type: 'number' },
    ],
  },
};

const REQUEST_TRANSITIONS = {
  submitted: ['under_review', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected'],
  approved: ['suspended'],
  rejected: [],
  suspended: ['approved', 'rejected'],
  cancelled: [],
};

const canTransitionRequest = (from, to) =>
  Boolean(REQUEST_TRANSITIONS[from]?.includes(to));

const isHttpUrl = (value) => {
  const text = String(value || '');
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const url = new URL(text);
    return Boolean(url.hostname);
  } catch (e) {
    return false;
  }
};

// Only known document types with a real uploaded file are stored; previews
// and blanks are dropped so reviewers never see placeholder rows.
const normalizeDocuments = (documents) => {
  const byType = {};
  for (const doc of Array.isArray(documents) ? documents : []) {
    const type = String(doc?.type || '');
    if (!DOCUMENT_TYPES.includes(type)) continue;
    const fileUrl = String(doc?.fileUrl || '').trim();
    if (!isHttpUrl(fileUrl)) continue;
    byType[type] = {
      type,
      number: String(doc?.number || '').trim().slice(0, 80),
      fileUrl: fileUrl.slice(0, 500),
      issuedAt: doc.issuedAt ? new Date(doc.issuedAt) : null,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
    };
  }
  return Object.values(byType).slice(0, 6);
};

const detailsForRole = (role, details = {}) => {
  const config = ROLE_REQUIREMENTS[role];
  if (!config) return {};
  const out = {};
  for (const field of config.details) {
    const raw = details?.[field.key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (field.type === 'number') {
      const numeric = Number(raw);
      if (Number.isFinite(numeric) && numeric >= 0) out[field.key] = numeric;
    } else {
      out[field.key] = String(raw).trim().slice(0, 200);
    }
  }
  return out;
};

// Human-readable gaps for the submit screen and the staff approval gate.
const missingRequirements = ({ requestedRole, documents = [], details = {} }) => {
  const config = ROLE_REQUIREMENTS[requestedRole];
  if (!config) return ['Jukumu ulilotaka si sahihi'];

  const missing = [];
  const present = new Set(
    normalizeDocuments(documents).map((doc) => doc.type),
  );
  for (const doc of config.documents) {
    if (!present.has(doc.type)) missing.push(doc.label);
  }
  for (const field of config.details) {
    const value = details?.[field.key];
    const filled = field.type === 'number'
      ? Number.isFinite(Number(value)) && Number(value) >= 0 && value !== '' && value !== null
      : String(value || '').trim().length > 0;
    if (!filled) missing.push(field.label);
  }
  return missing;
};

const requirementsForRole = (role) => {
  const config = ROLE_REQUIREMENTS[role];
  if (!config) return null;
  return {
    role,
    label: ROLE_LABELS[role],
    documents: config.documents,
    details: config.details,
  };
};

const requirementsCatalog = () => REQUESTED_ROLES
  .map((role) => requirementsForRole(role))
  .filter(Boolean);

module.exports = {
  DOCUMENT_LABELS,
  ROLE_LABELS,
  ROLE_REQUIREMENTS,
  REQUEST_TRANSITIONS,
  REQUESTED_ROLES,
  canTransitionRequest,
  isHttpUrl,
  normalizeDocuments,
  detailsForRole,
  missingRequirements,
  requirementsForRole,
  requirementsCatalog,
};
