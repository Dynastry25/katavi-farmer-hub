const fs = require('fs');
const path = require('path');

const ROUTE_RE = /router\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/gi;
const ROLES_RE = /requireRole\(([^)]*)\)/g;
const PERMISSION_RE = /requirePermission\(\s*(['"`])([^'"`]+)\1/g;
const MOUNT_RE = /app\.use\(\s*'([^']+)'\s*,[\s\S]*?require\('\.\/routes\/([^']+)'\)/g;
const BODY_METHODS = new Set(['post', 'put', 'patch']);
const PARAM_RE = /:([A-Za-z0-9_]+)/g;

const quotedValues = (text) => [...text.matchAll(/(['"`])([^'"`]+)\1/g)].map((match) => match[2]);

// Each declaration is read together with the text up to the next declaration,
// so multi-line handlers and their guards are attributed to the right route.
const extractRoutes = (source = '') => {
  const matches = [...source.matchAll(ROUTE_RE)];
  return matches.map((match, index) => {
    const chunk = source.slice(match.index, matches[index + 1]?.index ?? source.length);
    const roles = [...chunk.matchAll(ROLES_RE)].flatMap((guard) => quotedValues(guard[1]));
    const permission = [...chunk.matchAll(PERMISSION_RE)][0]?.[2] || '';
    const secured = Boolean(roles.length || permission) || /\bauth\b/.test(chunk);
    return {
      method: match[1].toLowerCase(),
      path: match[3],
      secured,
      roles: [...new Set(roles)],
      permission,
    };
  });
};

// Mount prefixes come from index.js so renames of either side stay in sync.
const extractMounts = (indexSource = '') => {
  const mounts = {};
  for (const match of indexSource.matchAll(MOUNT_RE)) {
    mounts[match[2]] = match[1].replace(/\/$/, '');
  }
  return mounts;
};

const tagFor = (name) => name.replace(/([a-z])([A-Z])/g, '$1 $2');

const pathParameters = (routePath) => [...routePath.matchAll(PARAM_RE)].map((match) => ({
  name: match[1],
  in: 'path',
  required: true,
  schema: { type: 'string' },
}));

const operationFor = (route) => {
  const secured = route.secured || Boolean(route.roles?.length) || Boolean(route.permission);
  const parameters = pathParameters(route.path);
  const responses = { 200: { description: 'Mafanikio' } };
  if (secured) {
    responses[401] = { description: 'Tokeni haipo au si sahihi' };
    responses[403] = { description: 'Huna ruhusa ya kitendo hiki' };
  }
  responses[500] = { description: 'Hitilafu ya seva' };

  const operation = {
    summary: route.path === '/' ? 'Orodha / kitendo cha mzizi' : route.path,
    responses,
  };
  if (secured) operation.security = [{ bearerAuth: [] }];
  if (route.roles?.length) operation['x-roles'] = route.roles;
  if (route.permission) operation['x-permission'] = route.permission;
  if (parameters.length) operation.parameters = parameters;
  if (BODY_METHODS.has(route.method)) {
    operation.requestBody = {
      required: false,
      content: { 'application/json': { schema: { type: 'object' } } },
    };
  }
  return operation;
};

// Builds an OpenAPI 3.0 document from parsed route files plus their mounts.
const buildOpenApi = ({ modules = [], mounts = {}, info = {} } = {}) => {
  const paths = {};
  const tags = [];
  const served = [];

  for (const module of [...modules].sort((a, b) => a.name.localeCompare(b.name))) {
    const mount = mounts[module.name];
    if (!mount) continue;
    const tag = tagFor(module.name);
    tags.push({ name: tag });
    for (const route of module.routes) {
      const fullPath = route.path === '/' ? mount : `${mount}${route.path}`;
      if (!paths[fullPath]) paths[fullPath] = {};
      paths[fullPath][route.method] = { tags: [tag], ...operationFor(route) };
      served.push(`${route.method.toUpperCase()} ${fullPath}`);
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: info.title || 'Katavi E-Kilimo API',
      version: info.version || '1.0.0',
      description: info.description || 'API ya jukwaa la kilimo la Katavi (Express, /api/v1).',
    },
    servers: [{ url: info.server || '/' }],
    tags: tags.sort((a, b) => a.name.localeCompare(b.name)),
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
};

const readModules = (routesDir) => fs.readdirSync(routesDir)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => ({
    name: path.basename(file, '.js'),
    routes: extractRoutes(fs.readFileSync(path.join(routesDir, file), 'utf8')),
  }));

let cachedSpec = null;

// Reads the route files once; the API surface only changes on redeploy.
const getOpenApiSpec = (serverDir = path.join(__dirname, '..')) => {
  if (cachedSpec) return cachedSpec;
  const indexSource = fs.readFileSync(path.join(serverDir, 'index.js'), 'utf8');
  cachedSpec = buildOpenApi({
    modules: readModules(path.join(serverDir, 'routes')),
    mounts: extractMounts(indexSource),
  });
  return cachedSpec;
};

module.exports = {
  extractRoutes,
  extractMounts,
  buildOpenApi,
  getOpenApiSpec,
};
