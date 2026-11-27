/* 自然健体 · 电子教练 — 核心逻辑层（纯函数，无 DOM 依赖）
 * 规则：纯双进阶 / 自重进阶 / 联动组 / 手动或按需减载 / 停滞检测 / e1RM / 窗口化告警
 * 在 Node 中可 require，浏览器中挂到 window.Coach
 */
(function (G) {
  'use strict';

  /* ---------- 常量 ---------- */
  var RESULT = {
    hit:   { id: 'hit',   label: '最后一组到上限', short: '摸顶', tone: 'ok' },
    done:  { id: 'done',  label: '完成（未到上限）',     short: '完成', tone: 'mid' },
    heavy: { id: 'heavy', label: '没完成-太重',         short: '太重', tone: 'bad' },
    sets:  { id: 'sets',  label: '没完成-组数做完',     short: '组数', tone: 'bad' },
    body:  { id: 'body',  label: '没完成-身体不适',     short: '不适', tone: 'warn' }
  };
  var FEEL = ['轻松', '正常', '吃力', '很吃力'];
  var KIND_LABEL = { morning: '早间', training: '训练', evening: '晚间', posing: '造型', note: '备注' };
  var GROUP_COLOR = {
    '胸': '#2563eb', '背': '#7c3aed', '腿': '#dc2626', '肩侧': '#0891b2',
    '肩后': '#0d9488', '臂': '#d97706', '腹': '#65a30d', '小腿': '#db2777', '其他': '#6b7280'
  };

  /* ---------- 日期 ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function parseYmd(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function dow(s) { return parseYmd(s).getDay(); }               // 0=周日
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function diffDays(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function weekStart(s) { var k = dow(s); return addDays(s, k === 0 ? -6 : 1 - k); } // 周一
  function fmtMD(s) { return s.slice(5); }
  function weekdayCN(s) { return '日一二三四五六'[dow(s)]; }

  /* ---------- 数值 ---------- */
  function roundTo(v, step) { step = step || 0.5; return Math.round(v / step) * step; }
  function fmtW(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var r = Math.round(v * 100) / 100;
    return String(r);
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function avg(a) { return a.length ? sum(a) / a.length : null; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function e1rm(w, reps) { return (w || 0) * (1 + (reps || 0) / 30); }  // Epley

  /* ---------- 默认配置 ---------- */
  function defaults() {
    return {
      version: 3,
      profile: { name: '', sex: 'm', age: 32, startWeight: 0, targetWeight: '', kcal: '', protein: '', experience: '', goal: '增重' },
      rules: { mode: 'double', deload: 'manual', deloadEveryWeeks: 4, deloadFactor: 0.75, stallSessions: 3, backoff: 1, upperInc: 2.5, lowerInc: 5 },
      schedule: { '0': null, '1': 'Day1', '2': 'Day2', '3': 'Day3', '4': 'Day4', '5': 'Day5', '6': null },
      posingDays: [0, 3],
      days: [],
      exercises: [],
      targets: {
        volume: { '胸': 15, '背': 19, '肩侧': 12, '肩后': 8, '腿': 12, '臂': 6, '腹': 6, '小腿': 7 },
        steps: 7000, sleep: 7, protein: 150
      },
      questions: { morning: [], evening: [], posing: [] }
    };
  }

  function isPlain(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function mergeDeep(base, over) {
    if (!isPlain(over)) return over === undefined ? base : over;
    var out = isPlain(base) ? Object.assign({}, base) : {};
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      out[k] = (isPlain(v) && isPlain(out[k])) ? mergeDeep(out[k], v) : v;
    });
    return out;
  }
  function normConfig(cfg) { return mergeDeep(defaults(), cfg || {}); }

  /* ---------- 数据库（状态 + 记录） ---------- */
  function newDb(cfg, seed) {
    var db = { states: {}, records: [], meta: { installedAt: today(), deloadUntil: null, cycleStart: today(), version: 3 } };
    if (seed) {
      db.states = JSON.parse(JSON.stringify(seed.states || {}));
      db.records = JSON.parse(JSON.stringify(seed.records || []));
      if (seed.meta) db.meta = mergeDeep(db.meta, seed.meta);
    }
    ensure(cfg, db);
    return db;
  }

  function ensure(cfg, db) {
    db.states = db.states || {};
    cfg.exercises.forEach(function (ex) {
      var s = db.states[ex.id];
      if (!s) {
        db.states[ex.id] = { base: ex.mode === 'untracked' ? null : (ex.mode === 'bodyweight' ? 0 : ex.w), log: [] };
      } else {
        if (!Array.isArray(s.log)) s.log = [];
        if (s.base === undefined) s.base = (ex.mode === 'untracked' ? null : ex.w);
      }
    });
    return db;
  }

  function exById(cfg, id) {
    for (var i = 0; i < cfg.exercises.length; i++) if (cfg.exercises[i].id === id) return cfg.exercises[i];
    return null;
  }
  function dayById(cfg, id) {
    for (var i = 0; i < cfg.days.length; i++) if (cfg.days[i].id === id) return cfg.days[i];
    return null;
  }
  function planDay(cfg, date) { var id = cfg.schedule[String(dow(date))]; return id ? dayById(cfg, id) : null; }
  function planExercises(cfg, dayId) { return cfg.exercises.filter(function (e) { return e.day === dayId; }); }

  /* ---------- 处方 ---------- */
  function isDeload(db, date) {
    return !!(db.meta && db.meta.deloadUntil && date <= db.meta.deloadUntil);
  }

  function unitShort(ex) {
    var u = ex.unit || 'kg';
    if (u === 'kg(单边)') return 'kg/侧';
    if (u === '负重kg') return 'kg 负重';
    if (u === '自重（+负重kg）') return 'kg';
    if (u === '18kg+中档') return 'kg+档';
    return u;
  }

  function rx(cfg, db, ex, date) {
    var st = db.states[ex.id] || { base: ex.w, log: [] };
    var deload = isDeload(db, date);
    var sets = deload ? Math.max(1, Math.ceil(ex.sets / 2)) : ex.sets;
    var lo = ex.lo, hi = ex.hi;
    var base = st.base, weight = base;
    if (ex.mode === 'untracked') {
      return { sets: sets, lo: lo, hi: hi, weight: null, base: null, deload: deload,
        weightText: ex.unit, repsText: lo + '-' + hi, note: ex.note || '' };
    }
    if (deload && base != null) weight = roundTo(base * (cfg.rules.deloadFactor || 0.75), 0.5);
    if (ex.mode === 'bodyweight') {
      var add = weight || 0;
      var wtext = add > 0 ? '自重+' + fmtW(add) + 'kg' : '自重';
      return { sets: sets, lo: lo, hi: hi, weight: add, base: add, deload: deload,
        weightText: wtext, repsText: lo + '-' + hi, note: ex.note || '' };
    }
    return { sets: sets, lo: lo, hi: hi, weight: weight, base: base, deload: deload,
      weightText: fmtW(weight) + unitShort(ex), repsText: lo + '-' + hi, note: ex.note || '' };
  }

  /* ---------- 上次记录（回忆辅助） ---------- */
  function lastLog(db, exId, beforeDate) {
    var s = db.states[exId]; if (!s || !s.log || !s.log.length) return null;
    var logs = s.log.filter(function (l) { return !beforeDate || l.date < beforeDate; });
    return logs.length ? logs[logs.length - 1] : null;
  }

  /* ---------- 进阶推进 ---------- */
  function advance(cfg, db, exId, date, item) {
    var ex = exById(cfg, exId); if (!ex) return { db: db, change: null };
    var st = db.states[exId]; if (!st) return { db: db, change: null };
    var result = item.result;
    var deload = isDeload(db, date);
    var pres = rx(cfg, db, ex, date);
    var before = st.base;
    var after = before;
    var reason = '';

    // 只有非减载、且实际重量与「当天处方重量」不同，才视为校准
    // 注意：减载日的处方重量 = 基线×系数，绝不能写回基线
    if (!deload && item.w != null && !isNaN(item.w) && ex.mode !== 'untracked' && pres.weight != null) {
      var actual = Number(item.w);
      if (Math.abs(actual - pres.weight) > 0.001) { after = actual; reason = '按实际重量校准'; }
    }
    if (!deload && ex.mode !== 'untracked') {
      var inc = Number(ex.inc) || 0;
      var step = inc * (cfg.rules.backoff == null ? 1 : cfg.rules.backoff);
      if (result === 'hit') {
        if (after == null) after = 0;
        after = roundTo(after + inc, 0.5);
        reason = (reason ? reason + '；' : '') + '+' + fmtW(inc) + (ex.mode === 'bodyweight' ? 'kg 负重' : 'kg');
      } else if (result === 'heavy') {
        if (after == null) after = 0;
        after = Math.max(0, roundTo(after - step, 0.5));
        reason = (reason ? reason + '；' : '') + '-' + fmtW(step) + 'kg 回退';
      }
    } else if (deload && ex.mode !== 'untracked') {
      reason = '减载周，不改基线';
    }

    var reps = item.reps != null && !isNaN(item.reps) ? Number(item.reps)
      : (result === 'hit' ? ex.hi : result === 'done' ? Math.max(ex.lo, ex.hi - 1) : ex.lo);
    var wUsed = (item.w != null && !isNaN(item.w)) ? Number(item.w) : pres.weight;
    var entry = {
      date: date, result: result, w: after, reps: reps,
      e1rm: (ex.mode === 'load' && wUsed) ? Math.round(e1rm(wUsed, reps) * 10) / 10 : null,
      deload: deload || undefined, note: item.note || undefined
    };
    var newStates = Object.assign({}, db.states);
    newStates[exId] = Object.assign({}, st, { base: after, log: st.log.concat([entry]) });
    var db2 = Object.assign({}, db, { states: newStates });

    // 联动组：同 link 的动作共享基线
    var linked = [];
    if (ex.link && after !== before) {
      cfg.exercises.forEach(function (o) {
        if (o.link !== ex.link || o.id === ex.id) return;
        var os = db2.states[o.id]; if (!os) return;
        db2.states[o.id] = Object.assign({}, os, {
          base: after,
          log: os.log.concat([{ date: date, result: 'link', w: after, reps: null, e1rm: null, note: '与' + ex.name.replace(/[★]/g, '') + '联动' }])
        });
        linked.push(o.id);
      });
    }
    return {
      db: db2,
      change: after !== before ? { id: exId, from: before, to: after, reason: reason, linked: linked } : null
    };
  }

  /* ---------- 打卡记录 ---------- */
  function putRecord(db, rec) {
    var rs = db.records.filter(function (r) { return !(r.date === rec.date && r.kind === rec.kind); });
    rs.push(rec);
    rs.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return Object.assign({}, db, { records: rs });
  }

  function commitTraining(cfg, db, date, dayId, items, feel, note) {
    var changes = [], db2 = db;
    items.forEach(function (it) {
      if (!it || !it.result) return;
      // 记录里落满处方值，历史才可复算（吨位/组数/e1RM）
      var ex = exById(cfg, it.id);
      if (ex) {
        var pres = rx(cfg, db2, ex, date);
        if (it.w == null && ex.mode === 'load') it.w = pres.weight;
        if (it.sets == null) it.sets = pres.sets;
        if (it.reps == null) it.reps = it.result === 'hit' ? ex.hi : it.result === 'done' ? Math.max(ex.lo, ex.hi - 1) : ex.lo;
      }
      var r = advance(cfg, db2, it.id, date, it);
      db2 = r.db; if (r.change) changes.push(r.change);
    });
    db2 = putRecord(db2, { date: date, kind: 'training', data: { day: dayId, items: items, feel: feel || null, note: note || '' } });
    return { db: db2, changes: changes };
  }

  function expectedKinds(cfg, date) {
    var d = planDay(cfg, date);
    var kinds = ['morning', 'evening'];
    if (d) kinds.splice(1, 0, 'training');
    var pd = (cfg.posingDays || []).map(Number);
    if (pd.indexOf(dow(date)) >= 0) kinds.splice(kinds.length - 1, 0, 'posing');
    return kinds;
  }
  function doneKinds(db, date) {
    var m = {};
    db.records.forEach(function (r) { if (r.date === date) m[r.kind] = true; });
    return m;
  }

  /* ---------- 统计 ---------- */
  function recordMap(db) {
    var m = {};
    db.records.forEach(function (r) { (m[r.date] = m[r.date] || {})[r.kind] = r; });
    return m;
  }

  function bodySeries(db) {
    var out = [];
    db.records.forEach(function (r) {
      if (r.kind === 'morning' && r.data && r.data.weight != null) out.push({ date: r.date, v: Number(r.data.weight) });
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return out;
  }

  function movingAvg(series, days) {
    return series.map(function (p, i) {
      var from = addDays(p.date, -(days - 1));
      var win = series.slice(0, i + 1).filter(function (q) { return q.date >= from; });
      return { date: p.date, v: Math.round(avg(win.map(function (q) { return q.v; })) * 100) / 100 };
    });
  }

  function weeklyAvg(series) {
    var map = {};
    series.forEach(function (p) { var k = weekStart(p.date); (map[k] = map[k] || []).push(p.v); });
    return Object.keys(map).sort().map(function (k) { return { start: k, v: Math.round(avg(map[k]) * 100) / 100, n: map[k].length }; });
  }

  function trainingRecords(db, sinceDate) {
    return db.records.filter(function (r) { return r.kind === 'training' && (!sinceDate || r.date >= sinceDate); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  function stats(cfg, db, date) {
    date = date || today();
    var body = bodySeries(db);
    var ma = movingAvg(body, 7);
    var wk = weeklyAvg(body);
    var latest = body.length ? body[body.length - 1] : null;
    var maLatest = ma.length ? ma[ma.length - 1] : null;
    var last14 = body.filter(function (p) { return p.date >= addDays(date, -14); });
    var first14 = last14.length > 1 ? last14[0].v : null;
    var delta14 = (latest && first14 != null) ? Math.round((latest.v - first14) * 10) / 10 : null;

    var weekFrom = weekStart(date);
    var trs = trainingRecords(db);
    var thisWeek = trs.filter(function (r) { return r.date >= weekFrom && r.date <= date; });
    var plannedDays = Object.keys(cfg.schedule).filter(function (k) { return !!cfg.schedule[k]; }).length;

    // 周吨位 / 部位组数（只统计有结构化 items 的记录）
    var tonnage = 0, setsByGroup = {}, totalSets = 0;
    thisWeek.forEach(function (r) {
      (r.data.items || []).forEach(function (it) {
        if (!it || !it.result) return;
        var ex = exById(cfg, it.id); if (!ex) return;
        var sets = it.sets != null ? it.sets : ex.sets;
        totalSets += sets;
        if (ex.split) {
          var tot = ex.sets || 1;
          Object.keys(ex.split).forEach(function (g) { setsByGroup[g] = (setsByGroup[g] || 0) + Math.round(ex.split[g] * sets / tot); });
        } else {
          (ex.groups || [ex.group]).forEach(function (g) { setsByGroup[g] = (setsByGroup[g] || 0) + sets; });
        }
        if (ex.mode === 'load' && it.w != null) tonnage += it.w * (it.reps || ex.lo) * sets;
      });
    });

    // 最近 8 周
    var weeks = [];
    for (var i = 7; i >= 0; i--) {
      var ws = addDays(weekFrom, -7 * i);
      var we = addDays(ws, 6);
      var rs = trs.filter(function (r) { return r.date >= ws && r.date <= we; });
      var ton = 0;
      rs.forEach(function (r) {
        (r.data.items || []).forEach(function (it) {
          var ex = it && exById(cfg, it.id); if (!ex || ex.mode !== 'load' || it.w == null) return;
          ton += it.w * (it.reps || ex.lo) * (it.sets != null ? it.sets : ex.sets);
        });
      });
      weeks.push({ start: ws, sessions: rs.length, tonnage: Math.round(ton), label: fmtMD(ws) });
    }

    // 睡眠 / 步数 / 蛋白（最近 7 天）
    var from7 = addDays(date, -6);
    var sleeps = [], steps = [], proteinHit = 0, proteinDays = 0, creatineMiss = 0, creatineDays = 0, posingDays = 0;
    db.records.forEach(function (r) {
      if (r.date < from7 || r.date > date) return;
      if (r.kind === 'morning') {
        if (r.data.sleep != null) sleeps.push(Number(r.data.sleep));
        if (r.data.protein) { proteinDays++; if (/够了/.test(r.data.protein)) proteinHit++; }
      }
      if (r.kind === 'evening') {
        if (r.data.steps != null) steps.push(Number(r.data.steps));
        if (r.data.protein_e) { proteinDays++; if (/够了/.test(r.data.protein_e)) proteinHit++; }
        if (r.data.creatine) { creatineDays++; if (!/5g/.test(r.data.creatine)) creatineMiss++; }
      }
      if (r.kind === 'posing') posingDays++;
    });

    // e1RM 序列
    var e1 = {};
    cfg.exercises.forEach(function (ex) {
      var s = db.states[ex.id]; if (!s) return;
      var pts = (s.log || []).filter(function (l) { return l.e1rm; }).map(function (l) { return { date: l.date, v: l.e1rm }; });
      if (pts.length) e1[ex.id] = pts;
    });

    // PR
    var prs = [];
    cfg.exercises.forEach(function (ex) {
      var s = db.states[ex.id]; if (!s || !s.log) return;
      var best = null;
      s.log.forEach(function (l) { if (l.e1rm && (!best || l.e1rm > best.v)) best = { v: l.e1rm, date: l.date }; });
      if (best) prs.push({ id: ex.id, name: ex.name, group: ex.group, v: best.v, date: best.date, unit: 'kg' });
    });
    prs.sort(function (a, b) { return b.v - a.v; });

    // 停滞：启用后连续 N 次没有摸顶（重量自然不涨）
    var stalls = [];
    var since = db.meta.installedAt || '0000-00-00';
    cfg.exercises.forEach(function (ex) {
      var s = db.states[ex.id]; if (!s || !s.log) return;
      var recent = s.log.filter(function (l) { return l.date >= since && l.result !== 'link'; });
      var need = cfg.rules.stallSessions || 3;
      if (recent.length < need) return;
      var tail = recent.slice(-need);
      var hits = tail.filter(function (l) { return l.result === 'hit'; }).length;
      var misses = tail.filter(function (l) { return l.result === 'heavy' || l.result === 'sets'; }).length;
      if (hits === 0) stalls.push({ id: ex.id, name: ex.name, base: s.base, sessions: tail.length, misses: misses, date: tail[tail.length - 1].date });
    });

    var lastTrain = trs.length ? trs[trs.length - 1].date : null;
    return {
      date: date, body: { series: body, ma: ma, weekly: wk, latest: latest, maLatest: maLatest, delta14: delta14 },
      week: { from: weekFrom, sessions: thisWeek.length, planned: plannedDays, tonnage: Math.round(tonnage), sets: totalSets, byGroup: setsByGroup },
      weeks: weeks, e1rm: e1, prs: prs, stalls: stalls,
      sleep: { avg7: avg(sleeps), short7: sleeps.filter(function (s) { return s < 6; }).length, n: sleeps.length },
      steps: { avg7: avg(steps), n: steps.length },
      protein: { hit: proteinHit, days: proteinDays },
      creatine: { miss: creatineMiss, days: creatineDays },
      posing: { days: posingDays },
      adherence: { planned: plannedDays, done: thisWeek.length, lastTrain: lastTrain },
      totals: { sessions: trs.length }
    };
  }

  /* ---------- 告警（窗口化，不看全历史） ---------- */
  function alerts(cfg, db, date) {
    date = date || today();
    var out = [];
    var st = stats(cfg, db, date);
    var from7 = addDays(date, -6);

    // 肌酸：最近 7 天里 ≥2 天不足
    var creatine = db.records.filter(function (r) {
      return r.date >= from7 && r.kind === 'evening' && r.data.creatine && !/5g/.test(r.data.creatine);
    });
    if (creatine.length >= 2) out.push({ level: 'amber', key: 'creatine', title: '肌酸欠账 ' + creatine.length + ' 天',
      text: '最近一周有 ' + creatine.length + ' 天不足 5g。饱和靠每天，固定早餐后吃。' });

    // 睡眠
    if (st.sleep.short7 >= 2) out.push({ level: 'amber', key: 'sleep', title: '睡眠不足 ' + st.sleep.short7 + ' 次',
      text: '一周内 <6 小时 ' + st.sleep.short7 + ' 次，按手册当周主项各减 1 组，优先 23:00 上床。' });

    // 体重 2 周周均下降
    var w = st.body.weekly;
    if (w.length >= 3) {
      var a = w[w.length - 1], b = w[w.length - 2], c = w[w.length - 3];
      if (a.v < b.v && b.v < c.v) out.push({ level: 'amber', key: 'weightDown', title: '体重连续 2 周下降',
        text: '周均 ' + fmtW(c.v) + ' → ' + fmtW(b.v) + ' → ' + fmtW(a.v) + 'kg，+碳水 100g/天。' });
      if (a.v - c.v >= 0.8) out.push({ level: 'amber', key: 'weightUp', title: '体重 2 周涨 ' + fmtW(a.v - c.v) + 'kg',
        text: '增速偏快，涨的是肌肉还是脂肪要看腰围：涨 >0.5cm/两周就 -碳水 30-40g/天。' });
    }

    // 蛋白
    if (st.protein.days >= 4 && st.protein.hit / st.protein.days < 0.6) out.push({ level: 'amber', key: 'protein', title: '蛋白达标率偏低',
      text: '最近一周只有 ' + st.protein.hit + '/' + st.protein.days + ' 餐达标，差的口子用一勺蛋白粉（24g）补。' });

    // 步数
    if (st.steps.n >= 3 && st.steps.avg7 < (cfg.targets.steps || 7000) - 800) out.push({ level: 'info', key: 'steps', title: '步数偏低',
      text: '日均 ' + Math.round(st.steps.avg7) + ' 步，目标 ' + cfg.targets.steps + '+；饭后走 15 分钟就够。' });

    // 训练频率
    if (st.adherence.done < st.adherence.planned && diffDays(weekStart(date), date) >= 4) {
      out.push({ level: 'info', key: 'adherence', title: '本周还差 ' + (st.adherence.planned - st.adherence.done) + ' 练',
        text: '时间不够就走保底版：只练周一胸主项、周二背主项、周三腿主项各 3 组，绝不整周零训练。' });
    }

    // 训练中断
    if (st.adherence.lastTrain && diffDays(st.adherence.lastTrain, date) >= 5) {
      out.push({ level: 'amber', key: 'gap', title: '已 ' + diffDays(st.adherence.lastTrain, date) + ' 天没训练',
        text: '恢复第一周别冲重量：全部按 -10% 起步，2 次训练内回原基线。' });
    }

    // 停滞
    if (st.stalls.length) out.push({ level: 'info', key: 'stall', title: st.stalls.length + ' 个动作停滞',
      text: st.stalls.map(function (s) { return s.name.replace(/[★]/g, ''); }).slice(0, 3).join('、') + ' 连续 ' + (cfg.rules.stallSessions || 3) + ' 次没加重，去引擎页看建议。' });

    // 造型
    if (st.posing.days === 0 && (cfg.posingDays || []).length) out.push({ level: 'info', key: 'posing', title: '本周还没练造型',
      text: '周三/日各 10 分钟，四个转向 + 正展背阔；这是健体的胜负手。' });

    return out;
  }

  /* ---------- 教练建议（可执行） ---------- */
  function tips(cfg, db, date) {
    date = date || today();
    var st = stats(cfg, db, date);
    var out = [];
    st.stalls.forEach(function (s) {
      var ex = exById(cfg, s.id);
      var alts = cfg.exercises.filter(function (o) { return o.id !== s.id && o.group === ex.group && o.mode !== 'untracked'; }).slice(0, 2);
      out.push({
        level: 'warn', title: s.name.replace(/[★]/g, '') + ' 停滞 ' + s.sessions + ' 次',
        text: '当前 ' + fmtW(s.base) + 'kg。选项：① 减载一周（×0.75）后重爬；② 换同类动作 4 周：' +
          (alts.length ? alts.map(function (a) { return a.name.replace(/[★]/g, ''); }).join(' / ') : '保持动作但加一次技术日') + '；③ 把 ' + ex.lo + '-' + ex.hi + ' 区间先放宽 2 次。'
      });
    });
    if (st.body.delta14 != null) {
      var goal = (cfg.profile && cfg.profile.goal) || '增重';
      if (goal.indexOf('减') >= 0) {
        if (st.body.delta14 >= -0.2) out.push({ level: 'warn', title: '两周体重 ' + fmtW(st.body.delta14) + 'kg', text: '减脂期掉得太慢：先查有没有偷吃，再把步数提到 9000+，不要先砍蛋白。' });
        else if (st.body.delta14 <= -1.2) out.push({ level: 'warn', title: '两周掉了 ' + fmtW(-st.body.delta14) + 'kg', text: '掉太快容易掉肌肉：碳水加回 50g/天，蛋白保持 160g+。' });
        else out.push({ level: 'ok', title: '减脂节奏正常（两周 ' + fmtW(st.body.delta14) + 'kg）', text: '按每周 -0.3~-0.5kg 走，训练强度不降。' });
      } else if (goal.indexOf('维持') >= 0) {
        if (Math.abs(st.body.delta14) >= 0.6) out.push({ level: 'info', title: '体重在漂（两周 ' + fmtW(st.body.delta14) + 'kg）', text: '维持期先把热量校准回来：增减碳水 50g 试两周。' });
        else out.push({ level: 'ok', title: '体重稳定（两周 ' + fmtW(st.body.delta14) + 'kg）', text: '维持期重点看训练表现和腰围，不看体重小数点。' });
      } else if (st.body.delta14 <= -0.3) out.push({ level: 'warn', title: '两周体重 ' + fmtW(st.body.delta14) + 'kg', text: '增重期掉体重先查吃的：+碳水 100g/天（约 1 碗半米饭），蛋白不动。' });
      else if (st.body.delta14 >= 1.2) out.push({ level: 'info', title: '两周 +' + fmtW(st.body.delta14) + 'kg', text: '增速偏快，腰围每周一量；若腰围同步涨，先减碳水 30-40g 而不是减蛋白。' });
      else out.push({ level: 'ok', title: '体重节奏正常（两周 ' + fmtW(st.body.delta14) + 'kg）', text: '按 ' + (cfg.profile.targetWeight || '78-80') + 'kg 的路径走，保持当前热量。' });
    }
    var mains = cfg.exercises.filter(function (e) { return e.star && e.mode === 'load'; });
    mains.forEach(function (ex) {
      var s = db.states[ex.id]; if (!s || !s.log.length) return;
      var last = s.log[s.log.length - 1];
      if (last.date === date && last.result === 'hit') out.push({ level: 'ok', title: 'PR 推进：' + ex.name.replace(/[★]/g, ''), text: '摸顶成功，下次 ' + fmtW(s.base) + unitShort(ex) + ' 从 ' + ex.lo + ' 次重爬。' });
    });
    if (!out.length) out.push({ level: 'ok', title: '按处方执行', text: '没有需要干预的信号；今天只管把主项做满、吃够蛋白。' });
    return out;
  }

  /* ---------- 周报（可复制给教练） ---------- */
  function weekReport(cfg, db, date) {
    date = date || today();
    var st = stats(cfg, db, date);
    var lines = [];
    lines.push('【' + st.week.from.slice(5) + ' ~ ' + date.slice(5) + ' 周报】');
    lines.push('训练 ' + st.week.sessions + '/' + st.week.planned + ' 次，总组数 ' + st.week.sets + '，吨位 ' + st.week.tonnage + 'kg');
    var groups = Object.keys(st.week.byGroup);
    if (groups.length) lines.push('部位组数：' + groups.map(function (g) { return g + ' ' + st.week.byGroup[g]; }).join(' / '));
    if (st.body.latest) lines.push('体重 ' + fmtW(st.body.latest.v) + 'kg（7日均 ' + fmtW(st.body.maLatest && st.body.maLatest.v) + '，两周 ' + (st.body.delta14 > 0 ? '+' : '') + fmtW(st.body.delta14) + 'kg）');
    if (st.sleep.n) lines.push('睡眠 ' + fmtW(st.sleep.avg7) + 'h 均（<6h ' + st.sleep.short7 + ' 次）');
    if (st.protein.days) lines.push('蛋白达标 ' + st.protein.hit + '/' + st.protein.days + ' 餐');
    if (st.prs.length) lines.push('PR：' + st.prs.slice(0, 4).map(function (p) { return p.name.replace(/[★]/g, '') + ' e1RM ' + fmtW(p.v); }).join('；'));
    var ch = [];
    cfg.exercises.forEach(function (ex) {
      var s = db.states[ex.id];
      if (s && s.log && s.log.length && s.log[s.log.length - 1].date >= st.week.from) {
        ch.push(ex.name.replace(/[★]/g, '') + ' ' + (ex.mode === 'bodyweight' ? '自重+' + fmtW(s.base) : ex.mode === 'untracked' ? ex.unit : fmtW(s.base) + 'kg'));
      }
    });
    if (ch.length) lines.push('下周处方：' + ch.join('｜'));
    return lines.join('\n');
  }

  /* ---------- 处方文本（复制到微信） ---------- */
  function rxText(cfg, db, date) {
    var d = planDay(cfg, date);
    if (!d) return '今天休息日：步数 7000+，蛋白吃够，睡够 7 小时。';
    var out = ['【' + date.slice(5) + ' ' + d.label + ' ' + d.name + '】'];
    planExercises(cfg, d.id).forEach(function (ex) {
      var r = rx(cfg, db, ex, date);
      out.push(ex.name.replace(/[★]/g, '') + '  ' + r.weightText + ' × ' + r.sets + '组 × ' + r.repsText);
    });
    out.push('组间：主项 2.5 分钟 / 孤立 1 分钟；主项永不力竭。');
    return out.join('\n');
  }

  /* ---------- 修复：减载期间被写坏的基线 ---------- */
  // 旧版本 bug：减载日打卡时把「减载重量」当实际重量校准写回了 base。
  // 判定：日志末尾是一段减载记录，且当前基线低于减载前的重量 → 回补到减载前。
  // 已经练回去（基线 ≥ 减载前）的不动。
  function findDeloadRepairs(cfg, db) {
    var out = [];
    cfg.exercises.forEach(function (ex) {
      var st = db.states[ex.id];
      if (!st || !st.log || !st.log.length || st.base == null) return;
      var i = st.log.length - 1;
      while (i >= 0 && st.log[i].deload) i--;
      if (i === st.log.length - 1) return;
      var prev = i >= 0 ? st.log[i] : null;
      var pre = (prev && prev.w != null) ? prev.w : (ex.mode === 'bodyweight' ? 0 : ex.w);
      if (pre == null) return;
      if (st.base >= pre - 0.001) return;
      out.push({ id: ex.id, name: ex.name, base: st.base, restore: pre });
    });
    return out;
  }

  function applyDeloadRepairs(cfg, db) {
    var list = findDeloadRepairs(cfg, db);
    if (!list.length) return { db: db, list: list };
    var states = Object.assign({}, db.states);
    list.forEach(function (r) { states[r.id] = Object.assign({}, states[r.id], { base: r.restore }); });
    return { db: Object.assign({}, db, { states: states }), list: list };
  }

  /* ---------- 双设备合并（云同步用） ---------- */
  function lastLogDate(st) {
    if (!st || !st.log || !st.log.length) return '';
    return st.log[st.log.length - 1].date || '';
  }

  // remoteNewer=true 表示云端快照比本机新：同一记录冲突时以云端为准
  function mergeDb(local, remote, remoteNewer) {
    local = local || {}; remote = remote || {};
    var recMap = {};
    (local.records || []).forEach(function (r) { recMap[r.date + '|' + r.kind] = r; });
    (remote.records || []).forEach(function (r) {
      var k = r.date + '|' + r.kind;
      if (!recMap[k] || remoteNewer) recMap[k] = r;
    });
    var records = Object.keys(recMap).map(function (k) { return recMap[k]; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

    var states = {};
    Object.keys(local.states || {}).forEach(function (id) { states[id] = local.states[id]; });
    Object.keys(remote.states || {}).forEach(function (id) {
      var a = local.states[id], b = remote.states[id];
      if (!a) { states[id] = b; return; }
      var la = lastLogDate(a), lb = lastLogDate(b);
      if (lb > la) { states[id] = b; return; }
      if (lb === la && remoteNewer && (b.log || []).length >= (a.log || []).length) states[id] = b;
    });

    var lm = local.meta || {}, rm = remote.meta || {};
    var meta = Object.assign({}, lm, rm);
    var installed = [lm.installedAt, rm.installedAt].filter(Boolean).sort();
    meta.installedAt = installed[0] || today();
    meta.updatedAt = Math.max(lm.updatedAt || 0, rm.updatedAt || 0);
    return { states: states, records: records, meta: meta };
  }

  /* ---------- 迁移：旧版 App 导出的 JSON ---------- */
  function mapSleepText(t) {
    t = String(t || '');
    if (/不足/.test(t)) return 5.5;
    if (/6\s*-\s*7/.test(t)) return 6.5;
    if (/7\s*-\s*8/.test(t)) return 7.5;
    if (/超过\s*8/.test(t)) return 8.5;
    var m = t.match(/(\d+(\.\d+)?)/); return m ? parseFloat(m[1]) : null;
  }
  function mapStepsText(t) {
    t = String(t || '');
    if (/不足/.test(t)) return 4000;
    if (/5000\s*-\s*7000/.test(t)) return 6000;
    if (/7000\s*-\s*9000/.test(t)) return 8000;
    if (/9000/.test(t)) return 9500;
    var m = t.match(/(\d{3,})/); return m ? parseFloat(m[1]) : null;
  }

  function migrateLegacy(cfg, payload) {
    var report = { states: 0, records: 0, overrides: 0, skipped: 0 };
    var newCfg = JSON.parse(JSON.stringify(cfg));
    var overrides = payload.configs || {};
    Object.keys(overrides).forEach(function (id) {
      var ex = newCfg.exercises.filter(function (e) { return e.id === id; })[0];
      if (!ex) return;
      var o = overrides[id];
      if (o.lo != null) ex.lo = Number(o.lo);
      if (o.hi != null) ex.hi = Number(o.hi);
      if (o.inc != null) ex.inc = Number(o.inc);
      report.overrides++;
    });

    var states = {};
    var srcStates = payload.states || {};
    Object.keys(srcStates).forEach(function (id) {
      var s = srcStates[id];
      if (!newCfg.exercises.some(function (e) { return e.id === id; })) { report.skipped++; return; }
      states[id] = {
        base: s.baseWeight === undefined ? s.base : s.baseWeight,
        log: (s.log || []).map(function (l) {
          return { date: l.date, result: l.success ? 'done' : 'miss_weight', w: s.baseWeight, reps: null, e1rm: null, imported: true };
        })
      };
      report.states++;
    });

    var recs = [];
    (payload.records || []).forEach(function (r) {
      var ans = r.answers || [];
      var get = function (re) { for (var i = 0; i < ans.length; i++) if (re.test(ans[i].q)) return ans[i].a; return null; };
      if (r.kind === 'morning') {
        recs.push({ date: r.date, kind: 'morning', data: {
          weight: get(/体重/) ? parseFloat(get(/体重/)) : null,
          sleep: get(/睡眠/) ? mapSleepText(get(/睡眠/)) : null,
          protein: get(/早餐/) || null, readiness: null
        } });
        report.records++;
      } else if (r.kind === 'evening') {
        recs.push({ date: r.date, kind: 'evening', data: {
          protein_e: get(/晚餐/) || null, creatine: get(/肌酸/) || null,
          steps: get(/步数/) ? mapStepsText(get(/步数/)) : null
        } });
        report.records++;
      } else if (r.kind === 'posing') {
        var t = get(/造型/) || '';
        var m = t.match(/(\d+)/);
        recs.push({ date: r.date, kind: 'posing', data: { minutes: m ? parseInt(m[1], 10) : 10 } });
        report.records++;
      } else if (r.kind === 'training') {
        var items = [];
        ans.forEach(function (a) {
          var name = String(a.q).split('｜')[0].replace(/[★]/g, '').trim();
          var ex = newCfg.exercises.filter(function (e) { return name.indexOf(e.name.replace(/[★]/g, '').trim().slice(0, 8)) === 0; })[0];
          if (!ex) return;
          var res = /摸hi|摸 hi/.test(a.a) ? 'hit' : /太重/.test(a.a) ? 'heavy' : /组数/.test(a.a) ? 'sets' : /不舒服/.test(a.a) ? 'body' : 'done';
          items.push({ id: ex.id, result: res, w: null, reps: null });
        });
        recs.push({ date: r.date, kind: 'training', data: { day: null, items: items, feel: null, note: '', imported: true } });
        report.records++;
      }
    });
    return { cfg: newCfg, states: states, records: recs, report: report };
  }

  /* ---------- 导入/导出 ---------- */
  function exportPayload(cfg, db) {
    return { app: 'natty-coach', version: cfg.version || 3, exportedAt: new Date().toISOString(), config: cfg, states: db.states, records: db.records, meta: db.meta };
  }

  function importPayload(cfg, db, payload) {
    // 1) 本应用完整备份
    if (payload && payload.app === 'natty-coach') {
      return { cfg: normConfig(payload.config || cfg), db: { states: payload.states || db.states, records: payload.records || db.records, meta: mergeDeep(db.meta, payload.meta || {}) }, msg: '完整备份已恢复（含配置与全部记录）' };
    }
    // 2) 旧版 App 导出 / 教练状态 JSON
    if (payload && (payload.states || payload.configs)) {
      var m = migrateLegacy(cfg, payload);
      var mergedStates = Object.assign({}, db.states, m.states);
      var mergedRecords = db.records.slice();
      m.records.forEach(function (r) {
        mergedRecords = mergedRecords.filter(function (o) { return !(o.date === r.date && o.kind === r.kind); });
        mergedRecords.push(r);
      });
      return {
        cfg: m.cfg, db: { states: mergedStates, records: mergedRecords, meta: db.meta },
        msg: '导入成功：' + m.report.states + ' 个动作状态 / ' + m.report.records + ' 条记录 / ' + m.report.overrides + ' 项动作参数'
      };
    }
    throw new Error('无法识别的数据格式');
  }

  /* ---------- 导出给 Node 测试 ---------- */
  var api = {
    RESULT: RESULT, FEEL: FEEL, KIND_LABEL: KIND_LABEL, GROUP_COLOR: GROUP_COLOR,
    ymd: ymd, today: today, parseYmd: parseYmd, dow: dow, addDays: addDays, diffDays: diffDays,
    weekStart: weekStart, fmtMD: fmtMD, weekdayCN: weekdayCN, roundTo: roundTo, fmtW: fmtW, e1rm: e1rm,
    defaults: defaults, mergeDeep: mergeDeep, normConfig: normConfig, newDb: newDb, ensure: ensure,
    exById: exById, dayById: dayById, planDay: planDay, planExercises: planExercises,
    isDeload: isDeload, rx: rx, unitShort: unitShort, lastLog: lastLog,
    advance: advance, putRecord: putRecord, commitTraining: commitTraining,
    expectedKinds: expectedKinds, doneKinds: doneKinds, recordMap: recordMap,
    bodySeries: bodySeries, movingAvg: movingAvg, weeklyAvg: weeklyAvg,
    stats: stats, alerts: alerts, tips: tips, weekReport: weekReport, rxText: rxText,
    lastLogDate: lastLogDate, mergeDb: mergeDb, findDeloadRepairs: findDeloadRepairs, applyDeloadRepairs: applyDeloadRepairs,
    migrateLegacy: migrateLegacy, exportPayload: exportPayload, importPayload: importPayload
  };
  G.Coach = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
