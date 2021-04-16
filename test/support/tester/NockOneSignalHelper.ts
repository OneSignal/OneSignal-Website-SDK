import { NockHelper, NockScopeWithResultPromise } from "../lib/NockHelper";
import Random from "./Random";

export class NockOneSignalHelper {
  static nockPlayerPost(): NockScopeWithResultPromise {
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
