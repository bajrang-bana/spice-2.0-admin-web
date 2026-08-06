import { appEnv } from '../env';

describe('appEnv.routePrefix', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns empty string when REACT_APP_ROUTE_PREFIX is not set', () => {
    delete process.env.REACT_APP_ROUTE_PREFIX;
    delete process.env.PUBLIC_URL;
    expect(appEnv.routePrefix).toBe('');
  });

  test('formats route prefix with leading slash and without trailing slash', () => {
    process.env.REACT_APP_ROUTE_PREFIX = 'spice-admin/';
    expect(appEnv.routePrefix).toBe('/spice-admin');

    process.env.REACT_APP_ROUTE_PREFIX = '/medtronic-ui';
    expect(appEnv.routePrefix).toBe('/medtronic-ui');
  });

  test('returns empty string when prefix is slash', () => {
    process.env.REACT_APP_ROUTE_PREFIX = '/';
    expect(appEnv.routePrefix).toBe('');
  });
});
