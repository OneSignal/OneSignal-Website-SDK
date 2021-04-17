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
}
