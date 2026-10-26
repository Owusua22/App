const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const FALLBACK_ASSET_SCHEMAS = [
  'icon',
  'notification.icon',
  'splash.image',
  'ios.splash.image',
  'ios.splash.tabletImage',
  'android.splash.image',
  'android.splash.mdpi',
  'android.splash.hdpi',
  'android.splash.xhdpi',
  'android.splash.xxhdpi',
  'android.splash.xxxhdpi',
  'android.adaptiveIcon.foregroundImage',
  'android.adaptiveIcon.backgroundImage',
];

function getNestedField(obj, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function setNestedField(obj, dottedPath, value) {
  const parts = dottedPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cur[key] || typeof cur[key] !== 'object') {
      cur[key] = {};
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function normalizeServeStaticAssetUrl(projectRoot, rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const url = rawUrl.replace(/\/assets\/\.\//g, '/assets/');
  if (url.startsWith('/assets/') && !url.includes('unstable_path=')) {
    const qIdx = url.indexOf('?');
    const pathname = qIdx >= 0 ? url.slice(0, qIdx) : url;
    const search = qIdx >= 0 ? url.slice(qIdx) : '';
    const relFromRoot = decodeURIComponent(pathname.replace(/^\/assets\//, ''));
    const directCandidate = path.resolve(projectRoot, relFromRoot);
    if (!fs.existsSync(directCandidate)) {
      const assetsSubdirCandidate = path.resolve(projectRoot, 'assets', relFromRoot);
      if (fs.existsSync(assetsSubdirCandidate)) {
        return `/assets/assets/${relFromRoot}${search}`;
      }
    }
  }
  return url;
}

function resolveLocalAssetToUrl(projectRoot, origin, pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return undefined;
  const cleaned = pathOrUrl.replace(/\/assets\/\.\//g, '/assets/').replace(/^assets\/\.\//, 'assets/');
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const u = new URL(cleaned);
      u.pathname = normalizeServeStaticAssetUrl(projectRoot, u.pathname);
      return u.toString();
    } catch (_) {
      return cleaned;
    }
  }
  const normalizedRel = cleaned.replace(/^assets\/(?=assets\/)/, '');
  const fullPath = path.resolve(projectRoot, normalizedRel);
  const subPath = path
    .relative(projectRoot, fullPath)
    .split(path.sep)
    .join('/');
  return `${origin}/assets/${subPath}`;
}

function patchExpoCliManifestAssets() {
  const candidates = [
    path.join(__dirname, 'node_modules/expo/node_modules/@expo/cli'),
    path.join(__dirname, 'node_modules/@expo/cli'),
  ];

  for (const cliRoot of candidates) {
    try {
      const serveStaticMod = require(path.join(
        cliRoot,
        'build/src/start/server/middleware/ServeStaticMiddleware'
      ));
      const ServeStaticProto = serveStaticMod?.ServeStaticMiddleware?.prototype;
      if (ServeStaticProto && typeof ServeStaticProto.getHandler === 'function' && !ServeStaticProto.__frankoPatched) {
        const origGetHandler = ServeStaticProto.getHandler;
        ServeStaticProto.getHandler = function () {
          const handler = origGetHandler.call(this);
          const rootDir = this.projectRoot || __dirname;
          return (req, res, next) => {
            if (req && typeof req.url === 'string') {
              req.url = normalizeServeStaticAssetUrl(rootDir, req.url);
            }
            return handler(req, res, next);
          };
        };
        ServeStaticProto.__frankoPatched = true;
      }
    } catch (_) {
      // Ignore if ServeStaticMiddleware path is not present
    }

    try {
      const resolveAssetsMod = require(path.join(
        cliRoot,
        'build/src/start/server/middleware/resolveAssets'
      ));
      const manifestMiddlewareMod = require(path.join(
        cliRoot,
        'build/src/start/server/middleware/ManifestMiddleware'
      ));
      const Proto = manifestMiddlewareMod?.ManifestMiddleware?.prototype;
      if (Proto && typeof Proto.mutateManifestWithAssetsAsync === 'function' && !Proto.__frankoPatched) {
        Proto.mutateManifestWithAssetsAsync = async function (manifest, bundleUrl) {
          const rootDir = this.projectRoot || __dirname;
          const origin = new URL(bundleUrl).origin;

          for (const field of FALLBACK_ASSET_SCHEMAS) {
            const val = getNestedField(manifest, field);
            if (val && typeof val === 'string') {
              const resolvedUrl = resolveLocalAssetToUrl(rootDir, origin, val);
              if (resolvedUrl) {
                setNestedField(manifest, `${field}Url`, resolvedUrl);
              }
            }
          }

          if (Array.isArray(manifest.plugins)) {
            for (const plugin of manifest.plugins) {
              if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen' && plugin[1] && typeof plugin[1] === 'object') {
                if (plugin[1].image) {
                  plugin[1].imageUrl = resolveLocalAssetToUrl(rootDir, origin, plugin[1].image);
                }
              }
            }
          }

          if (resolveAssetsMod && typeof resolveAssetsMod.resolveGoogleServicesFile === 'function') {
            await resolveAssetsMod.resolveGoogleServicesFile(rootDir, manifest);
          }
        };
        Proto.__frankoPatched = true;
      }
    } catch (_) {
      // Ignore if ManifestMiddleware path is not present
    }
  }
}

patchExpoCliManifestAssets();

const config = getDefaultConfig(__dirname);

const prevEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, metroServer) => {
    const baseMiddleware = prevEnhanceMiddleware
      ? prevEnhanceMiddleware(metroMiddleware, metroServer)
      : metroMiddleware;

    return (req, res, next) => {
      if (req && typeof req.url === 'string') {
        req.url = normalizeServeStaticAssetUrl(__dirname, req.url);
      }
      return baseMiddleware(req, res, next);
    };
  },
};

module.exports = config;
