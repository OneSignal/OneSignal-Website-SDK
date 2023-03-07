test.stub = (obj: any, method: string, returnValue?: any) => {
  const stub = jest.spyOn(obj, method);
  stub.mockReturnValue(returnValue);
  return stub;
};

test.fail = (message?: string) => {
  throw new Error(message || 'Test failed');
}

test.nock = (responseBody: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    status,
    json: jest.fn().mockResolvedValue(responseBody),
  });
}

// workaround for open upstream issue: https://github.com/inrupt/solid-client-authn-js/issues/1676
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
