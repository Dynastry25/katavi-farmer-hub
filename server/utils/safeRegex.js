const MAX_SEARCH_LENGTH = 80;

// Escape every regex metacharacter so a search term can only match literally.
// Unescaped input allows wildcard matches and catastrophic backtracking.
const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchTerm = (value, maxLength = MAX_SEARCH_LENGTH) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

// Case-insensitive "contains" filter for Mongo queries.
const searchRegex = (value, { maxLength = MAX_SEARCH_LENGTH } = {}) => {
  const term = searchTerm(value, maxLength);
  if (!term) return null;
  return { $regex: escapeRegex(term), $options: 'i' };
};

// Case-insensitive exact match.
const literalRegex = (value, { maxLength = MAX_SEARCH_LENGTH } = {}) => {
  const term = searchTerm(value, maxLength);
  if (!term) return null;
  return new RegExp(`^${escapeRegex(term)}$`, 'i');
};

module.exports = { escapeRegex, searchRegex, literalRegex, searchTerm, MAX_SEARCH_LENGTH };
