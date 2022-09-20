import test from 'ava';
import Path from '../../../src/models/Path';

test(`should return correct components for a simple web path`, async (t) => {
  const path = new Path('/web-folder/assets/service-worker.js');
  t.is(path.getFileName(), 'service-worker.js');
  t.is(path.getFullPath(), '/web-folder/assets/service-worker.js');
  t.is(path.getPathWithoutFileName(), '/web-folder/assets');
});

test(`should return correct components for a file-based path`, async (t) => {
  const path = new Path('file:///c:/web-folder/assets/service-worker.js');
  t.is(path.getFileName(), 'service-worker.js');
  t.is(path.getFullPath(), 'file:///c:/web-folder/assets/service-worker.js');
  t.is(path.getPathWithoutFileName(), 'file:///c:/web-folder/assets');
});

test(`should return case-sensitive correct components for a file-based path`, async (t) => {
  const path = new Path('/WeB-FoLdEr/AsSeTs/SeRvIcE-WoRkEr.js');
  t.is(path.getFileName(), 'SeRvIcE-WoRkEr.js');
  t.is(path.getFullPath(), '/WeB-FoLdEr/AsSeTs/SeRvIcE-WoRkEr.js');
  t.is(path.getPathWithoutFileName(), '/WeB-FoLdEr/AsSeTs');
});

test(`should return correct components for a double-extension path`, async (t) => {
  const path = new Path('/web-folder/assets/service-worker.js.php');
  t.is(path.getFileName(), 'service-worker.js.php');
  t.is(path.getFullPath(), '/web-folder/assets/service-worker.js.php');
  t.is(path.getPathWithoutFileName(), '/web-folder/assets');
});

test(`should return correct components for a root-relative path`, async (t) => {
  const path = new Path('/service-worker.js');
  t.is(path.getFileName(), 'service-worker.js');
  t.is(path.getFullPath(), '/service-worker.js');
  t.is(path.getPathWithoutFileName(), '');
});

test(`should return correct components for an absolute web path`, async (t) => {
  const path = new Path('https://site.com/web-folder/service-worker.js');
  t.is(path.getFileName(), 'service-worker.js');
  t.is(path.getFullPath(), 'https://site.com/web-folder/service-worker.js');
  t.is(path.getPathWithoutFileName(), 'https://site.com/web-folder');
});

test('should include query string in full path', async (t) => {
  const path = new Path(
    'https://site.com/web-folder/service-worker.js?appId=12345',
  );
  t.is(
    path.getFullPath(),
    'https://site.com/web-folder/service-worker.js?appId=12345',
  );
});

test(`should include query string in path with query`, async (t) => {
  const path = new Path(
    'https://site.com/web-folder/service-worker.js?appId=12345',
  );
  t.is(path.getFileNameWithQuery(), 'service-worker.js?appId=12345');
});

test(`should not include query string in path filename`, async (t) => {
  const path = new Path(
    'https://site.com/web-folder/service-worker.js?appId=12345',
  );
  t.is(path.getFileName(), 'service-worker.js');
});

test(`should not include query string in path without filename`, async (t) => {
  const path = new Path(
    'https://site.com/web-folder/service-worker.js?appId=12345',
  );
  t.is(path.getPathWithoutFileName(), 'https://site.com/web-folder');
});
