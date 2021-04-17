// NOTE: This is in the lib folder, no OneSignal specific code should be added here

import nock, { Interceptor } from "nock";

type NockResultFunction = (result: NockRequestResult) => void;

export interface NockRequest {
  body: any;
  url: string;
}

export interface NockResponse {
  status: number;
  body: any;
}

export interface NockRequestResult {
  request: NockRequest;
  response: NockResponse;
}

export interface NockScopeWithResultPromise {
  nockScope: nock.Scope;
  result: Promise<NockRequestResult>;
}

type NockInterceptMethods = "post" | "put" | "get";

interface NockOptions {
  reply: NockResponse;
  baseUrl: string;
  path: string;
  method: NockInterceptMethods;
}

export class NockHelper {
  /**
   * Provides an an interface to the nock library that allows awaiting on a response to get it's
   * request and response.
   * @param {NockOptions} options These map to nock's initialization as well as containing a reply you can set.
   * @return {NockScopeWithResultPromise} Provides an awaitable result to get the request and response of the nock.
   */
  static nockBase(options: NockOptions): NockScopeWithResultPromise {
    let requestBodyPromiseResolve: NockResultFunction;
    const requestBodyPromise = new Promise((resolve: NockResultFunction) => {
      requestBodyPromiseResolve = resolve;
    });

    const nockScopePostPlayer = nock(options.baseUrl);

    NockHelper.performInterceptFunction(nockScopePostPlayer, options.path, options.method)
      .reply(options.reply.status, (uri: string, requestBody: any) => {
        requestBodyPromiseResolve({
          request: {
            url: uri,
            body: JSON.parse(requestBody)
          },
          response: {
            status: options.reply.status,
            body: options.reply.body
          }
        });
        return options.reply.body;
      });

    return {
      nockScope: nockScopePostPlayer,
      result: requestBodyPromise
    };
  }

  private static performInterceptFunction(
    nockScope: nock.Scope,
    url: string,
    type: NockInterceptMethods
  ): Interceptor {
    switch(type) {
      case "post":
        return nockScope.post(url);
      case "put":
        return nockScope.put(url);
      case  "get":
        return nockScope.get(url);
    }
  }
}
