const express = require('express');
const router = express.Router();

// Geoapify static maps + routing proxy. The API key stays on the server
// (`GEOAPIFY_API_KEY` in .env) and the app only receives rendered PNGs.

const IMAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const imageCache = new Map();

const apiKey = () => process.env.GEOAPIFY_API_KEY || '';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function numberParam(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function encodePolylineValue(value) {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

// Encoded polyline for Geoapify `geometry=polyline6:` (precision 1e6).
function encodePolyline(points, precision = 1e6) {
  let lastLat = 0;
  let lastLon = 0;
  let out = '';
  for (const [lon, lat] of points) {
    const latE = Math.round(lat * precision);
    const lonE = Math.round(lon * precision);
    out += encodePolylineValue(latE - lastLat) + encodePolylineValue(lonE - lastLon);
    lastLat = latE;
    lastLon = lonE;
  }
  return out;
}

function haversine(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pointAt(points, fraction) {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  const total = points.reduce(
    (sum, point, index) => (index === 0 ? 0 : sum + haversine(points[index - 1], point)),
    0
  );
  if (total === 0) return points[0];
  let target = total * clamp(fraction, 0, 1);
  for (let i = 1; i < points.length; i += 1) {
    const segment = haversine(points[i - 1], points[i]);
    if (target <= segment) {
      const ratio = segment === 0 ? 0 : target / segment;
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * ratio,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * ratio,
      ];
    }
    target -= segment;
  }
  return points[points.length - 1];
}

function splitAt(points, fraction) {
  if (points.length < 2) return { done: points, todo: points };
  const total = points.reduce(
    (sum, point, index) => (index === 0 ? 0 : sum + haversine(points[index - 1], point)),
    0
  );
  if (total === 0) return { done: points.slice(0, 1), todo: points };
  let target = total * clamp(fraction, 0, 1);
  const done = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const segment = haversine(points[i - 1], points[i]);
    if (target <= segment) {
      const ratio = segment === 0 ? 0 : target / segment;
      done.push([
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * ratio,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * ratio,
      ]);
      return { done, todo: [...done.slice(-1), ...points.slice(i)] };
    }
    done.push(points[i]);
    target -= segment;
  }
  return { done: points, todo: [points[points.length - 1]] };
}

async function fetchRoute(fromLat, fromLon, toLat, toLon) {
  const url =
    'https://api.geoapify.com/v1/routing' +
    `?waypoints=${fromLat},${fromLon}|${toLat},${toLon}` +
    `&mode=drive&apiKey=${encodeURIComponent(apiKey())}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geoapify routing failed: ${response.status}`);
  const data = await response.json();
  const feature = data.features && data.features[0];
  const raw = feature && feature.geometry && feature.geometry.coordinates;
  if (!raw) throw new Error('Geoapify routing returned no geometry');
  // LineString → [[lon, lat], ...]; MultiLineString → [[[lon, lat], ...], ...]
  const points = Array.isArray(raw[0][0]) ? raw.flat() : raw;
  return {
    points: points.map(([lon, lat]) => [Number(lon), Number(lat)]),
    distanceKm: feature.properties && feature.properties.distance
      ? feature.properties.distance / 1000
      : null,
    durationMin: feature.properties && feature.properties.time
      ? feature.properties.time / 60
      : null,
  };
}

async function fetchImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geoapify static map failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function cachedImage(cacheKey, loader) {
  const hit = imageCache.get(cacheKey);
  if (hit && Date.now() - hit.at < IMAGE_CACHE_TTL_MS) return hit.buffer;
  const buffer = await loader();
  if (imageCache.size >= 60) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(cacheKey, { at: Date.now(), buffer });
  return buffer;
}

function sendPng(res, buffer) {
  res.set('Cache-Control', 'public, max-age=600');
  res.type('image/png').send(buffer);
}

const notConfigured = (res) =>
  res.status(503).json({ configured: false, message: 'Ramani za Geoapify hazijasanidiwa' });

