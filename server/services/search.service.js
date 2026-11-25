const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeQuery = (value) => String(value || '').trim().slice(0, MAX_QUERY_LENGTH);

const isSearchable = (value) => normalizeQuery(value).length >= MIN_QUERY_LENGTH;

const buildPattern = (value) => new RegExp(escapeRegex(normalizeQuery(value)), 'i');

// Exact name matches rank above prefix matches, which rank above body hits.
const scoreMatch = (query, ...texts) => {
  const needle = normalizeQuery(query).toLowerCase();
  if (!needle) return 0;
  let best = 0;
  for (const text of texts) {
    const haystack = String(text || '').toLowerCase();
    if (!haystack) continue;
    if (haystack === needle) return 4;
    if (haystack.startsWith(needle)) best = Math.max(best, 3);
    else if (new RegExp(`\\b${escapeRegex(needle)}`).test(haystack)) best = Math.max(best, 2);
    else if (haystack.includes(needle)) best = Math.max(best, 1);
  }
  return best;
};

const rankResults = (items = [], query, { limit = 5, getText = (item) => item.name } = {}) => items
  .map((item) => ({ item, score: scoreMatch(query, getText(item)) }))
  .filter((row) => row.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, Math.max(1, limit))
  .map((row) => ({ ...row.item, _score: row.score }));

const parseTypes = (value, allowed = []) => {
  if (!value) return allowed;
  const wanted = String(value).split(',').map((part) => part.trim()).filter(Boolean);
  const selected = wanted.filter((part) => allowed.includes(part));
  return selected.length ? selected : allowed;
};

module.exports = {
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  escapeRegex,
  normalizeQuery,
  isSearchable,
  buildPattern,
  scoreMatch,
  rankResults,
  parseTypes,
};
