import OneSignalError from './OneSignalError';

describe('OneSignalError', () => {
  test('should be an instance of Error', () => {
    const error = new OneSignalError('test');
    expect(error).toBeInstanceOf(Error);

    expect(error.message).toBe('test');
    expect(error.name).toBe('OneSignalError');
    expect(error.stack).toBeDefined();
  });

  test('should be an instance of OneSignalError', () => {
    const error = new OneSignalError('test');
    expect(error).toBeInstanceOf(OneSignalError);
  });
});
