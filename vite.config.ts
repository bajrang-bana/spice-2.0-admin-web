import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import svgr from '@svgr/rollup';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

const buildClientEnv = (mode: string) => {
  const loadedEnv = loadEnv(mode, process.cwd(), '');
  const mergedEnv = { ...loadedEnv, ...process.env };

  return Object.entries(mergedEnv).reduce<Record<string, string>>((env, [key, value]) => {
    if (typeof value === 'string' && (key === 'NODE_ENV' || key === 'PUBLIC_URL' || key.startsWith('REACT_APP_'))) {
      env[key] = value;
    }

    return env;
  }, {});
};

const getHttpsConfig = () => {
  if (process.env.HTTPS !== 'true') {
    return false;
  }

  if (process.env.SSL_CRT_FILE && process.env.SSL_KEY_FILE) {
    return {
      cert: fs.readFileSync(path.resolve(process.cwd(), process.env.SSL_CRT_FILE)),
      key: fs.readFileSync(path.resolve(process.cwd(), process.env.SSL_KEY_FILE)),
    };
  }

  return true;
};

const localServicePorts: Record<string, number> = {
  '/admin-service': 8086,
  '/auth-service': 8089,
  '/cql-service': 8094,
  '/fhir-mapper': 8092,
  '/fhir-server': 8091,
  '/notification-service': 8084,
  '/offline-service': 8093,
  '/spice-service': 8087,
  '/user-service': 8085,
};

const normalizeProxyTarget = (target: string) => {
  const normalizedTarget = new URL(target);

  // Node-based proxies often resolve localhost to ::1 first, which breaks when the local
  // gateway or service only binds IPv4. Keep browser URLs unchanged and normalize only here.
  if (normalizedTarget.hostname === 'localhost') {
    normalizedTarget.hostname = '127.0.0.1';
  }

  return normalizedTarget.toString();
};

const buildLocalComposeProxies = (target: string): Record<string, ProxyOptions> | undefined => {
  const targetUrl = new URL(target);
  const isLocalHost = targetUrl.hostname === 'localhost' || targetUrl.hostname === '127.0.0.1';
  const hasCustomPort = targetUrl.port !== '';
  const hasCustomPath = targetUrl.pathname !== '' && targetUrl.pathname !== '/';

  if (!isLocalHost || hasCustomPort || hasCustomPath) {
    return undefined;
  }

  return Object.entries(localServicePorts).reduce<Record<string, ProxyOptions>>((proxies, [prefix, port]) => {
    proxies[prefix] = {
      target: `${targetUrl.protocol}//127.0.0.1:${port}`,
      changeOrigin: true,
      secure: false,
      rewrite: (requestPath) => requestPath.startsWith(prefix) ? requestPath.slice(prefix.length) || '/' : requestPath,
    };

    return proxies;
  }, {});
};

