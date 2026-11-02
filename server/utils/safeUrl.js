const dns = require('node:dns').promises;
const net = require('node:net');

const PRIVATE_V4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const ipv4ToInt = (ip) =>
  ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;

const isPrivateV4 = (ip) => {
  const value = ipv4ToInt(ip);
  return PRIVATE_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
};

const isPrivateIp = (address) => {
  if (!address) return true;
  if (net.isIPv4(address)) return isPrivateV4(address);

  const ip = address.toLowerCase();
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return true;
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice('::ffff:'.length);
    return net.isIPv4(mapped) ? isPrivateV4(mapped) : true;
  }
  return false;
};

// Only public http(s) URLs may be fetched server-side. Without this a caller can
// point the server at localhost, the private network or the cloud metadata
// service and read the response through the AI proxy.
const assertPublicUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch {
    throw new Error('URL si sahihi');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL si sahihi');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL si sahihi');
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('URL si sahihi');
  }

  let addresses;
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    addresses = records.map((record) => record.address);
  }
  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error('URL si sahihi');
  }
  return parsed;
};

const readBodyLimited = async (response, maxBytes) => {
  if (!response.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error('Faili ni kubwa mno');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

// Fetch a remote resource with redirects validated at every hop and a hard size
// cap, so a hostile URL cannot be used to exhaust memory or reach internals.
const fetchPublicBuffer = async (rawUrl, { maxBytes = 5 * 1024 * 1024, timeoutMs = 8000 } = {}) => {
  let current = String(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= 3; hop += 1) {
      const url = await assertPublicUrl(current);
      const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new Error('URL si sahihi');
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) {
        throw new Error(`Imeshindwa kupakua picha: HTTP ${response.status}`);
      }
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw new Error('Faili ni kubwa mno');
      }
      const buffer = await readBodyLimited(response, maxBytes);
      return {
        buffer,
        contentType: response.headers.get('content-type') || 'application/octet-stream',
        finalUrl: url.toString(),
      };
    }
    throw new Error('URL si sahihi');
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { assertPublicUrl, fetchPublicBuffer, isPrivateIp };
