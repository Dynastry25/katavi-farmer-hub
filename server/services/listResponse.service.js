const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 20;

const parsePage = (query = {}, fallbackLimit) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || fallbackLimit || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit };
};

// The single list envelope used by every endpoint. `total` always reflects the
// full set the endpoint produced, even when only one page is returned.
const buildListEnvelope = (items = [], query = {}) => {
  const total = items.length;
  const { page, limit } = parsePage(query, total || DEFAULT_LIMIT);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    hasMore: start + limit < total,
  };
};

// Adds the shared metadata to endpoints that already return `{ items, total }`.
const addListMeta = (envelope = {}, { limit } = {}) => {
  const total = Number(envelope.total) || (Array.isArray(envelope.items) ? envelope.items.length : 0);
  const page = Math.max(Number(envelope.page) || 1, 1);
  const size = Math.min(Math.max(Number(limit) || Number(envelope.limit) || total || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return {
    ...envelope,
    total,
    page,
    limit: size,
    pages: Math.max(1, Math.ceil(total / size)),
    hasMore: page * size < total,
  };
};

const wantsEnvelope = (req) => (
  String(req.get?.('x-list-format') || '').toLowerCase() === 'envelope'
  || String(req.query?.format || '').toLowerCase() === 'envelope'
);

// Opt-in wrapper: legacy clients keep receiving bare arrays, while new clients
// (Flutter 2.0 services) ask for the envelope with `X-List-Format: envelope`.
const listEnvelope = (req, res, next) => {
  if (!wantsEnvelope(req)) return next();
  const json = res.json.bind(res);
  res.json = (body) => (Array.isArray(body) ? json(buildListEnvelope(body, req.query)) : json(body));
  next();
};

module.exports = {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  parsePage,
  buildListEnvelope,
  addListMeta,
  wantsEnvelope,
  listEnvelope,
};
