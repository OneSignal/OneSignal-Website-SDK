import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

type InterceptSpec = { origin: string; method: string; path: string };

export type UndiciRequest = {
  method: string;
  path: string;
  url: string;
  headers: Record<string, any>;
  body: any; // parsed JSON if possible, else string/undefined
};

export type UndiciResponse<T = any> = {
  status: number;
  body: T;
};

export type UndiciRequestResult<T = any> = {
  request: UndiciRequest;
  response: UndiciResponse<T>;
};

export type UndiciScopeWithResultPromise<T = any> = {
  isDone: () => boolean;
  result: Promise<UndiciRequestResult<T>>;
};

export function setupUndiciMocking() {
  const prev = getGlobalDispatcher();

  const mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);

  return {
    mockAgent,
    restore() {
      setGlobalDispatcher(prev);
    },
  };
}

async function readBodyToString(body: any): Promise<string | undefined> {
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return Buffer.from(body).toString("utf8");

  // @ts-ignore
  if (typeof body[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
  }

  // Fallback: best effort
  try {
    return String(body);
  } catch {
    return undefined;
  }
}

function tryParseJson(s?: string) {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export function undiciIntercept<TReplyBody = any>(
  mockAgent: any,
  spec: InterceptSpec,
  reply: { status: number; body: TReplyBody }
): UndiciScopeWithResultPromise<TReplyBody> {
  let done = false;

  let resolve!: (v: UndiciRequestResult<TReplyBody>) => void;
  let reject!: (e: any) => void;
  const result = new Promise<UndiciRequestResult<TReplyBody>>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  try {
    mockAgent
      .get(spec.origin)
      .intercept({ method: spec.method, path: spec.path })
      .reply(reply.status, async (req: any) => {
        try {
          done = true;

          const raw = await readBodyToString(req.body);
          const parsed = tryParseJson(raw);

          const request: UndiciRequest = {
            method: spec.method.toUpperCase(),
            path: spec.path,
            url: `${spec.origin}${spec.path}`,
            headers: req.headers ?? {},
            body: parsed,
          };

          const response: UndiciResponse<TReplyBody> = {
            status: reply.status,
            body: reply.body,
          };

          resolve({ request, response });
          return reply.body;
        } catch (e) {
          reject(e);
          return reply.body;
        }
      });
  } catch (e) {
    reject(e);
  }

  return {
    isDone: () => done,
    result,
  };
}
