const clampInt = (value, { fallback, min = 1, max }) => {
  const parsed = Number.parseInt(value, 10);
  const number = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, number));
};

// Page/limit come straight from the URL, so clamp both: an unbounded `limit`
// turns a list endpoint into a memory and database amplifier.
const pagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = clampInt(query.page, { fallback: 1, min: 1, max: 10000 });
  const limit = clampInt(query.limit, { fallback: defaultLimit, min: 1, max: maxLimit });
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { clampInt, pagination };
