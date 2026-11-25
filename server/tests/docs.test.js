const { test } = require('node:test');
const assert = require('node:assert');
const {
  extractRoutes,
  extractMounts,
  buildOpenApi,
  getOpenApiSpec,
} = require('../services/docs.service');

test('extractRoutes reads methods, paths and their guards', () => {
  const source = `
router.get('/', (req, res) => res.json([]));
router.post('/crops', auth, (req, res) => {});
router.patch('/crops/:id', auth, requireRole('farmer', 'admin'), (req, res) => {});
router.delete(
  '/crops/:id/photo',
  auth,
  requirePermission('content.manage'),
  (req, res) => {},
);
`;

  const routes = extractRoutes(source);
  assert.strictEqual(routes.length, 4);
  assert.deepStrictEqual(routes.map((route) => `${route.method} ${route.path}`), [
    'get /',
    'post /crops',
    'patch /crops/:id',
    'delete /crops/:id/photo',
  ]);
  assert.strictEqual(routes[0].secured, false);
  assert.strictEqual(routes[1].secured, true);
  assert.deepStrictEqual(routes[2].roles, ['farmer', 'admin']);
  assert.strictEqual(routes[3].permission, 'content.manage');
});

test('extractMounts follows index.js app.use prefixes through rate limiters', () => {
  const mounts = extractMounts(`
app.use('/api/v1/auth', authLimiter, require('./routes/auth'));
app.use('/api/v1/insurance/', require('./routes/insurance'));
app.use('/api/v1/warehouse-bookings', require('./routes/warehouseBookings'));
app.use('/api', generalLimiter);
`);

  assert.deepStrictEqual(mounts, {
    auth: '/api/v1/auth',
    insurance: '/api/v1/insurance',
    warehouseBookings: '/api/v1/warehouse-bookings',
  });
});

test('buildOpenApi joins mounts, declares path parameters and security', () => {
  const spec = buildOpenApi({
    modules: [
      { name: 'crops', routes: extractRoutes(`
router.get('/:id', auth, (req, res) => {});
router.post('/', auth, (req, res) => {});
router.get('/public', (req, res) => {});
`) },
      { name: 'notMounted', routes: extractRoutes("router.get('/', (req, res) => {});") },
    ],
    mounts: { crops: '/api/v1/crops' },
  });

  assert.strictEqual(spec.openapi, '3.0.3');
  assert.deepStrictEqual(spec.tags, [{ name: 'crops' }]);
  assert.deepStrictEqual(Object.keys(spec.paths).sort(), [
    '/api/v1/crops',
    '/api/v1/crops/:id',
    '/api/v1/crops/public',
  ]);

  const detail = spec.paths['/api/v1/crops/:id'].get;
  assert.deepStrictEqual(detail.security, [{ bearerAuth: [] }]);
  assert.deepStrictEqual(detail.parameters, [
    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
  ]);

  assert.strictEqual(spec.paths['/api/v1/crops/public'].get.security, undefined);
  assert.ok(spec.paths['/api/v1/crops'].post.requestBody);
  assert.strictEqual(spec.paths['/api/v1/crops/public'].get.requestBody, undefined);
});

test('getOpenApiSpec documents the real router tree', () => {
  const spec = getOpenApiSpec();
  assert.ok(spec.paths['/api/v1/earnings/summary'].get);
  assert.ok(spec.paths['/api/v1/kyc/requests'].post);
  assert.ok(spec.paths['/api/v1/docs'].get);
  assert.ok(Object.keys(spec.paths).length > 200);
  assert.strictEqual(spec.components.securitySchemes.bearerAuth.scheme, 'bearer');
});
