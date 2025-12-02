import {
  NockHelper,
  NockScopeWithResultPromise,
  NockResponse,
  NockRequestResult,
  NockRequest
} from "../lib/NockHelper";
import Random from "./Random";

interface PlayerPostResponseBody {
  success: boolean;
  id: string;
}

interface NockResponsePlayerPost extends NockResponse {
  status: number;
  body: PlayerPostResponseBody;
}

interface NockRequestResultPayerPost extends NockRequestResult {
  request: NockRequest;
  response: NockResponsePlayerPost;
}

export interface NockScopeWithResultPromisePlayerPost extends NockScopeWithResultPromise {
  result: Promise<NockRequestResultPayerPost>;
}

export class NockOneSignalHelper {
  static nockNotificationPut(notificationId?: string): NockScopeWithResultPromise {
    return NockHelper.nockBase({
      method: "put",
      baseUrl: "https://onesignal.com",
      path: `/api/v1/notifications/${notificationId}`,
      reply: {
        status: 200,
        body: { success: true }
      }
    });
  }

  static nockGetConfig(appId: string, body: any): NockScopeWithResultPromise {
    return NockHelper.nockBase({
      method: "get",
      baseUrl: "https://onesignal.com",
      path: `/api/v1/sync/${appId}/web`,
      reply: {
        status: 200,
        body: body
      }
    });
  }

  static nockNotificationConfirmedDelivery(notificationId?: string): NockScopeWithResultPromise {
    return NockHelper.nockBase({
      method: "put",
      baseUrl: "https://onesignal.com",
      path: `/api/v1/notifications/${notificationId}/report_received`,
      reply: {
        status: 200,
        body: { success: true }
      }
    });
  }

  /**
   * Call this before a /players POST REST API call to mock it out and capture it's request and response.
   * @returns {NockScopeWithResultPromisePlayerPost} This is a typed response where you can await for a
   *   playerId to be returned.
   */
  static nockPlayerPost(): NockScopeWithResultPromisePlayerPost {
    return NockHelper.nockBase({
      method: "post",
      baseUrl: "https://onesignal.com",
      path: "/api/v1/players",
      reply: {
        status: 200,
        body: { success : true, id: Random.getRandomUuid() }
      },
    });
  }

  /**
   * Call this before a /players PUT REST API call to mock it out and capture it's request and response.
   * @param {string} id The OneSignal playerId you are expecting to be updated.
   * @returns {NockScopeWithResultPromise} This is a typed response where you can await on.
   */
  static nockPlayerPut(id: string): NockScopeWithResultPromise {
    return NockHelper.nockBase({
      method: "put",
      baseUrl: "https://onesignal.com",
      path: `/api/v1/players/${id}`,
      reply: {
        status: 200,
        body: { success : true }
      },
    });
  }

  /**
   * Call this before a /players/{id}/on_session POST REST API call to mock it out and
   * capture it's request and response.
   * @param {string} id The OneSignal playerId you are expecting to be updated.
   * @param {string} returnId Optional playerId if you want to simulate onesignal.com giving you a new one.
   * @returns {NockScopeWithResultPromise} This is a typed response where you can await on.
   */
  static nockPlayerOnSession(id: string, returnId?: string): NockScopeWithResultPromise {
    return NockHelper.nockBase({
      method: "post",
      baseUrl: "https://onesignal.com",
      path: `/api/v1/players/${id}/on_session`,
      reply: {
        status: 200,
        body: { success : true, id: returnId }
      },
    });
  }

    /**
   * Call this before a /players/{id}/on_focus POST REST API call to mock it out and
   * capture it's request and response.
   * @param {string} id The OneSignal playerId you are expecting to be updated.
   * @returns {NockScopeWithResultPromise} This is a typed response where you can await on.
   */
  static nockPlayerOnFocus(id: string): NockScopeWithResultPromise {
    return NockHelper.nockBase({
      method: "post",
      baseUrl: "https://onesignal.com",
      path: `/api/v1/players/${id}/on_focus`,
      reply: {
        status: 200,
        body: { success : true }
      },
    });
  }
}
