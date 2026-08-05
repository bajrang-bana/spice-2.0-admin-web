import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';

import { useSelector } from 'react-redux';
import { roleSelector, getUserSuiteAccessSelector } from '../../store/user/selectors';
import { HOME_PAGE_BY_ROLE } from '../../constants/route';
import { ReactComponent as AdminPortalLogo } from '../../assets/images/admin.svg';
import { ReactComponent as ReportingPortalLogo } from '../../assets/images/reports.svg';
import { ReactComponent as InsightsLogo } from '../../assets/images/insights.svg';
import { ReactComponent as CoachingLogo } from '../../assets/images/coaching.svg';

import APPCONSTANTS, { APP_TYPE_NAME } from '../../constants/appConstants';
import styles from './LandingPage.module.scss';
import { Link } from 'react-router-dom';
import { goToUrl } from '../../utils/routeUtil';
import Loader from '../../components/loader/Loader';
import localStorageServices from '../../global/localStorageServices';
import { clearSideMenu } from '../../store/common/actions';
import { clearAppType } from '../../store/user/actions';
import { SUPER_ADMIN, SUPER_USER } from '../../routes';
import { trackGoogleAnalyticsEvent } from '../../utils/analytics';
import { appEnv } from '../../config/env';
import { useHistoryCompat as useHistory } from '../../utils/routerCompat';

const { ADMIN, CFR, INSIGHTS, COACHING } = APPCONSTANTS.SUITE_ACCESS;

interface ISpiceSuite {
  id: number;
  name: string;
  icon: any;
  hasDomain: boolean;
  domainUrl?: string;
  suiteAccessName: string;
  disabled?: boolean;
}

/**
 * LandingPage component that displays available suites based on user access
 * @returns {React.ReactElement} The rendered LandingPage component
 */

const LandingPage = (): React.ReactElement => {
  const history = useHistory();
  const dispatch = useAppDispatch();
  const role = useSelector(roleSelector);
  const userSuiteAccess = useSelector(getUserSuiteAccessSelector);
  const [suites, setSuites] = useState<ISpiceSuite[]>([]);

  /**
   * Memoized value to spiceSuites with dependency on role
   */
  const spiceSuites: ISpiceSuite[] = useMemo(
    () => [
      {
        id: 1,
        name: 'Admin',
        icon: AdminPortalLogo,
        hasDomain: false,
        suiteAccessName: ADMIN,
        domainUrl: HOME_PAGE_BY_ROLE[role],
        disabled: false
      },
      {
        id: 2,
        name: 'Reports',
        icon: ReportingPortalLogo,
        hasDomain: true,
        suiteAccessName: CFR,
        domainUrl: appEnv.cfrWebUrl,
        disabled: false
      },
      {
        id: 3,
        name: 'Insights',
        icon: InsightsLogo,
        hasDomain: true,
        suiteAccessName: INSIGHTS,
        domainUrl: appEnv.insightWebUrl
      },
      {
        id: 4,
        name: 'Micro Coaching',
        icon: CoachingLogo,
        hasDomain: true,
        suiteAccessName: COACHING,
        domainUrl: appEnv.coachingWebUrl
      }
    ],
    [role]
  );

  /**
   * Filters and sets authorized suites, redirects if only one suite is available
   */
  useEffect(() => {
    const authorisedSuites: ISpiceSuite[] = spiceSuites.filter(
      (suite) =>
        suite.suiteAccessName === COACHING ||
        userSuiteAccess?.some(
          (access: string | string[]) => suite.suiteAccessName && access.includes(suite.suiteAccessName)
        )
    );
    if (authorisedSuites.length === 1) {
      const { hasDomain, domainUrl } = authorisedSuites[0];
      hasDomain ? goToUrl(domainUrl) : history.push(domainUrl);
    }
    setSuites(authorisedSuites);
  }, [history, userSuiteAccess, spiceSuites]);

  /**
   * To remove Region based details
   */
  useEffect(() => {
    dispatch(clearSideMenu());
    if ([SUPER_ADMIN, SUPER_USER].includes(role)) {
      dispatch(clearAppType());
      localStorageServices.deleteItem(APP_TYPE_NAME);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Tracks suite selection in Google Analytics
   * @param {ISpiceSuite} suite - The selected suite
   * @param {boolean} isExternalLink - Whether the suite opens in new tab
   */
  const trackSuiteSelection = (suite: ISpiceSuite) => {
    trackGoogleAnalyticsEvent('click_spice', 'landing_page', window.location.pathname, {
      suite_id: suite.id,
      suite_name: suite.name,
      user_role: role
    });
  };

  /**
   * Renders the content of a suite card with click tracking
   * @param {ISpiceSuite} data - The suite data to render
   * @returns {React.ReactNode} The rendered card content
   */
  const renderCardContent = (data: ISpiceSuite) => {
    const { name, icon: IconComponent } = data;

    const handleClick = () => {
      trackSuiteSelection(data);
    };

    return (
      <div onClick={handleClick}>
        <div className='row p-2'>
          <IconComponent className={styles.cardIcon} aria-labelledby={`${name} logo`} />
        </div>
        <div className={`row ${styles.reportCardText} pb-1`}>
          <p>{name}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`position-relative ${styles.landingPageContainer}`}>
      <div className='row justify-content-center'>
        {suites.length > 1 ? (
          suites.map((data) => (
            <div className={`card ${styles.customCard}`} key={`suite-${data.id}`}>
              {!data.hasDomain ? (
                <Link to={data.domainUrl} children={renderCardContent(data)} />
              ) : (
                <a href={data.domainUrl} target='_blank' rel='noreferrer' children={renderCardContent(data)} />
              )}
            </div>
          ))
        ) : (
          <Loader isFullScreen={false} isBackgroundTransparent={false} />
        )}
      </div>
    </div>
  );
};

export default LandingPage;
