/* 自然健体 · 电子教练 — 交互层 */
(function () {
  'use strict';
  var C = window.Coach;
  var LS = { cfg: 'natty.coach.cfg', db: 'natty.coach.db', theme: 'natty.coach.theme', bak: 'natty.coach.bak', sync: 'natty.coach.sync' };
  var S = {
    cfg: null, db: null, tab: 'home', draft: null, chartEx: null, timer: null, toastT: null,
    sync: { token: '', gist: '', auto: true, lastAt: 0, status: '', busy: false }, pushT: null, skipPush: false
  };

  /* ================= 存取 ================= */
  function load() {
    var seed = window.SEED || { config: {}, states: {}, records: [] };
    var savedCfg = null, savedDb = null;
    try { savedCfg = JSON.parse(localStorage.getItem(LS.cfg) || 'null'); } catch (e) { }
    try { savedDb = JSON.parse(localStorage.getItem(LS.db) || 'null'); } catch (e) { }
    S.cfg = C.normConfig(savedCfg || seed.config);
    if (!S.cfg.exercises || !S.cfg.exercises.length) S.cfg = C.normConfig(seed.config);
    if (!S.cfg.questions || !S.cfg.questions.morning || !S.cfg.questions.morning.length) {
      S.cfg.questions = C.normConfig(seed.config).questions;
    }
    S.cfg.exercises.forEach(function (e) {
      if (!e.def) e.def = { lo: e.lo, hi: e.hi, inc: e.inc, sets: e.sets, base: e.w, unit: e.unit, mode: e.mode, group: e.group };
    });
    if (savedDb && savedDb.states) {
      S.db = { states: savedDb.states, records: savedDb.records || [], meta: C.mergeDeep({ installedAt: C.today(), deloadUntil: null }, savedDb.meta || {}) };
      C.ensure(S.cfg, S.db);
    } else {
      S.db = C.newDb(S.cfg, seed);
      S.db.meta.installedAt = C.today();
      save();
    }
    var th = localStorage.getItem(LS.theme); if (th) document.documentElement.setAttribute('data-theme', th);
    try {
      var sc = JSON.parse(localStorage.getItem(LS.sync) || '{}');
      Object.keys(sc).forEach(function (k) { if (k in S.sync || k === 'off') S.sync[k] = sc[k]; });
    } catch (e) { }
    // 部署时内置的备份（只含 Gist ID，不含密钥）
    if (window.SYNC_CFG && window.SYNC_CFG.gist && !S.sync.off) {
      if (!S.sync.gist) S.sync.gist = window.SYNC_CFG.gist;
      if (S.sync.auto !== false) S.sync.auto = true;
    }
    if (!S.chartEx) { var m = S.cfg.exercises.filter(function (e) { return e.star && e.mode === 'load'; })[0]; S.chartEx = m ? m.id : (S.cfg.exercises[0] || {}).id; }
    // 修复旧版本 bug：减载日把减载重量写进了基线
    var rep = C.applyDeloadRepairs(S.cfg, S.db);
    if (rep.list.length) { S.db = rep.db; S.repairNotice = rep.list.length; }
  }
  function save() {
    try {
      S.db.meta.updatedAt = Date.now();
      var prev = localStorage.getItem(LS.db);
      if (prev) localStorage.setItem(LS.bak, JSON.stringify({ at: new Date().toISOString(), cfg: S.cfg, db: JSON.parse(prev) }));
      localStorage.setItem(LS.cfg, JSON.stringify(S.cfg));
      localStorage.setItem(LS.db, JSON.stringify(S.db));
      queuePush();
    } catch (e) { toast('保存失败：浏览器存储已满或被禁用'); }
  }

  /* ================= 云同步 ================= */
  function saveSync() {
    localStorage.setItem(LS.sync, JSON.stringify({ token: S.sync.token, gist: S.sync.gist, auto: S.sync.auto, lastAt: S.sync.lastAt, off: !!S.sync.off }));
  }
  function hhmm(ts) {
    var d = new Date(ts || Date.now());
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function syncStatus(text) {
    S.sync.status = text;
    var n = el('syncStatus');
    if (n) n.textContent = text;
  }
  function syncConfigured() { return !!(S.sync.token && S.sync.gist); }
  function queuePush() {
    if (!syncConfigured() || !S.sync.auto || S.sync.busy || S.skipPush) return;
    clearTimeout(S.pushT);
    S.pushT = setTimeout(function () { syncPush(); }, 2500);
  }
  function syncPush(silent) {
    if (!syncConfigured()) return Promise.resolve(false);
    if (!window.Sync) { syncStatus('同步模块未加载'); return Promise.resolve(false); }
    S.sync.busy = true;
    if (!silent) syncStatus('上传中…');
    var content = JSON.stringify(C.exportPayload(S.cfg, S.db));
    return window.Sync.update(S.sync.token, S.sync.gist, content).then(function () {
      S.sync.busy = false; S.sync.lastAt = Date.now(); saveSync();
      syncStatus('已上传 ' + hhmm());
      return true;
    }).catch(function (e) {
      S.sync.busy = false;
      syncStatus('上传失败：' + window.Sync.errorText(e));
      return false;
    });
  }
  function syncPull(silent) {
    if (!syncConfigured()) return Promise.resolve(false);
    if (!window.Sync) { syncStatus('同步模块未加载'); return Promise.resolve(false); }
    S.sync.busy = true;
    if (!silent) syncStatus('拉取中…');
    return window.Sync.get(S.sync.token, S.sync.gist).then(function (g) {
      var f = g && g.files && g.files[window.Sync.FILE];
      if (!f || !f.content) throw new Error('云端还没有备份文件');
      var remote = JSON.parse(f.content);
      var remoteAt = (remote.meta && remote.meta.updatedAt) || 0;
      if (remoteAt <= (S.db.meta.updatedAt || 0)) {
        S.sync.busy = false; S.sync.lastAt = Date.now(); saveSync();
        syncStatus('已是最新 ' + hhmm());
        return false;
      }
      var merged = C.mergeDb(S.db, { states: remote.states, records: remote.records, meta: remote.meta }, true);
      S.skipPush = true;
      S.db = merged;
      if (remote.config) S.cfg = C.normConfig(remote.config);
      S.cfg.exercises.forEach(function (e) {
        if (!e.def) e.def = { lo: e.lo, hi: e.hi, inc: e.inc, sets: e.sets, base: e.w, unit: e.unit, mode: e.mode, group: e.group };
      });
      C.ensure(S.cfg, S.db);
      save(); render();
      S.skipPush = false; S.sync.busy = false; S.sync.lastAt = Date.now(); saveSync();
      syncStatus('已从云端更新 ' + hhmm());
      toast('已同步云端数据');
      return true;
    }).catch(function (e) {
      S.sync.busy = false;
      syncStatus('拉取失败：' + window.Sync.errorText(e));
      return false;
    });
  }
  function syncNow() {
    if (!S.sync.token) { pairSheet(); return; }
    if (!S.sync.gist) return syncCreate();
    syncPull().then(function () { return syncPush(); });
  }
  function syncCreate() {
    if (!S.sync.token) return toast('先填 GitHub Token');
    if (!window.Sync) return toast('同步模块未加载');
    S.sync.busy = true; syncStatus('创建中…');
    var content = JSON.stringify(C.exportPayload(S.cfg, S.db));
    window.Sync.create(S.sync.token, '自然健体电子教练备份', content).then(function (g) {
      S.sync.gist = g.id; S.sync.busy = false; S.sync.lastAt = Date.now();
      saveSync(); render(); toast('已创建云端备份');
      syncStatus('已创建 ' + g.id.slice(0, 8) + '…');
    }).catch(function (e) {
      S.sync.busy = false;
      syncStatus('创建失败：' + window.Sync.errorText(e));
    });
  }

  function pairSheet() {
    openSheet('<div class="sheet-h"><div class="sheet-t">配对同步</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
      '<div class="small muted">把电脑上生成的「同步码」整段粘进来，只需一次。之后打开自动拉取、改动后自动上传。</div>' +
      '<textarea id="pairCode" rows="4" style="margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:11px" placeholder="ghp_...|4f1a2b3c"></textarea>' +
      '<div class="spacer"></div><button class="btn primary block" data-act="pair-run">配对</button>');
  }
  function applyPair(raw) {
    var v = String(raw || '').trim();
    var m = /pair=([^&\s]+)/.exec(v);
    if (m) { try { v = decodeURIComponent(m[1]); } catch (e) { } }
    var parts = v.split('|');
    if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) { toast('同步码格式不对'); return false; }
    S.sync.token = parts[0].trim();
    S.sync.gist = parts[1].trim();
    S.sync.auto = true; S.sync.off = false; S.sync.status = '已配对';
    saveSync(); closeSheet(); render();
    toast('已配对，正在同步…');
    setTimeout(function () { syncNow(); }, 300);
    return true;
  }

  /* ================= 工具 ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function el(id) { return document.getElementById(id); }
  function num(v) { if (v === '' || v == null) return null; var n = Number(v); return isNaN(n) ? null : n; }
  function toast(msg, ms) {
    var t = el('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(S.toastT); S.toastT = setTimeout(function () { t.hidden = true; }, ms || 2400);
  }
  function openSheet(html) { var w = el('sheet'); w.innerHTML = '<div class="sheet">' + html + '</div>'; w.hidden = false; }
  function closeSheet() { var w = el('sheet'); w.hidden = true; w.innerHTML = ''; }
  function fmtResult(r) { var x = C.RESULT[r]; return x ? x.short : (r === 'link' ? '联动' : r); }
  function toneOf(r) { var x = C.RESULT[r]; return x ? x.tone : 'mid'; }
  function nameOf(ex) { return ex.name.replace(/[★]/g, '').trim(); }
  function linkCount(link) { return link ? S.cfg.exercises.filter(function (e) { return e.link === link; }).length : 1; }
  function star(ex) { return ex.star ? '<span class="tag-star">★</span> ' : ''; }
  function pct(a, b) { return b ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }
  function lastWeight() {
    var bs = C.bodySeries(S.db);
    return bs.length ? bs[bs.length - 1].v : null;
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制'); }, function () { showText('复制失败，请手动选择', text); });
    } else showText('手动复制', text);
  }
  function showText(title, text) {
    openSheet('<div class="sheet-h"><div class="sheet-t">' + esc(title) + '</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
      '<textarea rows="12" readonly style="font-family:ui-monospace,Menlo,monospace;font-size:12px">' + esc(text) + '</textarea>' +
      '<div class="spacer"></div><button class="btn block" data-act="copy-area">复制</button>');
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  /* ================= 图表 ================= */
  function lineChart(pts, opt) {
    opt = opt || {};
    if (!pts || pts.length < 1) return '<div class="empty">还没有数据</div>';
    var W = 520, H = opt.h || 168, P = 34;
    var vals = pts.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (opt.target != null) { min = Math.min(min, opt.target); max = Math.max(max, opt.target); }
    var pad = (max - min) * 0.18 || 1; min -= pad; max += pad;
    var x = function (i) { return P + i * (W - P - 18) / Math.max(pts.length - 1, 1); };
    var y = function (v) { return H - 26 - (v - min) / (max - min) * (H - 52); };
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1); }).join(' ');
    var area = path + ' L' + x(pts.length - 1).toFixed(1) + ',' + (H - 26) + ' L' + x(0).toFixed(1) + ',' + (H - 26) + ' Z';
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    [0, 0.5, 1].forEach(function (q) {
      var v = min + (max - min) * q, yy = y(v);
      svg += '<line class="grid" x1="' + P + '" y1="' + yy.toFixed(1) + '" x2="' + (W - 10) + '" y2="' + yy.toFixed(1) + '" stroke-dasharray="3 4"/>';
      svg += '<text class="lbl" x="2" y="' + (yy + 3).toFixed(1) + '">' + C.fmtW(v) + '</text>';
    });
    if (opt.target != null) {
      svg += '<line x1="' + P + '" y1="' + y(opt.target).toFixed(1) + '" x2="' + (W - 10) + '" y2="' + y(opt.target).toFixed(1) + '" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="5 4" opacity=".7"/>';
    }
    svg += '<path class="area" d="' + area + '" stroke="none"/>';
    svg += '<path d="' + path + '" fill="none" stroke="var(--ink)" stroke-width="' + (opt.thin ? 1.6 : 2.2) + '" stroke-linejoin="round"/>';
    if (opt.ma) {
      var mp = opt.ma.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1); }).join(' ');
      svg += '<path d="' + mp + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="1 0" opacity=".9"/>';
    }
    if (pts.length <= 40) {
      pts.forEach(function (p, i) { svg += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="2.6" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.6"/>'; });
    }
    svg += '<text class="lbl" x="' + P + '" y="' + (H - 8) + '">' + C.fmtMD(pts[0].date) + '</text>';
    svg += '<text class="lbl" x="' + (W - 10) + '" y="' + (H - 8) + '" text-anchor="end">' + C.fmtMD(pts[pts.length - 1].date) + '</text>';
    svg += '<text class="val" x="' + (W - 10) + '" y="' + (y(pts[pts.length - 1].v) - 8) + '" text-anchor="end">' + C.fmtW(pts[pts.length - 1].v) + (opt.unit || '') + '</text>';
    svg += '</svg>';
    return svg;
  }

  function barChart(items, opt) {
    opt = opt || {};
    if (!items.length || !items.some(function (i) { return i.v > 0; })) return '<div class="empty">还没有结构化训练数据（做一次训练打卡后开始统计）</div>';
    var W = 520, H = opt.h || 130, P = 28, B = 10;
    var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    var bw = (W - P - 14) / items.length;
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    items.forEach(function (it, i) {
      var hh = (it.v / max) * (H - 44);
      var xx = P + i * bw + 4;
      svg += '<rect x="' + xx.toFixed(1) + '" y="' + (H - 24 - hh).toFixed(1) + '" width="' + Math.max(4, bw - B).toFixed(1) + '" height="' + Math.max(1, hh).toFixed(1) + '" rx="3" fill="var(--ink)" opacity="' + (i === items.length - 1 ? 1 : .28) + '"/>';
      if (it.v > 0) svg += '<text class="val" x="' + (xx + (bw - B) / 2).toFixed(1) + '" y="' + (H - 28 - hh).toFixed(1) + '" text-anchor="middle">' + it.v + '</text>';
      if (items.length <= 6 || i % 2 === 0 || i === items.length - 1) {
        svg += '<text class="lbl" x="' + (xx + (bw - B) / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(it.label) + '</text>';
      }
    });
    svg += '</svg>';
    return svg;
  }

  /* ================= 今日 ================= */
  function streak() {
    var d = C.today();
    var has = function (x) { return S.db.records.some(function (r) { return r.date === x; }); };
    if (!has(d)) { d = C.addDays(d, -1); if (!has(d)) return 0; }
    var n = 0, guard = 0;
    while (guard++ < 400 && has(d)) { n++; d = C.addDays(d, -1); }
    return n;
  }

  function pageHome() {
    var date = C.today();
    var day = C.planDay(S.cfg, date);
    var exs = day ? C.planExercises(S.cfg, day.id) : [];
    var done = C.doneKinds(S.db, date);
    var expected = C.expectedKinds(S.cfg, date);
    var pending = expected.filter(function (k) { return !done[k]; });
    var st = C.stats(S.cfg, S.db, date);
    var deload = C.isDeload(S.db, date);
    var alerts = C.alerts(S.cfg, S.db, date);
    var todayRecs = S.db.records.filter(function (r) { return r.date === date; });
    var morning = todayRecs.filter(function (r) { return r.kind === 'morning'; })[0];
    var note = todayRecs.filter(function (r) { return r.kind === 'note'; })[0];
    var planned = Object.keys(S.cfg.schedule).filter(function (k) { return !!S.cfg.schedule[k]; }).length;
    var html = '';

    html += '<div class="day-hero">' +
      '<div class="k">' + date + ' · 周' + C.weekdayCN(date) + (deload ? ' · 减载周' : '') + '</div>' +
      '<div class="t">' + (day ? day.label + ' · ' + day.name : '休息日') + '</div>' +
      '<div class="d">' + (day ? exs.length + ' 个动作 · 主项 ' + exs.filter(function (e) { return e.star; }).length + ' 个' : '步数 7000+ · 蛋白吃够 · 睡够 7 小时') + '</div>' +
      '<div class="stat">' +
        '<div><b>' + st.week.sessions + '/' + planned + '</b> 本周训练</div>' +
        '<div><b>' + C.fmtW(st.body.maLatest ? st.body.maLatest.v : '—') + '</b> kg 7日均</div>' +
        '<div><b>' + streak() + '</b> 天连续</div>' +
      '</div></div>';

    // 打卡状态
    html += '<div class="card"><div class="card-h"><div><div class="card-t">今日打卡</div><div class="card-sub">' +
      (pending.length ? '还差 ' + pending.map(function (k) { return C.KIND_LABEL[k]; }).join('、') : '全部完成，恢复优先') + '</div></div>' +
      (pending.length ? '<button class="btn sm accent" data-act="nav" data-tab="checkin">去打卡</button>' : '<span class="badge ok">已完成</span>') + '</div>' +
      '<div class="wrap">' + expected.map(function (k) {
        return '<span class="badge ' + (done[k] ? 'ok' : 'line') + '">' + C.KIND_LABEL[k] + (done[k] ? ' ✓' : '') + '</span>';
      }).join('') + '</div>';
    if (morning) {
      var m = morning.data;
      html += '<div class="hr"></div><div class="wrap small muted">' +
        (m.weight != null ? '<span>体重 ' + C.fmtW(m.weight) + 'kg</span>' : '') +
        (m.sleep != null ? '<span>睡眠 ' + C.fmtW(m.sleep) + 'h</span>' : '') +
        (m.waist != null ? '<span>腰围 ' + C.fmtW(m.waist) + 'cm</span>' : '') +
        (m.sleep != null && m.sleep < 6 ? '<span class="badge warn">睡眠不足：主项各减 1 组</span>' : '') +
        '</div>';
    }
    if (note) html += '<div class="hr"></div><div class="small muted">备注：' + esc(note.data.text) + '</div>';
    html += '</div>';

    // 处方
    if (day) {
      html += '<div class="card"><div class="card-h"><div><div class="card-t">今日处方</div><div class="card-sub">' +
        (deload ? '减载：组数减半、重量 ×' + S.cfg.rules.deloadFactor : '纯双进阶 · 最后一组到上限就加重') + '</div></div>' +
        '<button class="btn sm ghost" data-act="copy-rx">复制</button></div>';
      exs.forEach(function (ex) {
        var r = C.rx(S.cfg, S.db, ex, date);
        var ll = C.lastLog(S.db, ex.id);
        var lastTxt = ll ? C.fmtMD(ll.date) + ' ' + (ll.result === 'link' ? '联动' : (ll.w != null ? C.fmtW(ll.w) + (ex.mode === 'bodyweight' ? 'kg负重' : 'kg') : '—') + ' ' + fmtResult(ll.result)) : '首次';
        var rec = todayRecs.filter(function (x) { return x.kind === 'training'; })[0];
        var logged = rec && (rec.data.items || []).filter(function (i) { return i.id === ex.id; })[0];
        html += '<div class="ex-row"><div class="col"><div class="ex-name">' + star(ex) + esc(nameOf(ex)) + '</div>' +
          '<div class="ex-meta">' + r.sets + ' 组 · 上次 ' + lastTxt + (logged ? ' · <b>今日 ' + fmtResult(logged.result) + '</b>' : '') + '</div></div>' +
          '<div class="col" style="align-items:flex-end"><div class="ex-rx">' + r.weightText + '</div>' +
          '<div class="ex-meta">' + r.repsText + ' 次 · ' + esc(ex.rest || '') + '</div></div></div>';
      });
      html += '<div class="hr"></div><div class="wrap"><button class="btn sm ghost" data-act="timer" data-sec="150">⏱ 主项 2:30</button>' +
        '<button class="btn sm ghost" data-act="timer" data-sec="75">⏱ 孤立 1:15</button>' +
        '<button class="btn sm ghost" data-act="note">加备注</button></div></div>';
    } else {
      html += '<div class="card"><div class="card-t">休息日</div><div class="small muted" style="margin-top:6px">' +
        '· 步数 ' + (S.cfg.targets.steps || 7000) + '+，蛋白质 ' + (S.cfg.targets.protein || 150) + 'g<br>' +
        '· ' + ((S.cfg.posingDays || []).map(Number).indexOf(C.dow(date)) >= 0 ? '今天造型练习 10 分钟起（打卡页作答）' : '23:00 前睡觉') + '<br>' +
        '· 明天训练前 11:00 加餐（面包+香蕉）</div></div>';
    }

    if (alerts.length) {
      html += '<h2>提醒</h2>';
      alerts.slice(0, 2).forEach(function (a) { html += alertHtml(a); });
      if (alerts.length > 2) html += '<button class="btn sm ghost block" data-act="nav" data-tab="analysis">查看全部 ' + alerts.length + ' 条</button>';
    }
    return html;
  }

  function alertHtml(a) {
    return '<div class="alert ' + a.level + '"><span class="dot"></span><div><div class="t">' + esc(a.title) + '</div><div class="x">' + esc(a.text) + '</div></div></div>';
  }

  /* ================= 打卡 ================= */
  function initDraft(date) {
    var last = lastWeight();
    S.draft = { date: date, morning: { weight: last }, evening: {}, posing: {}, training: { items: {}, feel: null }, editing: {} };
    var day = C.planDay(S.cfg, date);
    if (day) C.planExercises(S.cfg, day.id).forEach(function (ex) {
      var r = C.rx(S.cfg, S.db, ex, date);
      S.draft.training.items[ex.id] = { result: null, w: r.weight, reps: null };
    });
  }
  function ensureDraft() {
    if (!S.draft || S.draft.date !== C.today()) initDraft(C.today());
    return S.draft;
  }

  function mapSleep(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    var s = String(v);
    if (/不足/.test(s)) return 5.5;
    if (/6\s*-\s*7/.test(s)) return 6.5;
    if (/7\s*-\s*8/.test(s)) return 7.5;
    if (/超过/.test(s)) return 8.5;
    var m = s.match(/(\d+(\.\d+)?)/); return m ? parseFloat(m[1]) : null;
  }
  function mapSteps(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    var s = String(v);
    if (/不足/.test(s)) return 4000;
    if (/5000\s*-\s*7000/.test(s)) return 6000;
    if (/7000\s*-\s*9000/.test(s)) return 8000;
    if (/超过\s*9000|9000/.test(s)) return 9500;
    var m = s.match(/(\d{3,})/); return m ? parseFloat(m[1]) : null;
  }

  function questionHtml(q, kind, d) {
    var val = d[q.id];
    if (q.kind === 'number') {
      return '<div style="margin-top:10px"><label class="field"><span>' + esc(q.title) + (q.unit ? '（' + esc(q.unit) + '）' : '') + '</span>' +
        '<input type="number" inputmode="decimal" step="0.1" data-act="num" data-kind="' + kind + '" data-qid="' + q.id + '" value="' + (val != null ? val : '') + '" placeholder="' + (q.unit === 'kg' ? '如 73.5' : '可选') + '"></label></div>';
    }
    return '<div style="margin-top:10px"><div class="small muted" style="margin-bottom:6px">' + esc(q.title) + '</div><div class="chips c2" data-chipgroup="' + kind + ':' + q.id + '">' +
      (q.options || []).map(function (o) {
        return '<button type="button" class="chip ' + (val === o ? 'on' : '') + '" data-act="pick" data-kind="' + kind + '" data-qid="' + q.id + '" data-val="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div></div>';
  }

  function pageCheckin() {
    var date = C.today(), d = ensureDraft();
    var expected = C.expectedKinds(S.cfg, date);
    var done = C.doneKinds(S.db, date);
    var day = C.planDay(S.cfg, date);
    var html = '<h1>打卡</h1><div class="sub">' + date + ' 周' + C.weekdayCN(date) + (day ? ' · ' + day.label + ' ' + day.name : ' · 休息日') + '</div>';

    expected.forEach(function (kind) {
      var rec = S.db.records.filter(function (r) { return r.date === date && r.kind === kind; })[0];
      var editing = d.editing[kind] || !rec;
      html += '<div class="card"><div class="card-h"><div class="card-t">' + C.KIND_LABEL[kind] + '</div>' +
        (rec && !editing ? '<span class="badge ok">已打卡</span>' : '<span class="badge line">待填</span>') + '</div>';
      if (rec && !editing) {
        html += '<div class="small muted">' + summaryOf(rec) + '</div><div class="spacer"></div>' +
          '<button class="btn sm ghost" data-act="edit-kind" data-kind="' + kind + '">修改</button>';
      } else {
        html += formOf(kind, date, day);
      }
      html += '</div>';
    });

    if (!day) html += '<div class="card"><div class="small muted">今天没有训练安排。休息日的打卡只记体重/睡眠/蛋白/步数；想加练可以去「引擎」临时调课表。</div></div>';
    return html;
  }

  function summaryOf(r) {
    var d = r.data || {};
    if (r.kind === 'morning') return [d.weight != null ? '体重 ' + C.fmtW(d.weight) + 'kg' : '', d.sleep != null ? '睡眠 ' + (d.sleepText || d.sleep + 'h') : '', d.protein || '', d.waist != null ? '腰围 ' + d.waist + 'cm' : ''].filter(Boolean).join(' · ');
    if (r.kind === 'evening') return [d.protein_e, d.creatine, d.stepsText || (d.steps != null ? d.steps + ' 步' : '')].filter(Boolean).join(' · ');
    if (r.kind === 'posing') return '造型 ' + (d.minutes || 0) + ' 分钟';
    if (r.kind === 'training') {
      var n = (d.items || []).filter(function (i) { return i.result; }).length;
      return (d.day ? d.day + ' · ' : '') + n + ' 个动作已记录' + (d.feel ? ' · ' + d.feel : '');
    }
    return '';
  }

  function formOf(kind, date, day) {
    var d = S.draft, html = '';
    if (kind === 'morning') {
      var qs = (S.cfg.questions.morning || []).filter(function (q) { return q.on !== false && (!q.monday_only || C.dow(date) === 1); });
      qs.forEach(function (q) { html += questionHtml(q, 'morning', d.morning); });
      html += submitBtn('morning', '保存早间');
    } else if (kind === 'evening') {
      (S.cfg.questions.evening || []).filter(function (q) { return q.on !== false; }).forEach(function (q) { html += questionHtml(q, 'evening', d.evening); });
      html += submitBtn('evening', '保存晚间');
    } else if (kind === 'posing') {
      (S.cfg.questions.posing || []).filter(function (q) { return q.on !== false; }).forEach(function (q) { html += questionHtml(q, 'posing', d.posing); });
      html += submitBtn('posing', '保存造型');
    } else if (kind === 'training') {
      var exs = day ? C.planExercises(S.cfg, day.id) : [];
      html += '<div class="wrap" style="margin-bottom:6px"><button class="btn sm ghost" data-act="fill-all" data-val="done">全部完成（未到hi）</button>' +
        '<button class="btn sm ghost" data-act="clear-all">清空</button><span class="badge line" id="trCount">0/' + exs.length + '</span></div>';
      exs.forEach(function (ex) {
        var it = d.training.items[ex.id] || (d.training.items[ex.id] = { result: null, w: null, reps: null });
        var r = C.rx(S.cfg, S.db, ex, date);
        var ll = C.lastLog(S.db, ex.id);
        html += '<div style="padding:10px 0;border-top:1px dashed var(--line)">' +
          '<div class="row"><div class="col"><div class="ex-name">' + star(ex) + esc(nameOf(ex)) + '</div>' +
          '<div class="ex-meta">' + r.weightText + ' × ' + r.sets + ' 组 × ' + r.repsText + ' · 上次 ' +
          (ll ? C.fmtMD(ll.date) + ' ' + fmtResult(ll.result) : '首次') + '</div></div>' +
          '<div class="ex-rx">' + r.weightText + '</div></div>' +
          '<div class="chips c5" style="margin-top:8px" data-chipgroup="training:' + ex.id + '">' +
          ['hit', 'done', 'heavy', 'sets', 'body'].map(function (k) {
            return '<button type="button" class="chip sm ' + (it.result === k ? 'on ' + toneOf(k) : '') + '" data-act="pick" data-kind="training" data-ex="' + ex.id + '" data-val="' + k + '">' + C.RESULT[k].label + '</button>';
          }).join('') + '</div>' +
          '<div class="field-row" style="margin-top:6px">' +
          '<label class="field"><span>实际重量' + (ex.mode === 'bodyweight' ? '（负重，0=自重）' : ex.mode === 'untracked' ? '（不计重）' : '') + '</span>' +
          '<input type="number" step="0.5" data-act="num" data-kind="trw" data-ex="' + ex.id + '" value="' + (it.w != null ? it.w : '') + '"' + (ex.mode === 'untracked' ? ' disabled' : '') + '></label>' +
          '<label class="field"><span>最后一组次数</span><input type="number" step="1" data-act="num" data-kind="trr" data-ex="' + ex.id + '" value="' + (it.reps != null ? it.reps : '') + '" placeholder="到 ' + ex.hi + ' 算摸顶"></label>' +
          '</div></div>';
      });
      html += '<div style="margin-top:10px"><div class="small muted" style="margin-bottom:6px">今天整体感觉</div><div class="chips auto" data-chipgroup="feel:feel">' +
        C.FEEL.map(function (f) { return '<button type="button" class="chip sm ' + (d.training.feel === f ? 'on' : '') + '" data-act="pick" data-kind="feel" data-qid="feel" data-val="' + f + '">' + f + '</button>'; }).join('') +
        '</div></div>' + submitBtn('training', '提交训练打卡');
    }
    return html;
  }

  function submitBtn(kind, label) {
    return '<div class="spacer"></div><button class="btn primary block" data-act="submit" data-kind="' + kind + '">' + label + '</button>';
  }

  function trCount() {
    var d = S.draft, n = 0, total = 0;
    var day = C.planDay(S.cfg, C.today());
    if (!day) return;
    C.planExercises(S.cfg, day.id).forEach(function (ex) { total++; if (d.training.items[ex.id] && d.training.items[ex.id].result) n++; });
    var e = el('trCount'); if (e) e.textContent = n + '/' + total;
  }

  function submitKind(kind) {
    var date = C.today(), d = S.draft;
    try {
      if (kind === 'morning') {
        var m = d.morning;
        if (m.weight == null && !m.sleep && !m.protein && (m.waist == null)) return toast('至少填一项');
        S.db = C.putRecord(S.db, { date: date, kind: 'morning', data: {
          weight: num(m.weight), sleep: mapSleep(m.sleep), sleepText: m.sleep || null,
          protein: m.protein || null, waist: num(m.waist)
        } });
        delete d.editing.morning;
      } else if (kind === 'evening') {
        var e = d.evening;
        if (!e.protein_e && !e.creatine && !e.steps) return toast('至少选一项');
        S.db = C.putRecord(S.db, { date: date, kind: 'evening', data: {
          protein_e: e.protein_e || null, creatine: e.creatine || null,
          steps: mapSteps(e.steps), stepsText: e.steps || null
        } });
        delete d.editing.evening;
      } else if (kind === 'posing') {
        var p = d.posing;
        if (!p.posing) return toast('请选择');
        var mm = String(p.posing).match(/(\d+)/);
        S.db = C.putRecord(S.db, { date: date, kind: 'posing', data: { minutes: mm ? parseInt(mm[1], 10) : 10, text: p.posing } });
        delete d.editing.posing;
      } else if (kind === 'training') {
        var day = C.planDay(S.cfg, date); if (!day) return;
        var items = [];
        C.planExercises(S.cfg, day.id).forEach(function (ex) {
          var it = d.training.items[ex.id];
          if (!it || !it.result) return;
          items.push({ id: ex.id, result: it.result, w: num(it.w), reps: num(it.reps) });
        });
        if (!items.length) return toast('至少选一个动作的结果');
        var res = C.commitTraining(S.cfg, S.db, date, day.id, items, d.training.feel, '');
        S.db = res.db;
        var msg = res.changes.length ? res.changes.map(function (c) { return nameOf(C.exById(S.cfg, c.id)).slice(0, 8) + ' ' + c.from + '→' + c.to; }).join('，') : '已记录，重量不变';
        toast('训练已入库：' + msg, 3200);
        initDraft(date);
        save(); go('home'); return;
      }
      save(); toast('已保存'); go('home');
    } catch (err) { toast('保存失败：' + err.message, 3000); }
  }

  /* ================= 引擎 ================= */
  function pageEngine() {
    var date = C.today();
    var deload = C.isDeload(S.db, date);
    var html = '<h1>引擎</h1><div class="sub">当前基线 · 纯双进阶 · 改重量/区间即刻生效</div>';
    html += '<div class="card tight"><div class="row"><div class="col"><div class="card-t">' + (deload ? '减载中 · 至 ' + S.db.meta.deloadUntil : '常规训练') + '</div>' +
      '<div class="card-sub">' + (deload ? '组数减半、重量 ×' + S.cfg.rules.deloadFactor + '，基线不动' : '疲劳信号出现时手动插入减载') + '</div></div>' +
      (deload ? '<button class="btn sm" data-act="deload-end">结束减载</button>' : '<button class="btn sm ghost" data-act="deload-start">插入减载</button>') + '</div></div>';

    var mains = [], seenLink = {};
    S.cfg.exercises.filter(function (e) { return e.star; }).forEach(function (e) {
      var k = e.link || e.id;
      if (seenLink[k]) { seenLink[k].days.push(e.day); return; }
      seenLink[k] = { ex: e, days: [e.day] };
      mains.push(seenLink[k]);
    });
    html += '<h2>主项</h2>';
    mains.forEach(function (m) {
      html += engineCard(m.ex, date, m.days.length > 1 ? S.cfg.days.filter(function (d) { return m.days.indexOf(d.id) >= 0; }).map(function (d) { return d.label; }).join('/') + ' 共用基线' : '');
    });

    html += '<h2>全部动作</h2>';
    S.cfg.days.forEach(function (day) {
      var exs = C.planExercises(S.cfg, day.id);
      if (!exs.length) return;
      html += '<div class="card tight"><div class="card-h"><div class="card-t">' + day.label + ' · ' + esc(day.name) + '</div><span class="badge line">' + exs.length + ' 个</span></div>';
      exs.forEach(function (ex) {
        var r = C.rx(S.cfg, S.db, ex, date);
        html += '<div class="row" style="padding:7px 0;border-top:1px dashed var(--line)"><div class="col"><div class="small">' + star(ex) + esc(nameOf(ex)) + '</div>' +
          '<div class="tiny muted">' + r.weightText + ' × ' + r.sets + ' × ' + r.repsText + (ex.link && linkCount(ex.link) > 1 ? ' · 联动组' : '') + '</div></div>' +
          '<button class="btn sm ghost" data-act="adjust" data-ex="' + ex.id + '">改</button></div>';
      });
      html += '</div>';
    });
    return html;
  }

  function engineCard(ex, date, sub) {
    var r = C.rx(S.cfg, S.db, ex, date);
    var st = S.db.states[ex.id] || { log: [] };
    var pts = st.log.filter(function (l) { return l.e1rm; }).map(function (l) { return { date: l.date, v: l.e1rm }; });
    var ll = C.lastLog(S.db, ex.id);
    var html = '<div class="card"><div class="card-h"><div><div class="card-t">' + star(ex) + esc(nameOf(ex)) + '</div>' +
      '<div class="card-sub">' + (ex.group || '') + ' · ' + (ex.type === 'main' ? '主项' : ex.type === 'acc' ? '次项' : '孤立') + (sub ? ' · ' + sub : '') + '</div></div>' +
      '<span class="badge solid">' + r.weightText + '</span></div>';
    html += '<div class="row"><div class="mono" style="font-size:18px;font-weight:650">' + r.weightText + ' <span class="muted" style="font-size:13px;font-weight:400">× ' + r.sets + ' 组 × ' + r.repsText + '</span></div>' +
      '<div class="right tiny muted">' + (ll ? '上次 ' + C.fmtMD(ll.date) + ' · ' + fmtResult(ll.result) : '无记录') + '</div></div>';
    if (pts.length > 1) html += '<div style="margin-top:6px">' + lineChart(pts.slice(-10), { h: 96, thin: true, unit: 'kg' }) + '<div class="tiny muted">预估 1RM（e1RM）</div></div>';
    html += '<div class="wrap" style="margin-top:8px"><button class="btn sm ghost" data-act="adjust" data-ex="' + ex.id + '">调整</button>' +
      '<button class="btn sm ghost" data-act="hist" data-ex="' + ex.id + '">历史</button>' +
      (ex.mode === 'untracked' ? '<span class="badge line">不计重</span>' : '<button class="btn sm ghost" data-act="timer" data-sec="' + (ex.type === 'main' ? 150 : 75) + '">计时</button>') + '</div></div>';
    return html;
  }

  function adjustSheet(exId) {
    var ex = C.exById(S.cfg, exId), st = S.db.states[exId], r = C.rx(S.cfg, S.db, ex, C.today());
    openSheet('<div class="sheet-h"><div class="sheet-t">' + esc(nameOf(ex)) + '</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
      '<div class="tiny muted" style="margin-bottom:8px">改的是「下一次的起点」，不会改写历史记录。' + (ex.link && linkCount(ex.link) > 1 ? '此动作在联动组内，改重量会同步到同组动作。' : '') + '</div>' +
      '<div class="field-row"><label class="field"><span>当前重量（' + esc(ex.unit) + '）</span><input id="fBase" type="number" step="0.5" value="' + (st.base != null ? st.base : '') + '"></label>' +
      '<label class="field"><span>组数</span><input id="fSets" type="number" step="1" min="1" value="' + ex.sets + '"></label></div>' +
      '<div class="field-row three" style="margin-top:8px"><label class="field"><span>次数下限</span><input id="fLo" type="number" step="1" value="' + ex.lo + '"></label>' +
      '<label class="field"><span>次数上限</span><input id="fHi" type="number" step="1" value="' + ex.hi + '"></label>' +
      '<label class="field"><span>步进</span><input id="fInc" type="number" step="0.5" value="' + ex.inc + '"></label></div>' +
      '<div class="tiny muted" style="margin-top:8px">最后一组摸到 ' + ex.hi + ' 次 → 下次 ' + r.weightText + ' + ' + ex.inc + 'kg；太重则回退一档。</div>' +
      '<div class="spacer"></div><div class="field-row"><button class="btn primary" data-act="adjust-save" data-ex="' + exId + '">保存</button>' +
      '<button class="btn ghost" data-act="adjust-reset" data-ex="' + exId + '">恢复默认基线</button></div>');
  }

  function histSheet(exId) {
    var ex = C.exById(S.cfg, exId), logs = (S.db.states[exId].log || []).slice(-14).reverse();
    var body = logs.length ? '<table class="tbl"><tr><th>日期</th><th>结果</th><th>重量</th><th>次数</th><th>e1RM</th></tr>' +
      logs.map(function (l) {
        return '<tr><td>' + C.fmtMD(l.date) + '</td><td>' + fmtResult(l.result) + '</td><td class="mono">' + (l.w != null ? C.fmtW(l.w) : '—') + '</td>' +
          '<td class="mono">' + (l.reps || '—') + '</td><td class="mono">' + (l.e1rm || '—') + '</td></tr>';
      }).join('') + '</table>' : '<div class="empty">还没有记录</div>';
    openSheet('<div class="sheet-h"><div class="sheet-t">' + esc(nameOf(ex)) + ' · 历史</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' + body);
  }

  /* ================= 分析 ================= */
  function pageAnalysis() {
    var date = C.today(), st = C.stats(S.cfg, S.db, date);
    var html = '<h1>分析</h1><div class="sub">自 ' + S.db.meta.installedAt + ' 起统计 · 历史导入数据仅参与体重/睡眠</div>';
    html += '<div class="kpis">' +
      kpi('本周训练', st.week.sessions + '/' + st.week.planned, '次') +
      kpi('本周吨位', Math.round(st.week.tonnage / 100) / 10, '吨') +
      kpi('体重 7 日均', st.body.maLatest ? C.fmtW(st.body.maLatest.v) : '—', st.body.latest ? '最近 ' + C.fmtMD(st.body.latest.date) + (st.body.delta14 != null ? ' · 两周 ' + (st.body.delta14 > 0 ? '+' : '') + C.fmtW(st.body.delta14) + 'kg' : '') : 'kg') +
      kpi('蛋白达标', st.protein.days ? st.protein.hit + '/' + st.protein.days : '—', '餐') +
      '</div>';

    var alerts = C.alerts(S.cfg, S.db, date);
    if (alerts.length) { html += '<h2>需要处理</h2>'; alerts.forEach(function (a) { html += alertHtml(a); }); }

    html += '<div class="card"><div class="card-h"><div class="card-t">体重（空腹）</div><span class="badge line">7 日均</span></div>' +
      lineChart(st.body.series.slice(-40), { ma: st.body.ma.slice(-40), unit: 'kg', h: 178 }) +
      '<div class="tiny muted" style="margin-top:4px">实线=每日，虚线=7 日均；目标 ' + (S.cfg.profile.targetWeight || '78-80') + 'kg</div></div>';

    var exSel = [], seenSel = {};
    S.cfg.exercises.forEach(function (e) {
      if (e.mode !== 'load' || !(e.star || st.e1rm[e.id])) return;
      var k = e.link || e.id;
      if (seenSel[k]) return; seenSel[k] = 1; exSel.push(e);
    });
    if (exSel.length) {
      var withData = exSel.filter(function (e) { return st.e1rm[e.id]; });
      var cur = withData.some(function (e) { return e.id === S.chartEx; }) ? S.chartEx : (withData[0] || exSel[0] || {}).id;
      var pts = (st.e1rm[cur] || []).slice(-20);
      html += '<div class="card"><div class="card-h"><div class="card-t">力量趋势（e1RM）</div><span class="badge line">估算</span></div>' +
        '<div class="chips c2" style="margin-bottom:8px">' + exSel.map(function (e) {
          return '<button class="chip sm trunc ' + (e.id === cur ? 'on' : '') + '" data-act="chart-ex" data-ex="' + e.id + '">' + esc(nameOf(e)) + '</button>';
        }).join('') + '</div>' +
        (pts.length ? lineChart(pts, { unit: 'kg', h: 168 }) : '<div class="empty">还没有 e1RM 数据：完成一次训练打卡后自动生成</div>') +
        '<div class="tiny muted" style="margin-top:4px">e1RM = 重量 × (1 + 次数/30)，按每次处方重量与完成次数估算</div></div>';
    }

    html += '<div class="card"><div class="card-h"><div class="card-t">周吨位</div><span class="badge line">kg</span></div>' +
      barChart(st.weeks.map(function (w) { return { label: w.label, v: Math.round(w.tonnage / 100) / 10 }; })) +
      '<div class="tiny muted">单位：吨 · 最后一条为本周</div></div>';

    var groups = Object.keys(S.cfg.targets.volume || {});
    html += '<div class="card"><div class="card-h"><div class="card-t">本周部位组数</div><span class="badge line">目标</span></div>';
    groups.forEach(function (g) {
      var v = st.week.byGroup[g] || 0, t = S.cfg.targets.volume[g] || 0;
      html += '<div style="margin-top:8px"><div class="row tiny"><span>' + g + '</span><span class="muted">' + v + ' / ' + t + ' 组</span></div>' +
        '<div style="height:6px;background:var(--chip);border-radius:999px;margin-top:4px;overflow:hidden"><div style="height:100%;width:' + pct(v, t) + '%;background:' + (C.GROUP_COLOR[g] || 'var(--ink)') + '"></div></div></div>';
    });
    html += '</div>';

    if (st.stalls.length) {
      html += '<div class="card"><div class="card-h"><div class="card-t">停滞动作</div><span class="badge warn">' + st.stalls.length + '</span></div>';
      st.stalls.forEach(function (s) {
        html += '<div class="row" style="padding:6px 0;border-top:1px dashed var(--line)"><div class="col"><div class="small">' + esc(nameOf(C.exById(S.cfg, s.id))) + '</div>' +
          '<div class="tiny muted">' + C.fmtW(s.base) + 'kg · 连续 ' + s.sessions + ' 次未摸顶，失败 ' + s.misses + ' 次</div></div>' +
          '<button class="btn sm ghost" data-act="adjust" data-ex="' + s.id + '">处理</button></div>';
      });
      html += '</div>';
    }

    html += '<h2>教练建议</h2>';
    C.tips(S.cfg, S.db, date).forEach(function (t) {
      html += '<div class="alert ' + (t.level === 'ok' ? 'info' : 'amber') + '"><span class="dot"></span><div><div class="t">' + esc(t.title) + '</div><div class="x">' + esc(t.text) + '</div></div></div>';
    });

    html += '<div class="card"><div class="card-h"><div class="card-t">周报</div><button class="btn sm" data-act="report">生成</button></div>' +
      '<div class="small muted">一键生成本周小结，复制发给教练或存微信收藏。</div></div>';
    return html;
  }
  function kpi(k, v, d) { return '<div class="kpi"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>'; }

  /* ================= 配置 ================= */
  function pageSettings() {
    var p = S.cfg.profile, rl = S.cfg.rules, tg = S.cfg.targets;
    var html = '<h1>配置</h1><div class="sub">个性化底层逻辑：课表、动作、规则、打卡问题都可改</div>';

    html += '<details class="block" open><summary>个人档案</summary><div class="body">' +
      '<div class="field-row"><label class="field"><span>称呼</span><input data-path="profile.name" value="' + esc(p.name || '') + '"></label>' +
      '<label class="field"><span>年龄</span><input type="number" data-path="profile.age" value="' + (p.age || '') + '"></label></div>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>起始体重 kg</span><input type="number" step="0.1" data-path="profile.startWeight" value="' + (p.startWeight || '') + '"></label>' +
      '<label class="field"><span>目标体重</span><input data-path="profile.targetWeight" value="' + esc(p.targetWeight || '') + '"></label></div>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>当前目标（影响教练建议判据）</span><select data-path="profile.goal">' +
      ['增重', '减脂', '维持'].map(function (g) { return '<option' + (g === (p.goal || '增重') ? ' selected' : '') + '>' + g + '</option>'; }).join('') +
      '</select></label><label class="field"><span>训练经验</span><input data-path="profile.experience" value="' + esc(p.experience || '') + '"></label></div>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>热量目标</span><input data-path="profile.kcal" value="' + esc(p.kcal || '') + '"></label>' +
      '<label class="field"><span>蛋白目标 g</span><input data-path="profile.protein" value="' + esc(p.protein || '') + '"></label></div>' +
      '<div class="tiny muted" style="margin-top:8px">这些数字只用于显示与提醒文案，不参与加重计算。</div></div></details>';

    // 日程
    html += '<details class="block"><summary>训练日程</summary><div class="body">';
    ['1', '2', '3', '4', '5', '6', '0'].forEach(function (k) {
      var names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      html += '<div class="row" style="margin-top:6px"><span class="small" style="width:52px">' + names[Number(k)] + '</span>' +
        '<select data-path="schedule.' + k + '" style="flex:1">' +
        '<option value=""' + (!S.cfg.schedule[k] ? ' selected' : '') + '>休息</option>' +
        S.cfg.days.map(function (d) { return '<option value="' + d.id + '"' + (S.cfg.schedule[k] === d.id ? ' selected' : '') + '>' + d.label + ' · ' + esc(d.name) + '</option>'; }).join('') +
        '</select></div>';
    });
    html += '<div class="spacer"></div><div class="small muted">造型日：</div><div class="chips auto" style="margin-top:4px">' +
      [1, 2, 3, 4, 5, 6, 0].map(function (n) {
        return '<button class="chip sm ' + ((S.cfg.posingDays || []).indexOf(n) >= 0 ? 'on' : '') + '" data-act="toggle-posing" data-n="' + n + '">周' + '一二三四五六日'[n - 1 < 0 ? 6 : n - 1] + '</button>';
      }).join('') + '</div></div></details>';

    // 课表动作
    html += '<details class="block"><summary>课表与动作（' + S.cfg.exercises.length + '）</summary><div class="body">';
    S.cfg.days.forEach(function (day) {
      var exs = C.planExercises(S.cfg, day.id);
      html += '<div class="divider-t">' + day.label + ' · ' + esc(day.name) + '</div>';
      exs.forEach(function (ex) {
        html += '<div class="row" style="padding:5px 0"><div class="col"><div class="small">' + star(ex) + esc(nameOf(ex)) + '</div>' +
          '<div class="tiny muted">' + ex.mode + ' · ' + ex.sets + '×' + ex.lo + '-' + ex.hi + ' · +' + ex.inc + ' · ' + esc(ex.group) + '</div></div>' +
          '<div class="wrap"><button class="btn sm ghost" data-act="edit-ex" data-ex="' + ex.id + '">编辑</button>' +
          '<button class="btn sm ghost danger" data-act="del-ex" data-ex="' + ex.id + '">删</button></div></div>';
      });
      html += '<button class="btn sm ghost block" data-act="add-ex" data-day="' + day.id + '">+ 加到 ' + day.label + '</button>';
    });
    html += '</div></details>';

    // 规则
    html += '<details class="block"><summary>进阶与减载规则</summary><div class="body">' +
      '<div class="field-row"><label class="field"><span>减载策略</span><select data-path="rules.deload">' +
      [['manual', '手动插入（推荐）'], ['auto', '每 N 周提醒'], ['off', '从不减载']].map(function (o) {
        return '<option value="' + o[0] + '"' + (rl.deload === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span>减载系数</span><input type="number" step="0.05" data-path="rules.deloadFactor" value="' + rl.deloadFactor + '"></label></div>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>停滞判定（连续 N 次未摸顶）</span><input type="number" step="1" data-path="rules.stallSessions" value="' + rl.stallSessions + '"></label>' +
      '<label class="field"><span>失败回退倍数（×步进）</span><input type="number" step="0.5" data-path="rules.backoff" value="' + rl.backoff + '"></label></div>' +
      '<div class="small muted" style="margin-top:8px">当前：完成 → 重量不变；最后一组到上限 → +步进；太重 → 回退。减载周不改基线。</div></div></details>';

    // 目标
    html += '<details class="block"><summary>目标与警戒线</summary><div class="body"><div class="field-row">' +
      '<label class="field"><span>每日步数</span><input type="number" data-path="targets.steps" value="' + tg.steps + '"></label>' +
      '<label class="field"><span>睡眠目标 h</span><input type="number" step="0.5" data-path="targets.sleep" value="' + tg.sleep + '"></label></div>' +
      '<div class="small muted" style="margin-top:10px">周组数目标</div>';
    Object.keys(tg.volume || {}).forEach(function (g) {
      html += '<div class="row" style="margin-top:6px"><span class="small" style="width:46px">' + g + '</span>' +
        '<input type="number" data-path="targets.volume.' + g + '" value="' + tg.volume[g] + '"></div>';
    });
    html += '</div></details>';

    // 问题
    html += '<details class="block"><summary>打卡问题</summary><div class="body">';
    ['morning', 'evening', 'posing'].forEach(function (kind) {
      html += '<div class="divider-t">' + C.KIND_LABEL[kind] + '</div>';
      (S.cfg.questions[kind] || []).forEach(function (q, i) {
        html += '<div style="padding:6px 0;border-top:1px dashed var(--line)"><div class="row">' +
          '<input data-path="questions.' + kind + '.' + i + '.title" value="' + esc(q.title) + '" style="flex:1">' +
          '<label class="switch tiny muted"><input type="checkbox" data-path="questions.' + kind + '.' + i + '.on"' + (q.on !== false ? ' checked' : '') + '>启用</label></div>' +
          (q.kind === 'number'
            ? '<div class="tiny muted" style="margin-top:4px">数字输入题（不需要选项）' + (q.monday_only ? ' · 仅周一显示' : '') + '</div>'
            : '<textarea rows="4" data-path="questions.' + kind + '.' + i + '.options" data-list="1" style="margin-top:4px;font-size:12px" placeholder="每行一个选项">' + esc((q.options || []).join('\n')) + '</textarea>') +
          '</div>';
      });
      html += '<button class="btn sm ghost block" data-act="add-q" data-kind="' + kind + '">+ 加问题</button>';
    });
    html += '</div></details>';

    // 云同步
    var presetGist = (window.SYNC_CFG && window.SYNC_CFG.gist) || '';
    var paired = !!(S.sync.token && S.sync.gist);
    html += '<details class="block"><summary>云同步' + (presetGist ? '（已内置）' : '（GitHub Gist）') + '</summary><div class="body">';
    if (presetGist) {
      html += '<div class="small muted">' + (paired
        ? '这台设备已配对：打开时自动拉取，改动后自动上传。'
        : '这台设备还没配对：点「配对」，把电脑上生成的同步码粘进来（一次即可）。') + '</div>' +
        '<div class="wrap" style="margin-top:8px">' +
        '<button class="btn sm" data-act="sync-now">立即同步</button>' +
        (paired ? '<button class="btn sm ghost" data-act="pair-open">重新配对</button>' : '<button class="btn sm accent" data-act="pair-open">配对</button>') +
        '<button class="btn sm ghost danger" data-act="sync-off">断开</button></div>';
    } else {
      html += '<div class="small muted">两台设备填同一个 Token 与 Gist ID，打开时自动拉取、改动后自动上传；打卡按日期合并，重量状态取更新的一份。</div>' +
        (location.protocol === 'file:' ? '<div class="tiny muted" style="margin-top:6px">当前是「本机文件」模式：想免配置自动同步，请改用正式网址。</div>' : '') +
        '<div class="alert info" style="margin-top:8px"><span class="dot"></span><div><div class="t">这两个是什么？</div>' +
        '<div class="x"><b>Token</b>：一把只能读写你私有备份的钥匙（GitHub 生成，可随时撤销，不是账号密码）。<br>' +
        '<b>Gist ID</b>：云端备份文件的编号。第一次留空，点「创建备份」会自动生成；另一台设备填同一个编号，才会看到同一份数据。</div></div></div>' +
        '<label class="field" style="margin-top:8px"><span>GitHub Token（classic，只勾 gist）</span>' +
        '<input type="password" data-sync="token" value="' + esc(S.sync.token || '') + '" placeholder="ghp_..." autocomplete="off"></label>' +
        '<label class="field" style="margin-top:8px"><span>Gist ID（留空点「创建备份」自动生成）</span>' +
        '<input data-sync="gist" value="' + esc(S.sync.gist || '') + '" placeholder="例如 4f1a2b3c..."></label>' +
        '<label class="switch small" style="margin-top:8px"><input type="checkbox" data-sync="auto"' + (S.sync.auto ? ' checked' : '') + '>自动同步（启动拉取 / 改动后上传）</label>' +
        '<div class="wrap" style="margin-top:8px"><button class="btn sm" data-act="sync-now">立即双向同步</button>' +
        '<button class="btn sm ghost" data-act="sync-create">创建备份</button>' +
        '<button class="btn sm ghost" data-act="pair-open">用配对码</button>' +
        '<button class="btn sm ghost danger" data-act="sync-off">断开</button></div>' +
        '<div class="tiny muted" style="margin-top:6px">没有 Token？<a href="https://github.com/settings/tokens/new?scopes=gist&description=coach" target="_blank" rel="noopener" style="color:var(--accent)">点这里生成</a>（只勾 gist，别的都不要）。Token 只存在本机浏览器，不会写进备份文件。</div>';
    }
    html += '<div class="tiny muted" id="syncStatus" style="margin-top:6px">' + esc(S.sync.status || (paired ? '已配置' : '未配置')) + '</div>' +
      '</div></details>';

    // 数据
    html += '<details class="block"><summary>数据与备份</summary><div class="body">' +
      '<div class="small muted">数据只存在这台设备的浏览器里。换设备/清缓存前先导出。</div>' +
      '<div class="spacer"></div><button class="btn block" data-act="export-file">导出备份（.json 文件）</button>' +
      '<div class="spacer"></div><button class="btn block ghost" data-act="export-copy">复制备份到剪贴板</button>' +
      '<div class="spacer"></div><button class="btn block ghost" data-act="import-file">从文件导入</button>' +
      '<div class="spacer"></div><button class="btn block ghost" data-act="import-paste">粘贴导入（旧版 App / 教练 JSON）</button>' +
      '<div class="spacer"></div><button class="btn block ghost" data-act="restore-bak">恢复上一版自动备份</button>' +
      '<div class="spacer"></div><button class="btn block danger" data-act="reset">清空并回到初始数据</button></div></details>';

    html += '<div class="empty tiny">v3 · 数据在本地 ' + LS.db + '</div>';
    return html;
  }

  function setPath(path, value) {
    var parts = path.split('.'), obj = S.cfg;
    for (var i = 0; i < parts.length - 1; i++) { if (!obj[parts[i]]) obj[parts[i]] = {}; obj = obj[parts[i]]; }
    obj[parts[parts.length - 1]] = value;
  }

  function exForm(ex, dayId) {
    var groups = ['胸', '背', '腿', '肩侧', '肩后', '臂', '腹', '小腿', '其他'];
    ex = ex || { id: '', name: '', day: dayId || (S.cfg.days[0] || {}).id, group: '胸', mode: 'load', unit: 'kg', w: 20, lo: 8, hi: 12, inc: 2.5, sets: 3, type: 'acc', star: false, note: '', rest: '1.5分钟', link: '' };
    openSheet('<div class="sheet-h"><div class="sheet-t">' + (ex.id ? '编辑动作' : '新增动作') + '</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
      '<input id="eId" type="hidden" value="' + esc(ex.id) + '">' +
      '<label class="field"><span>动作名</span><input id="eName" value="' + esc(ex.name) + '"></label>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>训练日</span><select id="eDay">' +
      S.cfg.days.map(function (d) { return '<option value="' + d.id + '"' + (d.id === ex.day ? ' selected' : '') + '>' + d.label + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>肌群</span><select id="eGroup">' + groups.map(function (g) { return '<option' + (g === ex.group ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>计时方式</span><select id="eMode">' +
      [['load', '杠铃/器械（kg）'], ['bodyweight', '自重（可负重）'], ['untracked', '不计重（中档/自重）']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === ex.mode ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label><label class="field"><span>单位</span><input id="eUnit" value="' + esc(ex.unit) + '"></label></div>' +
      '<div class="field-row three" style="margin-top:8px"><label class="field"><span>基线重量</span><input id="eW" type="number" step="0.5" value="' + (ex.w != null ? ex.w : 0) + '"></label>' +
      '<label class="field"><span>组数</span><input id="eSets" type="number" step="1" value="' + ex.sets + '"></label>' +
      '<label class="field"><span>步进</span><input id="eInc" type="number" step="0.5" value="' + ex.inc + '"></label></div>' +
      '<div class="field-row three" style="margin-top:8px"><label class="field"><span>次数下限</span><input id="eLo" type="number" step="1" value="' + ex.lo + '"></label>' +
      '<label class="field"><span>次数上限</span><input id="eHi" type="number" step="1" value="' + ex.hi + '"></label>' +
      '<label class="field"><span>类型</span><select id="eType">' +
      [['main', '主项'], ['acc', '次项'], ['iso', '孤立']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === ex.type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="field-row" style="margin-top:8px"><label class="field"><span>组间休息</span><input id="eRest" value="' + esc(ex.rest || '') + '"></label>' +
      '<label class="field"><span>联动组（同名共享基线）</span><input id="eLink" value="' + esc(ex.link || '') + '" placeholder="可空，如 lateral"></label></div>' +
      '<label class="field" style="margin-top:8px"><span>要点备注</span><textarea id="eNote" rows="2">' + esc(ex.note || '') + '</textarea></label>' +
      '<label class="switch small" style="margin-top:8px"><input id="eStar" type="checkbox"' + (ex.star ? ' checked' : '') + '>主项（★，首页优先显示）</label>' +
      '<div class="spacer"></div><button class="btn primary block" data-act="save-ex">保存动作</button>');
  }

  /* ================= 手册 ================= */
  function pageManual() {
    var html = '<h1>手册</h1><div class="sub">训练原则 · 备赛专项 · 饮食 · 规则</div>';
    html += '<details class="block" open><summary>训练原则</summary><div class="body small muted">' +
      '<p>· A-B-C-A-B 五分化：胸 2 次/周（15 组），背 2 次/周（19 组），侧平举 3 次/周，腿 1 次。</p>' +
      '<p>· 单次每部位直接组 ≤8，超出是垃圾容量。</p>' +
      '<p>· 组间：主项 2-3 分钟，孤立 1-1.5 分钟，绝不为了省时间砍休息。</p>' +
      '<p>· 递减组只用于孤立动作末组，是时间压缩工具不是强度工具。</p>' +
      '<p>· 主项最后一组也留 1-2 次余量（RPE≤9）；孤立末组可接近力竭。</p>' +
      '<p>· 练前 11:00 加餐（面包+香蕉），14:00 开练，热身含肩袖激活。</p>' +
      '<p>· 膝盖条款：哈克前 2 组徒手慢蹲激活，膝痛则分腿蹲换箭步蹲。</p>' +
      '<p>· 保底机制：一周练不满 4 天时只练三个主项各 3 组，绝不整周零训练。</p></div></details>';
    html += '<details class="block"><summary>健体备赛专项</summary><div class="body small muted">' +
      '<p>· 评分核心：腰肩比。腹直肌练、腹斜肌不负重（腰粗毁比例）。</p>' +
      '<p>· 腿不用极大，但小腿要在短裤下可见——提踵一周 2 次不缺席。</p>' +
      '<p>· 舞台灯光吃胸上沿：上斜推永远排在平板/下斜之前。</p>' +
      '<p>· 背以背阔为主：宽度（下拉/引体）与厚度（划船）分日。</p>' +
      '<p>· 造型是等长训练：周三/日各 10 分钟起，四个转向 + 正展背阔。</p></div></details>';
    html += '<details class="block"><summary>食堂饮食</summary><div class="body small muted">' +
      '<p>· 目标：' + (S.cfg.profile.kcal || '2650-2800') + ' kcal / 蛋白 ' + (S.cfg.profile.protein || '150-160') + 'g / 脂肪 55-65g / 碳水 330-380g。</p>' +
      '<p>· 自选餐盘：两掌蛋白质 + 一拳主食 + 不限量非淀粉蔬菜。</p>' +
      '<p>· 烹饪优先级：清蒸 &gt; 炖煮 &gt; 白灼 &gt; 炒 &gt; 炸（油炸不碰）。</p>' +
      '<p>· 猪肉选瘦、鸡鸭去皮、鱼虾随意；蛋每天至少 2 个。</p>' +
      '<p>· 肉汤菜汤不拌饭（油脂和钠都在汤里）。</p>' +
      '<p>· 食堂蛋白不够：一勺蛋白粉约 24g，练后或早餐随餐。</p>' +
      '<p>· 应酬 ≤2 次/月，当天其余两餐照常，不补偿性节食。</p>' +
      '<p>· 水 2-2.5L/天，训练日 +500ml；肌酸 3-5g 每天。</p></div></details>';
    html += '<details class="block"><summary>进阶规则（本应用实现）</summary><div class="body small muted">' +
      '<p>· 最后一组摸到上限（RPE≤9）→ 下次 +步进，次数回落 lo 重爬。</p>' +
      '<p>· 完成未到 hi → 重量不变，继续爬次数。</p>' +
      '<p>· 没完成-太重 → 自动回退一档（×回退倍数）。</p>' +
      '<p>· 自重动作摸顶 → 自动转为负重（+步进 kg）；负重太重 → 退回自重。</p>' +
      '<p>· 联动组（如周一/周四侧平举）共享基线，一边加重另一边同步。</p>' +
      '<p>· 减载：不自动排，疲劳/停滞时手动插入；减载周重量 ×' + S.cfg.rules.deloadFactor + '、组数减半、基线冻结。</p>' +
      '<p>· 停滞：连续 ' + S.cfg.rules.stallSessions + ' 次未摸顶 → 建议减载 / 换动作 / 放宽区间。</p></div></details>';
    html += '<details class="block"><summary>动作要点速查</summary><div class="body small">' +
      S.cfg.exercises.filter(function (e) { return e.note; }).map(function (e) {
        return '<p class="muted" style="margin:6px 0"><b style="color:var(--text)">' + esc(nameOf(e)) + '</b> — ' + esc(e.note) + '</p>';
      }).join('') + '</div></details>';
    html += '<div class="empty tiny">规则来源：训练打卡手册 v17 + 训练状态引擎 v7</div>';
    return html;
  }

  /* ================= 渲染 ================= */
  var PAGES = { home: pageHome, checkin: pageCheckin, engine: pageEngine, analysis: pageAnalysis, settings: pageSettings, manual: pageManual };
  function go(tab) { S.tab = tab; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function render() {
    try {
      el('view').innerHTML = (PAGES[S.tab] || pageHome)();
    } catch (e) {
      el('view').innerHTML = '<div class="card"><div class="card-t">渲染出错</div><div class="small muted">' + esc(e.message) + '</div></div>';
      console.error(e);
    }
    Array.prototype.forEach.call(document.querySelectorAll('#tabs button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === S.tab);
    });
    var d = C.today();
    el('topDate').textContent = d + ' 周' + C.weekdayCN(d) + ' · ' + (S.cfg.profile.name || '我的备赛');
    if (S.tab === 'checkin') trCount();
  }

  /* ================= 事件 ================= */
  function onClick(e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var date = C.today();

    if (act === 'nav') { closeSheet(); go(t.getAttribute('data-tab')); return; }
    if (act === 'close-sheet') { closeSheet(); return; }
    if (act === 'theme') {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', cur);
      localStorage.setItem(LS.theme, cur);
      return;
    }
    if (act === 'copy-rx') { copyText(C.rxText(S.cfg, S.db, date)); return; }
    if (act === 'copy-area') { var ta = document.querySelector('#sheet textarea'); if (ta) copyText(ta.value); return; }
    if (act === 'report') { showText('本周周报', C.weekReport(S.cfg, S.db, date)); return; }
    if (act === 'timer') { startTimer(Number(t.getAttribute('data-sec')) || 120); return; }
    if (act === 'note') {
      var exist = S.db.records.filter(function (r) { return r.date === date && r.kind === 'note'; })[0];
      openSheet('<div class="sheet-h"><div class="sheet-t">今天备注</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
        '<textarea id="noteText" rows="4" placeholder="体感、疼痛、作息…">' + esc(exist ? exist.data.text : '') + '</textarea>' +
        '<div class="spacer"></div><button class="btn primary block" data-act="save-note">保存</button>');
      return;
    }
    if (act === 'save-note') {
      var txt = el('noteText').value.trim();
      if (txt) S.db = C.putRecord(S.db, { date: date, kind: 'note', data: { text: txt } });
      save(); closeSheet(); render(); toast('已保存'); return;
    }

    // 打卡选项
    if (act === 'pick') {
      var kind = t.getAttribute('data-kind'), qid = t.getAttribute('data-qid'), exId = t.getAttribute('data-ex'), val = t.getAttribute('data-val');
      var d = ensureDraft();
      if (kind === 'training') {
        d.training.items[exId].result = val;
        var grp = t.parentNode;
        Array.prototype.forEach.call(grp.children, function (b) {
          b.classList.remove('on', 'ok', 'bad', 'warn');
          if (b === t) b.classList.add('on', toneOf(val));
        });
        trCount();
      } else if (kind === 'feel') {
        d.training.feel = val;
        Array.prototype.forEach.call(t.parentNode.children, function (b) { b.classList.toggle('on', b === t); });
      } else {
        d[kind][qid] = val;
        Array.prototype.forEach.call(t.parentNode.children, function (b) { b.classList.toggle('on', b === t); });
      }
      return;
    }
    if (act === 'fill-all') {
      var dd = ensureDraft();
      Object.keys(dd.training.items).forEach(function (id) { dd.training.items[id].result = 'done'; });
      render(); return;
    }
    if (act === 'clear-all') {
      var dc = ensureDraft();
      Object.keys(dc.training.items).forEach(function (id) { dc.training.items[id].result = null; });
      render(); return;
    }
    if (act === 'submit') { submitKind(t.getAttribute('data-kind')); return; }
    if (act === 'edit-kind') {
      var k = t.getAttribute('data-kind');
      var rec = S.db.records.filter(function (r) { return r.date === date && r.kind === k; })[0];
      if (rec) {
        if (k === 'training') {
          ensureDraft();
          (rec.data.items || []).forEach(function (it) { if (S.draft.training.items[it.id]) Object.assign(S.draft.training.items[it.id], it); });
          S.draft.training.feel = rec.data.feel || null;
        } else {
          Object.assign(ensureDraft()[k], rec.data);
          if (k === 'morning' && rec.data.sleepText) S.draft.morning.sleep = rec.data.sleepText;
          if (k === 'evening' && rec.data.stepsText) S.draft.evening.steps = rec.data.stepsText;
        }
        ensureDraft().editing[k] = true;
      }
      render(); return;
    }
    if (act === 'chart-ex') { S.chartEx = t.getAttribute('data-ex'); render(); return; }

    // 引擎
    if (act === 'adjust') { adjustSheet(t.getAttribute('data-ex')); return; }
    if (act === 'hist') { histSheet(t.getAttribute('data-ex')); return; }
    if (act === 'adjust-save') {
      var id = t.getAttribute('data-ex'), ex = C.exById(S.cfg, id), st = S.db.states[id];
      var base = num(el('fBase').value), lo = num(el('fLo').value), hi = num(el('fHi').value), inc = num(el('fInc').value), sets = num(el('fSets').value);
      if (lo == null || hi == null || lo < 1 || hi <= lo) return toast('次数区间不对：上限要大于下限');
      if (inc == null || inc <= 0) return toast('步进必须大于 0');
      ex.lo = lo; ex.hi = hi; ex.inc = inc; ex.sets = sets || ex.sets;
      if (base != null) {
        S.db.states[id] = Object.assign({}, st, { base: base });
        if (ex.link) {
          S.cfg.exercises.forEach(function (o) {
            if (o.link === ex.link && o.id !== id && S.db.states[o.id]) S.db.states[o.id] = Object.assign({}, S.db.states[o.id], { base: base });
          });
        }
      }
      save(); closeSheet(); render(); toast('已更新：' + nameOf(ex));
      return;
    }
    if (act === 'adjust-reset') {
      var rid = t.getAttribute('data-ex'), rex = C.exById(S.cfg, rid);
      var def = rex.def || {};
      rex.lo = def.lo || rex.lo; rex.hi = def.hi || rex.hi; rex.inc = def.inc || rex.inc; rex.sets = def.sets || rex.sets;
      S.db.states[rid] = Object.assign({}, S.db.states[rid], { base: rex.mode === 'bodyweight' ? 0 : (def.base != null ? def.base : rex.w) });
      save(); closeSheet(); render(); toast('已恢复默认');
      return;
    }
    if (act === 'deload-start') {
      openSheet('<div class="sheet-h"><div class="sheet-t">插入减载</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
        '<div class="small muted">减载期间：重量 ×' + S.cfg.rules.deloadFactor + '、组数减半、基线冻结。建议 7 天。</div>' +
        '<label class="field" style="margin-top:10px"><span>减载到（含当天）</span><input id="deloadTo" type="date" value="' + C.addDays(date, 6) + '"></label>' +
        '<div class="spacer"></div><button class="btn primary block" data-act="deload-confirm">开始减载</button>');
      return;
    }
    if (act === 'deload-confirm') {
      S.db.meta.deloadUntil = el('deloadTo').value || C.addDays(date, 6);
      save(); closeSheet(); render(); toast('减载已插入：至 ' + S.db.meta.deloadUntil); return;
    }
    if (act === 'deload-end') { S.db.meta.deloadUntil = null; save(); render(); toast('减载结束'); return; }

    // 配置
    if (act === 'toggle-posing') {
      var n = Number(t.getAttribute('data-n'));
      var arr = S.cfg.posingDays || [];
      var i = arr.indexOf(n);
      if (i >= 0) arr.splice(i, 1); else arr.push(n);
      save(); render(); return;
    }
    if (act === 'edit-ex') { exForm(C.exById(S.cfg, t.getAttribute('data-ex'))); return; }
    if (act === 'add-ex') { exForm(null, t.getAttribute('data-day')); return; }
    if (act === 'del-ex') {
      var did = t.getAttribute('data-ex'), dex = C.exById(S.cfg, did);
      if (confirm('删除动作「' + nameOf(dex) + '」？历史记录会保留但不再显示。')) {
        S.cfg.exercises = S.cfg.exercises.filter(function (x) { return x.id !== did; });
        save(); render();
      }
      return;
    }
    if (act === 'save-ex') { saveEx(); return; }
    if (act === 'add-q') {
      var qk = t.getAttribute('data-kind');
      S.cfg.questions[qk] = (S.cfg.questions[qk] || []).concat([{ id: 'q' + Date.now(), title: '新问题', kind: 'options', on: true, options: ['选项A', '选项B'] }]);
      save(); render(); return;
    }
    if (act === 'export-file') { download('备赛备份-' + date + '.json', JSON.stringify(C.exportPayload(S.cfg, S.db), null, 1)); toast('已导出文件'); return; }
    if (act === 'sync-now') { syncNow(); return; }
    if (act === 'sync-create') { syncCreate(); return; }
    if (act === 'pair-open') { pairSheet(); return; }
    if (act === 'pair-run') { applyPair(el('pairCode').value); return; }
    if (act === 'sync-off') {
      if (!confirm('断开云同步？本机数据不动，只清除配对信息。')) return;
      S.sync.token = ''; S.sync.gist = ''; S.sync.off = true; S.sync.status = '已断开';
      saveSync(); render(); return;
    }
    if (act === 'export-copy') { copyText(JSON.stringify(C.exportPayload(S.cfg, S.db), null, 1)); return; }
    if (act === 'import-file') { el('fileInput').click(); return; }
    if (act === 'import-paste') {
      openSheet('<div class="sheet-h"><div class="sheet-t">粘贴导入</div><button class="btn sm ghost" data-act="close-sheet">关闭</button></div>' +
        '<div class="small muted">支持：本应用完整备份、旧版 App 导出（含 states/configs/answers）、教练发来的状态 JSON。</div>' +
        '<textarea id="importText" rows="8" style="margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:11px" placeholder=\'{"states":{...}}\'></textarea>' +
        '<div class="spacer"></div><button class="btn primary block" data-act="import-run">导入</button>');
      return;
    }
    if (act === 'import-run') { runImport(el('importText').value); return; }
    if (act === 'restore-bak') {
      try {
        var bak = JSON.parse(localStorage.getItem(LS.bak) || 'null');
        if (!bak) return toast('没有自动备份');
        if (!confirm('恢复 ' + (bak.at || '').slice(0, 16).replace('T', ' ') + ' 的自动备份？当前数据会被覆盖。')) return;
        S.cfg = C.normConfig(bak.cfg); S.db = bak.db; C.ensure(S.cfg, S.db); save(); render(); toast('已恢复自动备份');
      } catch (err) { toast('备份损坏'); }
      return;
    }
    if (act === 'reset') {
      if (!confirm('清空所有打卡与状态，回到初始种子数据？')) return;
      localStorage.removeItem(LS.db); localStorage.removeItem(LS.cfg);
      S.draft = null; load(); render(); toast('已重置'); return;
    }
  }

  function saveEx() {
    var id = el('eId').value.trim() || ('x' + Date.now());
    var name = el('eName').value.trim();
    if (!name) return toast('动作名不能为空');
    var ex = {
      id: id, name: name, day: el('eDay').value, group: el('eGroup').value, groups: [el('eGroup').value],
      mode: el('eMode').value, unit: el('eUnit').value || 'kg', w: num(el('eW').value),
      lo: num(el('eLo').value), hi: num(el('eHi').value), inc: num(el('eInc').value), sets: num(el('eSets').value),
      type: el('eType').value, star: el('eStar').checked, note: el('eNote').value.trim(),
      rest: el('eRest').value.trim(), link: el('eLink').value.trim() || undefined
    };
    if (ex.lo == null || ex.hi == null || ex.hi <= ex.lo) return toast('次数区间不对');
    if (ex.inc == null || ex.inc <= 0) return toast('步进必须大于 0');
    if (!ex.def) ex.def = { lo: ex.lo, hi: ex.hi, inc: ex.inc, sets: ex.sets, base: ex.w };
    var idx = -1;
    S.cfg.exercises.forEach(function (e, i) { if (e.id === id) idx = i; });
    if (idx >= 0) S.cfg.exercises[idx] = Object.assign({}, S.cfg.exercises[idx], ex);
    else S.cfg.exercises.push(ex);
    C.ensure(S.cfg, S.db);
    save(); closeSheet(); render(); toast(idx >= 0 ? '已保存' : '已新增');
  }

  function runImport(text) {
    try {
      var payload = JSON.parse(text);
      var res = C.importPayload(S.cfg, S.db, payload);
      S.cfg = res.cfg; S.db = res.db; C.ensure(S.cfg, S.db);
      save(); closeSheet(); render(); toast(res.msg, 3200);
    } catch (err) { toast('导入失败：' + err.message, 3200); }
  }

  function onInput(e) {
    var t = e.target, act = t.getAttribute('data-act');
    if (!t.matches('[data-act]')) return;
    if (act === 'num') {
      var kind = t.getAttribute('data-kind'), qid = t.getAttribute('data-qid'), exId = t.getAttribute('data-ex');
      var d = ensureDraft();
      if (kind === 'trw') d.training.items[exId].w = num(t.value);
      else if (kind === 'trr') d.training.items[exId].reps = num(t.value);
      else d[kind][qid] = t.value;
    }
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === 'fileInput' && t.files && t.files.length) {
      var fr = new FileReader();
      fr.onload = function () { runImport(String(fr.result)); t.value = ''; };
      fr.readAsText(t.files[0]);
      return;
    }
    var path = t.getAttribute('data-path');
    var skey = t.getAttribute('data-sync');
    if (skey) {
      S.sync[skey] = t.type === 'checkbox' ? t.checked : t.value.trim();
      saveSync();
      return;
    }
    if (!path) return;
    var v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.getAttribute('data-list')) v = String(v).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (t.type === 'number') v = num(v);
    setPath(path, v);
    save();
    if (/schedule\./.test(path) || /posingDays/.test(path)) render();
  }

  /* ================= 计时器 ================= */
  function startTimer(sec) {
    if (S.timer) { clearInterval(S.timer.int); S.timer = null; }
    var pill = el('timerPill');
    pill.hidden = false; pill.classList.remove('ring');
    S.timer = { end: Date.now() + sec * 1000, int: null, sec: sec };
    function paint() {
      var left = Math.max(0, Math.round((S.timer.end - Date.now()) / 1000));
      pill.innerHTML = '<b>' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2) + '</b> <span>组间</span>';
      if (left <= 0) {
        clearInterval(S.timer.int); S.timer = null;
        pill.innerHTML = '<b>时间到</b> <span>下一组</span>'; pill.classList.add('ring');
        setTimeout(function () { pill.hidden = true; pill.classList.remove('ring'); }, 8000);
      }
    }
    paint();
    S.timer.int = setInterval(paint, 500);
    pill.onclick = function () { if (S.timer) { clearInterval(S.timer.int); S.timer = null; } pill.hidden = true; };
  }

  /* ================= 启动 ================= */
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  el('sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  load();
  var hash = (location.hash || '').replace('#', '');
  if (PAGES[hash]) S.tab = hash;
  render();
  // 一次性配对链接：#pair=<token|gist>
  if (/pair=/.test(location.hash || '')) {
    var pm = /pair=([^&]+)/.exec(location.hash);
    if (pm) {
      var ok = false;
      try { ok = applyPair(decodeURIComponent(pm[1])); } catch (e) { ok = applyPair(pm[1]); }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
      if (ok) S.tab = 'home';
    }
  }
  if (S.sync.token && S.sync.gist && S.sync.auto) setTimeout(function () { syncPull(true); }, 900);
  if (S.repairNotice) {
    save();
    setTimeout(function () { toast('已修复 ' + S.repairNotice + ' 个动作被减载写坏的基线', 4200); }, 1100);
  }
  window.__coach = { S: S, C: C, render: render, save: save, go: go };
  if (location.search.indexOf('debug') >= 0) {
    document.title = 'vw=' + window.innerWidth + ' sw=' + document.documentElement.scrollWidth + ' bw=' + document.body.scrollWidth;
  }
  // PWA：manifest 与 Service Worker 只在 http(s) 下启用（file:// 会被 CORS 拒绝）
  if (location.protocol === 'https:' || location.protocol === 'http:') {
    var manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = 'manifest.webmanifest';
    document.head.appendChild(manifestLink);
  }
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(function () { /* 离线缓存失败不影响使用 */ });
  }
})();
