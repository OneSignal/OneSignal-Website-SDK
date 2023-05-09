import Path from "../../../src/shared/models/Path";

describe('Path tests', () => {
  test(`should return correct components for a simple web path`, () => {
    const path = new Path('/web-folder/assets/service-worker.js');
    expect(path.getFileName()).toBe('service-worker.js');
    expect(path.getFullPath()).toBe('/web-folder/assets/service-worker.js');
    expect(path.getPathWithoutFileName()).toBe('/web-folder/assets');
  });

  test(`should return correct components for a file-based path`, () => {
    const path = new Path('file:///c:/web-folder/assets/service-worker.js');
    expect(path.getFileName()).toBe('service-worker.js');
    expect(path.getFullPath()).toBe('file:///c:/web-folder/assets/service-worker.js');
    expect(path.getPathWithoutFileName()).toBe('file:///c:/web-folder/assets');
  });

  test(`should return case-sensitive correct components for a file-based path`, () => {
    const path = new Path('/WeB-FoLdEr/AsSeTs/SeRvIcE-WoRkEr.js');
    expect(path.getFileName()).toBe('SeRvIcE-WoRkEr.js');
    expect(path.getFullPath()).toBe('/WeB-FoLdEr/AsSeTs/SeRvIcE-WoRkEr.js');
    expect(path.getPathWithoutFileName()).toBe('/WeB-FoLdEr/AsSeTs');
  });

  test(`should return correct components for a double-extension path`, () => {
    const path = new Path('/web-folder/assets/service-worker.js.php');
    expect(path.getFileName()).toBe('service-worker.js.php');
    expect(path.getFullPath()).toBe('/web-folder/assets/service-worker.js.php');
    expect(path.getPathWithoutFileName()).toBe('/web-folder/assets');
  });

  test(`should return correct components for a root-relative path`, () => {
    const path = new Path('/service-worker.js');
    expect(path.getFileName()).toBe('service-worker.js');
    expect(path.getFullPath()).toBe('/service-worker.js');
    expect(path.getPathWithoutFileName()).toBe('');
  });

  test(`should return correct components for an absolute web path`, () => {
    const path = new Path('https://site.com/web-folder/service-worker.js');
    expect(path.getFileName()).toBe('service-worker.js');
    expect(path.getFullPath()).toBe('https://site.com/web-folder/service-worker.js');
    expect(path.getPathWithoutFileName()).toBe('https://site.com/web-folder');
  });

  test('should include query string in full path', () => {
    const path = new Path('https://site.com/web-folder/service-worker.js?appId=12345');
    expect(path.getFullPath()).toBe('https://site.com/web-folder/service-worker.js?appId=12345');
  });
  test(`should include query string in path with query`, () => {
    const path = new Path('https://site.com/web-folder/service-worker.js?appId=12345');
    expect(path.getFileNameWithQuery()).toBe('service-worker.js?appId=12345');
  });

  test(`should not include query string in path filename`, () => {
    const path = new Path('https://site.com/web-folder/service-worker.js?appId=12345');
    expect(path.getFileName()).toBe('service-worker.js');
  });

  test(`should not include query string in path without filename`, () => {
    const path = new Path('https://site.com/web-folder/service-worker.js?appId=12345');
    expect(path.getPathWithoutFileName()).toBe('https://site.com/web-folder');
  });
});
