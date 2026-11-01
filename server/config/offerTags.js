// Offer badge keys from the reference `BURE | MKOPO | BEI JUU | MPYA` labels.
const OFFER_TAGS = ['free', 'loan', 'price_up', 'new'];

// Unknown or empty values clear the badge instead of storing free text.
const normalizeOfferTag = (value) => {
  const tag = String(value ?? '').trim().toLowerCase();
  return OFFER_TAGS.includes(tag) ? tag : '';
};

module.exports = { OFFER_TAGS, normalizeOfferTag };
