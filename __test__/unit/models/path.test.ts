import Path from '../../../src/shared/models/Path';

describe('Path tests', () => {
  test('should include query string in full path', () => {
    const path = new Path(
      'https://site.com/web-folder/service-worker.js?appId=12345',
    );
    expect(path.getFullPath()).toBe(
      'https://site.com/web-folder/service-worker.js?appId=12345',
    );
  });
  test(`should include query string in path with query`, () => {
    const path = new Path(
      'https://site.com/web-folder/service-worker.js?appId=12345',
    );
    expect(path.getFileNameWithQuery()).toBe('service-worker.js?appId=12345');
  });

  test(`should not include query string in path filename`, () => {
    const path = new Path(
      'https://site.com/web-folder/service-worker.js?appId=12345',
    );
    expect(path.getFileName()).toBe('service-worker.js');
  });
});
