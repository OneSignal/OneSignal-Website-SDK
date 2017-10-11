import * as objectAssign from 'object-assign';
import { base64Encode } from '../utils/Encoding';
import Environment from '../Environment';

abstract class MetricEvent {
  abstract getEventName();
  getPropertiesAsJson() {
    /* Origin and URL are available from the service worker as well */
    return {
      origin: location.origin,
      url: location.href,
      sdkVersion: Environment.version()
    }
  }
}

export enum ApiUsageMetricKind {
  HttpPermissionRequest = 'HttpPermissionRequest'
}

export class ApiUsageMetricEvent extends MetricEvent {
  constructor(public apiName: ApiUsageMetricKind) {
    super();
  }

  getEventName() {
    return 'api-usage';
  }

  getPropertiesAsJson() {
    return objectAssign({}, {
      api: this.apiName.toString(),
    }, super.getPropertiesAsJson());
  }
}

export default class MetricsManager {
  private isFeatureEnabled: boolean;
  private mixpanelReportingToken: string;

  constructor(isFeatureEnabled: boolean, mixpanelReportingToken: string) {
    this.isFeatureEnabled = isFeatureEnabled;
    this.mixpanelReportingToken = mixpanelReportingToken;
  }

  static get MIXPANEL_REPORTING_URL() {
    return 'https://api.mixpanel.com';
  }

  isEnabled(): boolean {
    return this.isFeatureEnabled && !!this.mixpanelReportingToken;
  }

  reportEvent(event: MetricEvent) {
    if (!this.isEnabled()) {
      return Promise.resolve(null);
    }

    const queryParamsData = {
      event: event.getEventName(),
      properties: objectAssign({}, {
        token: this.mixpanelReportingToken,
      }, event.getPropertiesAsJson())
    };
    const queryParams = base64Encode(JSON.stringify(queryParamsData));

    const requestOptions = {
      method: 'GET',
      headers: new Headers(),
      cache: 'no-cache',
    };

    return fetch(`${MetricsManager.MIXPANEL_REPORTING_URL}/track/?data=${queryParams}`, requestOptions);
  }
}
