// Each viewer should see the other participant's name in a 1:1 thread, not
// the name the creator stored when opening it.
const pickConversationName = ({ storedName = '', peerNames = [] } = {}) => {
  const names = (peerNames || [])
    .map((name) => String(name || '').trim())
    .filter(Boolean);

  if (names.length === 1) return names[0];

  const stored = String(storedName || '').trim();
  if (stored) return stored;

  return names.join(', ');
};

module.exports = { pickConversationName };
