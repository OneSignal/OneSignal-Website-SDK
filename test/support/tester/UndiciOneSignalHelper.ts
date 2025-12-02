// test/support/tester/UndiciOneSignalHelper.ts
import Random from "./Random";
import { undiciIntercept, type UndiciScopeWithResultPromise } from "./UndiciHelper";

export class UndiciOneSignalHelper {
  static origin = "https://onesignal.com";

  static mockNotificationPut(mockAgent: any, notificationId?: string): UndiciScopeWithResultPromise<{ success: boolean }> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "PUT",
      path: `/api/v1/notifications/${notificationId}`,
    }, {
      status: 200,
      body: { success: true },
    });
  }

  static mockGetConfig(mockAgent: any, appId: string, body: any): UndiciScopeWithResultPromise<any> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "GET",
      path: `/api/v1/sync/${appId}/web`,
    }, {
      status: 200,
      body,
    });
  }

  static mockNotificationConfirmedDelivery(mockAgent: any, notificationId?: string): UndiciScopeWithResultPromise<{ success: boolean }> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "PUT",
      path: `/api/v1/notifications/${notificationId}/report_received`,
    }, {
      status: 200,
      body: { success: true },
    });
  }

  static mockPlayerPost(mockAgent: any): UndiciScopeWithResultPromise<{ success: boolean; id: string }> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "POST",
      path: `/api/v1/players`,
    }, {
      status: 200,
      body: { success: true, id: Random.getRandomUuid() },
    });
  }

  static mockPlayerPut(mockAgent: any, id: string): UndiciScopeWithResultPromise<{ success: boolean }> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "PUT",
      path: `/api/v1/players/${id}`,
    }, {
      status: 200,
      body: { success: true },
    });
  }

  static mockPlayerOnSession(mockAgent: any, id: string, returnId?: string): UndiciScopeWithResultPromise<{ success: boolean; id?: string }> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "POST",
      path: `/api/v1/players/${id}/on_session`,
    }, {
      status: 200,
      body: { success: true, id: returnId },
    });
  }

  static mockPlayerOnFocus(mockAgent: any, id: string): UndiciScopeWithResultPromise<{ success: boolean }> {
    return undiciIntercept(mockAgent, {
      origin: this.origin,
      method: "POST",
      path: `/api/v1/players/${id}/on_focus`,
    }, {
      status: 200,
      body: { success: true },
    });
  }
}
