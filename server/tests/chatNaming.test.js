const { test } = require('node:test');
const assert = require('node:assert');

const { pickConversationName } = require('../services/chatNaming.service');

test('1:1 threads show the other participant, not the stored name', () => {
  // Creator stored the recipient's name; the recipient must see the sender.
  assert.strictEqual(
    pickConversationName({ storedName: 'Asha Juma', peerNames: ['Juma Mwinyi'] }),
    'Juma Mwinyi'
  );
  // Sender side: stored name matches the peer.
  assert.strictEqual(
    pickConversationName({ storedName: 'Juma Mwinyi', peerNames: ['Juma Mwinyi'] }),
    'Juma Mwinyi'
  );
});

test('groups keep the stored name', () => {
  assert.strictEqual(
    pickConversationName({
      storedName: 'Kikundi cha Akiba',
      peerNames: ['Asha', 'Juma', 'Neema'],
    }),
    'Kikundi cha Akiba'
  );
});

test('groups without a name join the peers', () => {
  assert.strictEqual(
    pickConversationName({ peerNames: ['Asha', ' Juma ', ''] }),
    'Asha, Juma'
  );
});

test('missing peers fall back to the stored name then an empty string', () => {
  assert.strictEqual(pickConversationName({ storedName: 'Asha Juma', peerNames: [] }), 'Asha Juma');
  assert.strictEqual(pickConversationName({}), '');
});
