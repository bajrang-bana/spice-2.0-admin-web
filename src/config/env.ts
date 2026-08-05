type NodeEnv = 'development' | 'production' | 'test';

const readEnv = (key: string): string | undefined => {
  if (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__[key] !== undefined) {
    return __APP_ENV__[key];
  }

  if (typeof process !== 'undefined') {
    return process.env[key];
  }

  return undefined;
};

const readNumericEnv = (key: string, fallback: number): number => {
  const value = Number(readEnv(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const isLocalHostname = (hostname?: string): boolean => hostname === 'localhost' || hostname === '127.0.0.1';

const parseUrl = (value?: string): URL | undefined => {
  if (!value || !URL.canParse(value)) {
    return undefined;
  }

  return new URL(value);
};

const isLocalBackend = (baseUrl?: string): boolean => {
  const parsed = parseUrl(baseUrl);

  if (!parsed) {
    return false;
  }

  return isLocalHostname(parsed.hostname);
};

const shouldUseProxyBaseUrl = (baseUrl?: string): boolean => {
  if (globalThis.window === undefined || !isLocalHostname(globalThis.window.location.hostname)) {
    return false;
  }

  return isLocalBackend(baseUrl);
};

export const appEnv = {
  get nodeEnv(): NodeEnv {
    const nodeEnv = readEnv('NODE_ENV');
    return nodeEnv === 'production' || nodeEnv === 'test' ? nodeEnv : 'development';
  },
  get publicUrl(): string {
    return readEnv('PUBLIC_URL') || '';
  },
  get baseUrl(): string | undefined {
    return readEnv('REACT_APP_BASE_URL');
  },
  get apiBaseUrl(): string | undefined {
    // Proxy only for local backends. Remote URLs must be called directly so
    // session cookies are set/sent for that domain (avoids local profile 401).
    if (isLocalBackend(this.baseUrl) || shouldUseProxyBaseUrl(this.baseUrl)) {
      return '/';
    }

    return this.baseUrl;
  },
  get cfrWebUrl(): string | undefined {
    return readEnv('REACT_APP_CFR_WEB_URL');
  },
  get insightWebUrl(): string | undefined {
    return readEnv('REACT_APP_INSIGHT_WEB_URL');
  },
  get coachingWebUrl(): string | undefined {
    return readEnv('REACT_APP_COACHING_WEB_URL');
  },
  get passwordHashKey(): string | undefined {
    return readEnv('REACT_APP_PASSWORD_HASH_KEY');
  },
  get cryptrSecretKey(): string | undefined {
    return readEnv('REACT_APP_CRYPTR_SECRET_KEY');
  },
  get googleAnalyticsTrackingId(): string | undefined {
    return readEnv('REACT_APP_GA_TRACKING_ID');
  },
  get organizationSuccessDelayTime(): number {
    return readNumericEnv('REACT_APP_ORG_SUCCESS_DELAY_TIME', 1000);
  },
};