const isLocalBackendTarget = (target?: string): boolean => {
  if (!target) {
    return true;
  }

  try {
    const { hostname } = new URL(target);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const buildServiceProxies = (target?: string) => {
  if (!target) {
    return undefined;
  }

  const localComposeProxies = buildLocalComposeProxies(target);

  if (localComposeProxies) {
    return localComposeProxies;
  }

  const proxyConfig: ProxyOptions = {
    target: normalizeProxyTarget(target),
    changeOrigin: true,
    secure: false,
    configure: (proxy) => {
      proxy.on('proxyRes', (proxyRes) => {
        const setCookieHeaders = proxyRes.headers['set-cookie'];
        if (setCookieHeaders) {
          proxyRes.headers['set-cookie'] = setCookieHeaders.map((cookie) =>
            cookie.replace(/Domain=[^;]+;?/i, '')
          );
        }
      });
    },
  };

  return {
    '/auth-service': proxyConfig,
    '/user-service': proxyConfig,
    '/spice-service': proxyConfig,
    '/admin-service': proxyConfig,
    '/offline-service': proxyConfig,
    '/notification-service': proxyConfig,
    '/fhir-mapper': proxyConfig,
    '/fhir-server': proxyConfig,
    '/cql-service': proxyConfig,
  };
};

const getManualChunkName = (id: string) => {
  const normalizedId = id.split(path.sep).join('/');

  if (normalizedId.includes('/node_modules/')) {
    if (
      normalizedId.includes('/node_modules/react/') ||
      normalizedId.includes('/node_modules/react-dom/') ||
      normalizedId.includes('/node_modules/scheduler/')
    ) {
      return 'react-core';
    }

    if (
      normalizedId.includes('/node_modules/react-redux/') ||
      normalizedId.includes('/node_modules/redux/') ||
      normalizedId.includes('/node_modules/redux-saga/') ||
      normalizedId.includes('/node_modules/@reduxjs/toolkit/') ||
      normalizedId.includes('/node_modules/reselect/') ||
      normalizedId.includes('/node_modules/typed-redux-saga/')
    ) {
      return 'state-management';
    }

    if (
      normalizedId.includes('/node_modules/history/') ||
      normalizedId.includes('/node_modules/react-router/') ||
      normalizedId.includes('/node_modules/react-router-dom/')
    ) {
      return 'routing';
    }
  }

  if (normalizedId.includes('/src/services/')) {
    return 'api';
  }

  if (normalizedId.includes('/src/store/user/')) {
    return 'store-user';
  }

  if (
    normalizedId.includes('/src/store/region/') ||
    normalizedId.includes('/src/store/district/') ||
    normalizedId.includes('/src/store/chiefdom/') ||
    normalizedId.includes('/src/store/healthFacility/') ||
    normalizedId.includes('/src/store/branch/')
  ) {
    return 'store-location';
  }

  if (
    normalizedId.includes('/src/store/common/') ||
    normalizedId.includes('/src/store/labTest/') ||
    normalizedId.includes('/src/store/medication/') ||
    normalizedId.includes('/src/store/program/') ||
    normalizedId.includes('/src/store/workflow/')
  ) {
    return 'store-workflow';
  }

  if (normalizedId.includes('/src/store/')) {
    return 'store';
  }

  if (
    normalizedId.includes('/src/global/') ||
    normalizedId.includes('/src/config/') ||
    normalizedId.includes('/src/constants/')
  ) {
    return 'runtime';
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
  const clientEnv = buildClientEnv(mode);
  const host = process.env.HOST || '0.0.0.0';
  const port = Number(process.env.PORT || 3000);
  const buildPath = process.env.BUILD_PATH || 'build';
  const serviceProxy = buildServiceProxies(clientEnv.REACT_APP_BASE_URL || process.env.REACT_APP_BASE_URL);
  const rawRoutePrefix = clientEnv.REACT_APP_ROUTE_PREFIX || process.env.REACT_APP_ROUTE_PREFIX || '';
  const routePrefix = rawRoutePrefix && rawRoutePrefix !== '/'
    ? (rawRoutePrefix.startsWith('/') ? rawRoutePrefix : `/${rawRoutePrefix}`).replace(/\/+$/, '')
    : '';
  const base = routePrefix ? `${routePrefix}/` : '/';

  return {
    base,
    plugins: [
      react(),
      svgr({
        exportType: 'named',
        namedExport: 'ReactComponent',
        svgo: false,
      }),
    ],
    define: {
      __APP_ENV__: JSON.stringify({
        NODE_ENV: mode,
        PUBLIC_URL: clientEnv.PUBLIC_URL || '',
        ...clientEnv,
      }),
    },
    envPrefix: ['VITE_', 'REACT_APP_'],
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
        },
      },
    },
    resolve: {
      alias: [
        {
          find: /^lottie-web$/,
          replacement: 'lottie-web/build/player/esm/lottie_light.min.js',
        },
      ],
    },
    server: {
      host,
      port,
      https: getHttpsConfig(),
      proxy: serviceProxy,
    },
    preview: {
      host,
      port,
      https: getHttpsConfig(),
      proxy: serviceProxy,
    },
    build: {
      outDir: buildPath,
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rolldownOptions: {
        output: {
          manualChunks: getManualChunkName,
        },
      },
    },
  };
});
