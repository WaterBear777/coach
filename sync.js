/* GitHub Gist 云同步客户端（零依赖，浏览器直连 api.github.com）
 * 只用 classic token 的 gist 权限；token 只存本机 localStorage。
 */
(function (G) {
  'use strict';
  var base = 'https://api.github.com';
  var FILE = 'natty-coach.json';

  function call(method, path, token, body) {
    var opt = {
      method: method,
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token }
    };
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(base + path, opt).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = JSON.parse(t); } catch (e) { }
        if (!r.ok) {
          var msg = (j && j.message) || ('HTTP ' + r.status);
          var err = new Error(msg);
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  function get(token, id) { return call('GET', '/gists/' + encodeURIComponent(id), token); }

  function create(token, description, content) {
    var files = {};
    files[FILE] = { content: content };
    return call('POST', '/gists', token, { description: description, public: false, files: files });
  }

  function update(token, id, content) {
    var files = {};
    files[FILE] = { content: content };
    return call('PATCH', '/gists/' + encodeURIComponent(id), token, { files: files });
  }

  function errorText(err) {
    if (!err) return '未知错误';
    if (err.status === 401) return 'Token 无效或已过期（401）';
    if (err.status === 403) return '权限不足或被限流（403）';
    if (err.status === 404) return 'Gist 不存在或 Token 无权限（404）';
    if (err.status === 422) return '内容格式被拒绝（422）';
    return (err.message || '网络错误') + (err.status ? '（' + err.status + '）' : '');
  }

  var api = {
    FILE: FILE,
    get: get, create: create, update: update, errorText: errorText,
    setBase: function (b) { base = b; },
    getBase: function () { return base; }
  };
  G.Sync = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
