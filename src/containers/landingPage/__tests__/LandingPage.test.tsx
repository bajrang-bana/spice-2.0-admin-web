// LandingPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import '@testing-library/jest-dom';
import LandingPage from '../LandingPage';
import APPCONSTANTS, { APP_TYPE } from '../../../constants/appConstants';
import { goToUrl } from '../../../utils/routeUtil';
import { HOME_PAGE_BY_ROLE } from '../../../constants/route';
import { createMemoryHistory } from 'history';
import { HistoryRouter as Router } from '../../../tests/routerTestUtils';

// Mock react-leaflet and leaflet CSS to avoid ESM issues pulled via routes
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid='map-container'>{children}</div>,
  TileLayer: () => <div data-testid='tile-layer' />,
  Marker: ({ children }: any) => <div data-testid='marker'>{children}</div>,
  Popup: ({ children }: any) => <div data-testid='popup'>{children}</div>,
  useMap: () => ({ setView: jest.fn(), getCenter: () => ({ lat: 0, lng: 0 }) }),
  useMapEvent: jest.fn(),
  useMapEvents: jest.fn()
}));
jest.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock assets
jest.mock('../../../assets/images/admin.svg', () => ({
  ReactComponent: () => <div>AdminPortalLogo</div>
}));

jest.mock('../../../assets/images/reports.svg', () => ({
  ReactComponent: () => <div>ReportingPortalLogo</div>
}));

jest.mock('../../../assets/images/insights.svg', () => ({
  ReactComponent: () => <div>InsightsLogo</div>
}));

jest.mock('../../../assets/images/coaching.svg', () => ({
  ReactComponent: () => <div>CoachingLogo</div>
}));

// Mock route util
jest.mock('../../../utils/routeUtil', () => ({
  goToUrl: jest.fn()
}));

const mockStore = configureStore();
const initialState = {
  user: {
    user: {
      role: APPCONSTANTS.ROLES.SUPER_ADMIN,
      suiteAccess: [APPCONSTANTS.SUITE_ACCESS.ADMIN, APPCONSTANTS.SUITE_ACCESS.CFR],
      appTypes: [APP_TYPE.COMMUNITY],
      country: { id: 1, appTypes: [APP_TYPE.COMMUNITY] }
    }
  },
  common: {
    labelName: null
  },
  regionCom: {
    detail: {
      id: 1,
      tenantId: 1
    }
  }
};
describe('LandingPage', () => {
  let store: any;

  beforeAll(() => {
    process.env.REACT_APP_CFR_WEB_URL = 'http://localhost:8000';
  });

  beforeEach(() => {
    store = mockStore(initialState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the LandingPage component correctly with region details', async () => {
    const localStore = mockStore(initialState);
    const { getByText, unmount } = render(
      <Provider store={localStore}>
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      </Provider>
    );
    await waitFor(() => {
      expect(getByText('Admin')).toBeInTheDocument();
      expect(getByText('Reports')).toBeInTheDocument();
    });
    unmount();
  });

  it('should open a new tab for suites with domain', async () => {
    window.open = jest.fn();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </Provider>
    );
    const reportLink = await screen.findByText('Reports');
    // expect(reportLink.closest('a')).toHaveAttribute('href', process.env.REACT_APP_CFR_WEB_URL);
    expect(reportLink.closest('a')).toHaveAttribute('target', '_blank');
  });
  it('should render LandingPage correctly with CFR suite access and Coaching', async () => {
    const localStore = mockStore({
      user: {
        user: {
          ...initialState.user.user,
          suiteAccess: [APPCONSTANTS.SUITE_ACCESS.CFR]
        }
      },
      regionCom: {
        ...initialState.regionCom
      }
    });
    render(
      <Provider store={localStore}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </Provider>
    );
    expect(await screen.findByText('Reports')).toBeInTheDocument();
    expect(await screen.findByText('Micro Coaching')).toBeInTheDocument();
  });

  it('should render LandingPage correctly with Admin suite access and Coaching', async () => {
    const history = createMemoryHistory();
    const localStore = mockStore({
      user: {
        user: {
          ...initialState.user.user,
          suiteAccess: [APPCONSTANTS.SUITE_ACCESS.ADMIN]
        }
      },
      regionCom: {
        ...initialState.regionCom
      }
    });
    render(
      <Provider store={localStore}>
        <Router history={history}>
          <LandingPage />
        </Router>
      </Provider>
    );
    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(await screen.findByText('Micro Coaching')).toBeInTheDocument();
  });

  it('should render the LandingPage component correctly with community app type', async () => {
    const history = createMemoryHistory();
    const localStore = mockStore({
      user: {
        user: {
          ...initialState.user.user,
          suiteAccess: [APPCONSTANTS.SUITE_ACCESS.ADMIN, APPCONSTANTS.SUITE_ACCESS.CFR],
          appTypes: [APP_TYPE.COMMUNITY]
        }
      },
      regionCom: {
        ...initialState.regionCom
      }
    });
    render(
      <Provider store={localStore}>
        <Router history={history}>
          <LandingPage />
        </Router>
      </Provider>
    );
    const reportLink = await screen.findByText('Reports');
    expect(reportLink.closest('a')).toHaveAttribute('target', '_blank');
  });
});