// GET /api/v1/maps/route-image?fromLat&fromLon&toLat&toLon&progress&width&height
router.get('/route-image', async (req, res) => {
  if (!apiKey()) return notConfigured(res);

  const fromLat = numberParam(req.query.fromLat, NaN);
  const fromLon = numberParam(req.query.fromLon, NaN);
  const toLat = numberParam(req.query.toLat, NaN);
  const toLon = numberParam(req.query.toLon, NaN);
  if ([fromLat, fromLon, toLat, toLon].some((v) => !Number.isFinite(v))) {
    return res.status(400).json({ message: 'Kuratibu si sahihi' });
  }

  const progress = clamp(numberParam(req.query.progress, 0), 0, 1);
  const width = Math.round(clamp(numberParam(req.query.width, 900), 320, 1280));
  const height = Math.round(clamp(numberParam(req.query.height, 520), 200, 800));
  const cacheKey = [fromLat, fromLon, toLat, toLon, progress.toFixed(2), width, height].join('|');

  try {
    const buffer = await cachedImage(cacheKey, async () => {
      let points = [
        [fromLon, fromLat],
        [toLon, toLat],
      ];
      try {
        const route = await fetchRoute(fromLat, fromLon, toLat, toLon);
        if (route.points.length >= 2) points = route.points;
      } catch (routeError) {
        // Fall back to a straight line so the map still renders.
        console.error('Geoapify route fallback:', routeError.message);
      }

      const { done, todo } = splitAt(points, progress);
      const truck = pointAt(points, progress);

      const geometry = [];
      if (done.length >= 2) {
        geometry.push(`polyline6:${encodePolyline(done)};linewidth:5;linecolor:#17652c`);
      }
      if (todo.length >= 2) {
        geometry.push(`polyline6:${encodePolyline(todo)};linewidth:4;linecolor:#9eaea6`);
      }

      const params = new URLSearchParams({
        style: 'osm-bright-smooth',
        width: String(width),
        height: String(height),
        format: 'png',
        apiKey: apiKey(),
        geometry: geometry.join('|'),
      });
      params.append('marker', `lonlat:${fromLon},${fromLat};color:#17652c;size:large`);
      params.append('marker', `lonlat:${toLon},${toLat};color:#f59e0b;size:large`);
      if (progress > 0 && progress < 1) {
        params.append('marker', `lonlat:${truck[0]},${truck[1]};color:#4a7cf7;size:small`);
      }

      return fetchImage(`https://maps.geoapify.com/v1/staticmap?${params.toString()}`);
    });
    return sendPng(res, buffer);
  } catch (error) {
    console.error('Geoapify route image error:', error.message);
    return res.status(502).json({ message: 'Imeshindwa kupata ramani' });
  }
});

// GET /api/v1/maps/nearby-image?lat&lon&width&height&zoom
router.get('/nearby-image', async (req, res) => {
  if (!apiKey()) return notConfigured(res);

  const lat = numberParam(req.query.lat, NaN);
  const lon = numberParam(req.query.lon, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ message: 'Kuratibu si sahihi' });
  }

  const width = Math.round(clamp(numberParam(req.query.width, 900), 320, 1280));
  const height = Math.round(clamp(numberParam(req.query.height, 400), 200, 800));
  const zoom = Math.round(clamp(numberParam(req.query.zoom, 9), 3, 18));
  const cacheKey = ['nearby', lat, lon, width, height, zoom].join('|');

  try {
    const buffer = await cachedImage(cacheKey, async () => {
      const params = new URLSearchParams({
        style: 'osm-bright-smooth',
        width: String(width),
        height: String(height),
        format: 'png',
        apiKey: apiKey(),
        center: `lonlat:${lon},${lat}`,
        zoom: String(zoom),
        marker: `lonlat:${lon},${lat};color:#4a7cf7;size:large`,
      });
      return fetchImage(`https://maps.geoapify.com/v1/staticmap?${params.toString()}`);
    });
    return sendPng(res, buffer);
  } catch (error) {
    console.error('Geoapify nearby image error:', error.message);
    return res.status(502).json({ message: 'Imeshindwa kupata ramani' });
  }
});

module.exports = router;
