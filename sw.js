/* 离线缓存：核心文件 cache-first，导航回退到 index.html
 * 安装时只预缓存 6 个关键文件并带 20s 超时（弱网/隧道下不会卡死），其余靠运行时缓存。
 * 只在 https 或 localhost 下注册（见 ui.js），file:// 打开时不会启用。
 */
var CACHE = 'coach-v5';
var ASSETS = [
  './index.html', './styles.css', './core.js', './sync.js', './sync-config.js', './ui.js', './seed.js', './manifest.webmanifest'
];
var TIMEOUT = 20000;

function putWithTimeout(cache, url) {
  var ctrl = ('AbortController' in self) ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
  var opts = { cache: 'reload', credentials: 'same-origin' };
  if (ctrl) opts.signal = ctrl.signal;
  return fetch(url, opts).then(function (res) {
    if (!res || !res.ok) return null;
    return cache.put(url, res.clone());
  }).catch(function () {
    return null;
  }).then(function () {
    clearTimeout(timer);
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(ASSETS.map(function (u) { return putWithTimeout(cache, u); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () { });
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      });
    })
  );
});
