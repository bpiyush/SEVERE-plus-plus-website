/* Hand-rolled SVG charts. No libraries. Each chart redraws on resize. */
(() => {
const NS = "http://www.w3.org/2000/svg";
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, parent, text) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};
const html = (tag, attrs = {}, parent, text) => {
  const n = document.createElement(tag);
  for (const k in attrs) k === "class" ? (n.className = attrs[k]) : n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};
const NONSUP = M.filter(m => !m.sup);
const famColor = f => FAM[f].color;

// ranks: 1 = best. Returns Map(method -> rank) among methods with a value.
function rankMap(methods, get, hi = true) {
  const arr = methods.map(m => [m, get(m)]).filter(d => d[1] != null);
  arr.sort((a, b) => (hi ? b[1] - a[1] : a[1] - b[1]));
  const r = new Map();
  arr.forEach((d, i) => r.set(d[0], i + 1));
  return r;
}
function avgRanks(v) {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const a = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = a;
    i = j + 1;
  }
  return r;
}
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const a = avgRanks(xs), b = avgRanks(ys);
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : null;
}
// Spearman between two settings over a set of methods; sign-adjusted so +1 always means "same ordering of goodness".
function corr(methods, sa, sb) {
  const ms = methods.filter(m => S[sa].get(m) != null && S[sb].get(m) != null);
  const xs = ms.map(m => (S[sa].hi ? 1 : -1) * S[sa].get(m));
  const ys = ms.map(m => (S[sb].hi ? 1 : -1) * S[sb].get(m));
  return { rho: spearman(xs, ys), n: ms.length };
}
const f2 = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);

// Redraw on width change only (mobile browsers fire resize on scroll).
function responsive(node, draw) {
  let w = 0;
  const go = () => { const nw = Math.round(node.getBoundingClientRect().width); if (nw && nw !== w) { w = nw; draw(w); } };
  new ResizeObserver(go).observe(node);
  go();
  return () => { w = 0; go(); };
}
function readout(container, text) { container.textContent = text; }

/* ------------------------------------------------------------------ 1. rank flips */
function bumpChart(root) {
  const svgHost = $(".chart-svg", root), out = $(".readout", root), legend = $(".legend", root);
  const state = { mode: "ft", hide: new Set(), pin: null, hover: null };
  const cols = DSs.map((d, i) => i);

  legend.innerHTML = "";
  Object.keys(FAM).forEach(f => {
    const b = html("button", { class: "chip on", type: "button", "aria-pressed": "true" }, legend);
    html("i", { style: `background:${famColor(f)}` }, b);
    b.append(FAM[f].name);
    b.onclick = () => {
      state.hide.has(f) ? state.hide.delete(f) : state.hide.add(f);
      b.classList.toggle("on", !state.hide.has(f));
      b.setAttribute("aria-pressed", !state.hide.has(f));
      redraw();
    };
  });
  root.querySelectorAll("[data-mode]").forEach(b => (b.onclick = () => {
    state.mode = b.dataset.mode;
    root.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("on", x === b));
    redraw();
  }));

  function draw(W) {
    svgHost.innerHTML = "";
    const vis = NONSUP.filter(m => !state.hide.has(m.fam));
    const narrow = W < 600;
    const L = narrow ? 78 : 118, R = narrow ? 78 : 118, top = 46, rh = narrow ? 17 : 19;
    const H = top + Math.max(vis.length, 1) * rh + 14;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Ranking of methods across six downstream datasets; rankings change from column to column." }, svgHost);
    const cx = i => L + (W - L - R) * i / (cols.length - 1);
    const R_ = cols.map(i => rankMap(vis, m => S[state.mode + i].get(m)));
    const y = r => top + (r - 0.5) * rh;

    cols.forEach(i => {
      el("line", { x1: cx(i), x2: cx(i), y1: top - 12, y2: H - 10, class: "grid" }, svg);
      const t = el("text", { x: cx(i), y: 16, "text-anchor": "middle", class: "colh" + (i === 0 ? " strong" : ""), style: narrow ? "font-size:9.5px" : "" }, svg, narrow ? ["K400", "UCF", "NTU", "Gym", "SSv2", "EK"][i] : DSs[i]);
      if (i === 0) el("text", { x: cx(i), y: 30, "text-anchor": "middle", class: "note-s" }, svg, "the usual benchmark");
    });
    const gs = [];
    vis.forEach(m => {
      const pts = cols.map(i => R_[i].get(m) != null ? [cx(i), y(R_[i].get(m))] : null);
      const seg = [];
      let d = "";
      for (let i = 0; i < pts.length; i++) {
        if (!pts[i]) continue;
        if (i > 0 && pts[i - 1]) {
          const mx = (pts[i - 1][0] + pts[i][0]) / 2;
          d += ` C${mx},${pts[i - 1][1]} ${mx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
        } else d += ` M${pts[i][0]},${pts[i][1]}`;
      }
      const g = el("g", { class: "ln", style: `--c:${famColor(m.fam)}` }, svg);
      el("path", { d, class: "p" }, g);
      el("path", { d, class: "hit" }, g);
      pts.forEach(p => p && el("circle", { cx: p[0], cy: p[1], r: 2.6 }, g));
      // end labels: left by first column rank (if exists), right by last
      const lr = R_[0].get(m), rr = R_[cols.length - 1].get(m);
      const nm = narrow && m.id.length > 10 ? m.id.slice(0, 9) + "…" : m.id;
      if (lr != null) el("text", { x: L - 9, y: y(lr) + 3.5, "text-anchor": "end", class: "lab" }, g, nm);
      if (rr != null) el("text", { x: W - R + 9, y: y(rr) + 3.5, class: "lab" }, g, nm);
      g.addEventListener("pointerenter", () => { state.hover = m; paint(); });
      g.addEventListener("pointerleave", () => { state.hover = null; paint(); });
      g.addEventListener("click", () => { state.pin = state.pin === m ? null : m; paint(); });
      gs.push([m, g]);
    });
    svg._gs = gs; svg._R = R_;
    svg._paint = paint;
    function paint() {
      const a = state.hover || state.pin;
      gs.forEach(([m, g]) => { g.classList.toggle("act", m === a); g.classList.toggle("dim", !!a && m !== a); });
      if (a) {
        const rs = cols.map(i => R_[i].get(a));
        out.textContent = `${a.id}: ` + cols.map((i, k) => `${DSs[i]} #${rs[k] ?? "–"}`).join("  →  ") + `   (of ${vis.length})`;
      } else out.textContent = state.hide.size
        ? `Ranks among the ${vis.length} methods shown. Hover a line.`
        : "Hover or tap a line to follow one method across datasets.";
    }
    paint();
  }
  const redraw = responsive(svgHost, draw);
}

/* ------------------------------------------------------------------ 2. correlations with K400 */
const SHORT = {
  ft1: "UCF-101", ft2: "NTU-60", ft3: "Gym-99", ft4: "SS-v2", ft5: "EK-100",
  lin1: "UCF-101 (lin.)", lin2: "NTU-60 (lin.)", lin3: "Gym-99 (lin.)", lin4: "SS-v2 (lin.)", lin5: "EK-100 (lin.)",
  s0: "UCF-101, 1k samples", s1: "Gym-99, 1k samples",
  a0: "Gym-99 · all events", a1: "Vault", a2: "Floor", a3: "FX-S1", a4: "UB-S1", a5: "Gym-288",
  t0: "Spatio-temporal det.", t1: "Repetition counting", t2: "Arrow of time", t3: "Temporal localization",
  t4: "Multi-label (Charades)", t5: "Det. · AVA", t6: "Loc. · ActivityNet",
};
function corrChart(root) {
  const host = $(".chart-svg", root), out = $(".readout", root);
  const state = { lin: false, hover: null };
  const tog = $("[data-toggle=lin]", root);
  tog.onclick = () => { state.lin = !state.lin; tog.classList.toggle("on", state.lin); redraw(); };
  const groups = [
    ["domain", "Domain", ["ft1", "ft2", "ft3", "ft4", "ft5"], ["lin1", "lin2", "lin3", "lin4", "lin5"]],
    ["samples", "Samples", ["s0", "s1"], []],
    ["actions", "Actions", ["a0", "a1", "a2", "a3", "a4", "a5"], []],
    ["tasks", "Tasks", ["t0", "t1", "t2", "t3", "t4", "t5", "t6"], []],
  ];
  const sets = [
    ["all", "all 22", NONSUP, "var(--ink)"],
    ["cnn", "CNN", NONSUP.filter(m => m.fam === "cnn"), famColor("cnn")],
    ["vo", "Video-only", NONSUP.filter(m => m.fam === "vo"), famColor("vo")],
    ["vt", "Video-text", NONSUP.filter(m => m.fam === "vt"), famColor("vt")],
  ];
  function draw(W) {
    host.innerHTML = "";
    const narrow = W < 620, LW = narrow ? 126 : 168, rh = 24, gap = 16;
    const rows = [];
    groups.forEach(g => {
      const ids = g[2].concat(state.lin ? g[3] : []);
      rows.push({ head: g[1], factor: g[0] });
      ids.forEach(id => rows.push({ id, factor: g[0] }));
    });
    const H = 40 + rows.reduce((s, r) => s + (r.head ? rh * 0.9 + gap * 0.4 : rh), 0) + 10;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Rank correlation of each downstream setting with Kinetics-400 finetuning accuracy" }, host);
    const x0 = LW + 8, x1 = W - 14;
    const X = r => x0 + (x1 - x0) * (r + 1) / 2;
    [-1, -0.5, 0, 0.5, 1].forEach(t => {
      el("line", { x1: X(t), x2: X(t), y1: 28, y2: H - 8, class: t === 0 ? "axis0" : "grid" }, svg);
      el("text", { x: X(t), y: 18, "text-anchor": "middle", class: "tick" }, svg, t === 0 ? "0" : f2(t).replace("+", ""));
    });
    el("text", { x: X(-1), y: H - 0, class: "note-s" }, svg, "");
    let y = 40;
    const dotsByRow = [];
    rows.forEach(r => {
      if (r.head) {
        y += gap * 0.4;
        el("text", { x: 0, y: y + 8, class: "grp", style: `fill:var(--f-${r.factor})` }, svg, r.head.toUpperCase());
        y += rh * 0.9;
        return;
      }
      const cy = y + rh / 2;
      el("rect", { x: 0, y, width: W, height: rh, class: "rowhit" }, svg);
      el("text", { x: LW, y: cy + 4, "text-anchor": "end", class: "rl" }, svg, SHORT[r.id]);
      el("line", { x1: x0, x2: x1, y1: cy, y2: cy, class: "rowline" }, svg);
      sets.forEach(([k, name, ms, col], si) => {
        const c = corr(ms, "ft0", r.id);
        if (c.rho == null) return;
        const big = k === "all";
        const n = el("circle", { cx: X(c.rho), cy: cy + (big ? 0 : (si - 2) * 0), r: big ? 5.2 : 3.6, class: "d" + (big ? " big" : ""), style: `--c:${col}` }, svg);
        n.addEventListener("pointerenter", () => readout(out, `${SHORT[r.id]} vs. K400 — ${name} (n=${c.n}): ρ = ${f2(c.rho)}`));
        n.addEventListener("click", () => readout(out, `${SHORT[r.id]} vs. K400 — ${name} (n=${c.n}): ρ = ${f2(c.rho)}`));
      });
      y += rh;
    });
  }
  const redraw = responsive(host, draw);
}

/* ------------------------------------------------------------------ 3. domain scatter */
function scatter(root) {
  const host = $(".chart-svg", root), out = $(".readout", root);
  const xs = $("select[name=x]", root), ys = $("select[name=y]", root);
  const opts = Object.values(S).filter(s => s.factor === "domain");
  [xs, ys].forEach(s => opts.forEach(o => html("option", { value: o.id }, s, o.label)));
  xs.value = "ft0"; ys.value = "ft3";
  let hover = null, pin = null;
  const set = id => xs.value = id;
  root.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
    const [a, c] = b.dataset.preset.split(",");
    xs.value = a; ys.value = c; redraw();
  });
  xs.onchange = ys.onchange = () => redraw();
  function draw(W) {
    host.innerHTML = "";
    const H = Math.min(440, Math.max(300, W * 0.72)), m = { l: 46, r: 14, t: 14, b: 40 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Scatter plot comparing two domain evaluations across methods" }, host);
    const sx = S[xs.value], sy = S[ys.value];
    const pts = M.filter(d => sx.get(d) != null && sy.get(d) != null);
    const ext = g => { const v = pts.map(g); const lo = Math.min(...v), hi = Math.max(...v), p = (hi - lo) * 0.08 || 1; return [lo - p, hi + p]; };
    const [ax0, ax1] = ext(sx.get), [ay0, ay1] = ext(sy.get);
    const X = v => m.l + (W - m.l - m.r) * (v - ax0) / (ax1 - ax0);
    const Y = v => H - m.b - (H - m.t - m.b) * (v - ay0) / (ay1 - ay0);
    const ticks = (a, b) => { const st = [1, 2, 5, 10, 20].find(s => (b - a) / s <= 7); const o = []; for (let t = Math.ceil(a / st) * st; t <= b; t += st) o.push(t); return o; };
    ticks(ax0, ax1).forEach(t => { el("line", { x1: X(t), x2: X(t), y1: m.t, y2: H - m.b, class: "grid" }, svg); el("text", { x: X(t), y: H - m.b + 15, "text-anchor": "middle", class: "tick" }, svg, t); });
    ticks(ay0, ay1).forEach(t => { el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: "grid" }, svg); el("text", { x: m.l - 7, y: Y(t) + 3.5, "text-anchor": "end", class: "tick" }, svg, t); });
    el("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", class: "axl" }, svg, sx.label + " →");
    el("text", { transform: `translate(11 ${(m.t + H - m.b) / 2}) rotate(-90)`, "text-anchor": "middle", class: "axl" }, svg, sy.label + " →");
    const nodes = [];
    pts.forEach(d => {
      const g = el("g", { class: "pt", style: `--c:${famColor(d.fam)}` }, svg);
      if (d.sup) el("rect", { x: X(sx.get(d)) - 5, y: Y(sy.get(d)) - 5, width: 10, height: 10, class: "sup" }, g);
      else el("circle", { cx: X(sx.get(d)), cy: Y(sy.get(d)), r: 5.5 }, g);
      el("circle", { cx: X(sx.get(d)), cy: Y(sy.get(d)), r: 13, class: "hit" }, g);
      const lab = el("text", { x: X(sx.get(d)) + 9, y: Y(sy.get(d)) + 3.5, class: "lab" }, g, d.sup ? "Supervised" : d.id);
      g.addEventListener("pointerenter", () => { hover = d; paint(); });
      g.addEventListener("pointerleave", () => { hover = null; paint(); });
      g.addEventListener("click", () => { pin = pin === d ? null : d; paint(); });
      nodes.push([d, g]);
    });
    function paint() {
      const a = hover || pin;
      nodes.forEach(([d, g]) => { g.classList.toggle("act", d === a); g.classList.toggle("dim", !!a && d !== a); });
      const all = corr(NONSUP, xs.value, ys.value), cn = corr(NONSUP.filter(m => m.fam === "cnn"), xs.value, ys.value),
        vo = corr(NONSUP.filter(m => m.fam === "vo"), xs.value, ys.value), vt = corr(NONSUP.filter(m => m.fam === "vt"), xs.value, ys.value);
      const r = c => (c.rho == null ? "–" : f2(c.rho));
      out.textContent = (a ? `${a.sup ? "Supervised · " + FAM[a.fam].name : a.id}: ${sx.get(a)} , ${sy.get(a)}.   ` : "") +
        `Rank correlation ρ — all ${all.n}: ${r(all)} · CNN: ${r(cn)} · video-only: ${r(vo)} · video-text: ${r(vt)}`;
    }
    paint();
  }
  const redraw = responsive(host, draw);
}

/* ------------------------------------------------------------------ 4. samples slope */
function slope(root) {
  const host = $(".chart-svg", root), out = $(".readout", root);
  let hover = null, pin = null;
  const panels = [
    { name: "UCF-101", lo: "s0", hi: "ft1" },
    { name: "FineGym-99", lo: "s1", hi: "ft3" },
  ];
  function draw(W) {
    host.innerHTML = "";
    const stack = W < 640, pw = stack ? W : (W - 28) / 2, ph = 360;
    const H = stack ? ph * 2 + 14 : ph;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Accuracy with 1000 finetuning samples versus all samples, per method" }, host);
    const nodes = [];
    panels.forEach((p, pi) => {
      const ox = stack ? 0 : pi * (pw + 28), oy = stack ? pi * (ph + 14) : 0;
      const g0 = el("g", { transform: `translate(${ox} ${oy})` }, svg);
      const ms = M.filter(m => S[p.lo].get(m) != null && S[p.hi].get(m) != null);
      const vals = ms.flatMap(m => [S[p.lo].get(m), S[p.hi].get(m)]);
      const lo = Math.floor(Math.min(...vals) / 5) * 5 - 0, hi = Math.ceil(Math.max(...vals) / 5) * 5;
      const L = 40, R = 40, T = 70, B = 26;
      const xa = L + 20, xb = pw - R - 20;
      const Y = v => ph - B - (ph - T - B) * (v - lo) / (hi - lo);
      for (let t = lo; t <= hi; t += 10) { el("line", { x1: L - 6, x2: pw - 6, y1: Y(t), y2: Y(t), class: "grid" }, g0); el("text", { x: L - 12, y: Y(t) + 3.5, "text-anchor": "end", class: "tick" }, g0, t); }
      el("text", { x: 0, y: 16, class: "panel-t" }, g0, p.name);
      const spread = k => { const v = ms.filter(m => !m.sup).map(m => S[k].get(m)); return Math.max(...v) - Math.min(...v); };
      el("text", { x: 0, y: 32, class: "note-s" }, g0, `spread across methods: ${spread(p.lo).toFixed(0)} pts at 1k → ${spread(p.hi).toFixed(0)} pts with all data`);
      el("text", { x: xa, y: T - 8, "text-anchor": "middle", class: "colh" }, g0, "1,000 samples");
      el("text", { x: xb, y: T - 8, "text-anchor": "middle", class: "colh" }, g0, "all samples");
      ms.forEach(m => {
        const a = [xa, Y(S[p.lo].get(m))], b = [xb, Y(S[p.hi].get(m))];
        const g = el("g", { class: "ln" + (m.sup ? " sup" : ""), style: `--c:${famColor(m.fam)}`, "data-k": m.key }, g0);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "p" }, g);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "hit" }, g);
        el("circle", { cx: a[0], cy: a[1], r: 3 }, g); el("circle", { cx: b[0], cy: b[1], r: 3 }, g);
        g.addEventListener("pointerenter", () => { hover = m; paint(); });
        g.addEventListener("pointerleave", () => { hover = null; paint(); });
        g.addEventListener("click", () => { pin = pin === m ? null : m; paint(); });
        nodes.push([m, g]);
      });
    });
    function paint() {
      const a = hover || pin;
      nodes.forEach(([m, g]) => { g.classList.toggle("act", m === a); g.classList.toggle("dim", !!a && m !== a); });
      out.textContent = a
        ? `${a.key}: UCF-101 ${S.s0.get(a)} → ${S.ft1.get(a)}   ·   Gym-99 ${S.s1.get(a) ?? "–"} → ${S.ft3.get(a)}`
        : "Hover a line. Dashed = supervised pre-training. Lines are coloured by method family.";
    }
    paint();
  }
  responsive(host, draw);
}

/* ------------------------------------------------------------------ 5. ladders (actions, tasks) */
function ladder(root, ids) {
  const host = $(".chart-svg", root), out = $(".readout", root);
  let hover = null, pin = null;
  const showSup = { v: true };
  function draw(W) {
    host.innerHTML = "";
    const narrow = W < 560;
    const rh = 64, T = 22, L = 10, R = 10;
    const H = T + ids.length * rh + 6;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Per-setting spread of methods; hover a method to follow it across settings" }, host);
    el("text", { x: W - R, y: 10, "text-anchor": "end", class: "note-s" }, svg, "better →");
    const X = (s, v, lo, hi) => { const f = (v - lo) / (hi - lo); return L + 6 + (W - L - R - 12) * (s.hi ? f : 1 - f); };
    const per = ids.map((id, r) => {
      const s = S[id];
      const vals = M.map(s.get).filter(v => v != null);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const cy = T + r * rh + 36;
      el("text", { x: L, y: T + r * rh + 14, class: "rl2", style: `fill:var(--f-${s.factor})` }, svg, s.label);
      el("line", { x1: L, x2: W - R, y1: cy, y2: cy, class: "rowline" }, svg);
      const lo_ = s.hi ? lo : hi, hi_ = s.hi ? hi : lo;
      el("text", { x: L, y: cy + 14, class: "tick" }, svg, s.fmt(lo_));
      el("text", { x: W - R, y: cy + 14, "text-anchor": "end", class: "tick" }, svg, s.fmt(hi_));
      return { s, lo, hi, cy };
    });
    const gs = M.map(m => {
      const g = el("g", { class: "pt lad" + (m.sup ? " supm" : ""), style: `--c:${famColor(m.fam)}` }, svg);
      let d = "", prev = null;
      const dots = [];
      per.forEach(p => {
        const v = p.s.get(m); if (v == null) return;
        const x = X(p.s, v, p.lo, p.hi);
        d += (prev ? "L" : "M") + x + "," + p.cy; prev = 1;
        dots.push([x, p.cy]);
      });
      el("path", { d, class: "thread" }, g);
      dots.forEach(([x, y]) => {
        if (m.sup) el("rect", { x: x - 4.5, y: y - 4.5, width: 9, height: 9, class: "sup" }, g);
        else el("circle", { cx: x, cy: y, r: 4.6 }, g);
        el("circle", { cx: x, cy: y, r: 10, class: "hit" }, g);
      });
      g.addEventListener("pointerenter", () => { hover = m; paint(); });
      g.addEventListener("pointerleave", () => { hover = null; paint(); });
      g.addEventListener("click", () => { pin = pin === m ? null : m; paint(); });
      return [m, g];
    });
    function paint() {
      const a = hover || pin;
      gs.forEach(([m, g]) => { g.classList.toggle("act", m === a); g.classList.toggle("dim", !!a && m !== a); if (m === a) svg.appendChild(g); });
      if (a) {
        const rk = ids.map(id => rankMap(M, S[id].get, S[id].hi).get(a));
        out.textContent = `${a.key} — rank among all ${M.length}: ` + ids.map((id, i) => `${SHORT[id] || S[id].label} #${rk[i] ?? "–"}`).join(" · ");
      } else out.textContent = "Each dot is a method. Hover (or tap) one to thread it through every row. Squares = supervised.";
    }
    paint();
  }
  responsive(host, draw);
}

/* ------------------------------------------------------------------ 6. best of each family */
function familyBest(root) {
  const host = $(".chart-svg", root), out = $(".readout", root);
  function draw(W) {
    host.innerHTML = "";
    const rh = 64, T = 24, L = 10, R = 10, H = T + BENCH.length * rh + 4;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
      "aria-label": "Best method of each family on each SEVERE++ column" }, host);
    el("text", { x: W - R, y: 10, "text-anchor": "end", class: "note-s" }, svg, "better →");
    BENCH.forEach((b, r) => {
      const s = S[b.id];
      const vals = NONSUP.map(s.get).filter(v => v != null);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const X = v => L + 8 + (W - L - R - 16) * (s.hi ? (v - lo) / (hi - lo) : 1 - (v - lo) / (hi - lo));
      const cy = T + r * rh + 36;
      el("text", { x: L, y: T + r * rh + 12, class: "rl2", style: `fill:var(--f-${b.factor})` }, svg, s.label);
      el("line", { x1: L, x2: W - R, y1: cy, y2: cy, class: "rowline" }, svg);
      const best = Object.keys(FAM).map(f => {
        const ms = NONSUP.filter(m => m.fam === f && s.get(m) != null);
        ms.sort((a, c) => (s.hi ? s.get(c) - s.get(a) : s.get(a) - s.get(c)));
        return { f, m: ms[0], v: s.get(ms[0]) };
      });
      const order = best.slice().sort((a, c) => X(a.v) - X(c.v));
      order.forEach((d, i) => {
        const x = X(d.v);
        const dot = el("circle", { cx: x, cy, r: 6.5, style: `fill:${famColor(d.f)}`, class: "fbd" }, svg);
        const above = i % 2 === 0;
        const edge = x > W - R - 60 ? "end" : x < L + 60 ? "start" : "middle";
        el("text", { x: edge === "end" ? W - R : edge === "start" ? L : x, y: cy + (above ? -12 : 22), "text-anchor": edge, class: "lab2", style: `fill:${famColor(d.f)}` }, svg, d.m.id);
        dot.addEventListener("pointerenter", () => readout(out, `${b.short}: best ${FAM[d.f].name} is ${d.m.id} (${s.fmt(d.v)})`));
        dot.addEventListener("click", () => readout(out, `${b.short}: best ${FAM[d.f].name} is ${d.m.id} (${s.fmt(d.v)})`));
      });
    });
  }
  responsive(host, draw);
}

/* ------------------------------------------------------------------ 7. leaderboard heat */
function leaderboard(root) {
  const host = $(".board", root);
  const cols = [{ id: "ft0", short: "K400", factor: "std" }, ...BENCH];
  const ranks = {};
  cols.forEach(c => (ranks[c.id] = rankMap(M, S[c.id].get, S[c.id].hi)));
  const meanRank = m => {
    const r = BENCH.map(b => ranks[b.id].get(m));
    return r.every(v => v != null) ? r.reduce((s, v) => s + v, 0) / r.length : null;
  };
  let sortKey = "mean", dir = 1;
  function render() {
    host.innerHTML = "";
    const tbl = html("table", {}, host);
    const thead = html("thead", {}, tbl);
    const gr = html("tr", { class: "gr" }, thead);
    html("th", { colspan: 2 }, gr, "");
    html("th", {}, gr, "Standard");
    [["domain", 2], ["samples", 2], ["actions", 2], ["tasks", 2]].forEach(([f, n]) => {
      const th = html("th", { colspan: n, class: "f-" + f }, gr, f);
    });
    html("th", {}, gr, "");
    const hr = html("tr", {}, thead);
    html("th", { class: "l" }, hr, "Method");
    html("th", { class: "l" }, hr, "");
    cols.forEach(c => {
      const th = html("th", { class: "sortable" + (sortKey === c.id ? " cur" : ""), tabindex: 0, role: "button", title: S[c.id].label }, hr, c.short || "K400");
      th.onclick = () => { if (sortKey === c.id) dir = -dir; else { sortKey = c.id; dir = 1; } render(); };
    });
    const th = html("th", { class: "sortable mean" + (sortKey === "mean" ? " cur" : ""), tabindex: 0, role: "button", title: "Average rank over the 8 SEVERE++ columns (our convenience summary, not a score from the paper)" }, hr, "mean rank");
    th.onclick = () => { if (sortKey === "mean") dir = -dir; else { sortKey = "mean"; dir = 1; } render(); };
    const rows = M.slice().sort((a, b) => {
      const g = m => sortKey === "mean" ? meanRank(m) : ranks[sortKey].get(m);
      const x = g(a), y = g(b);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (x - y) * dir;
    });
    const tb = html("tbody", {}, tbl);
    const N = M.length;
    rows.forEach(m => {
      const tr = html("tr", {}, tb);
      const nm = html("td", { class: "l nm" }, tr);
      html("i", { style: `background:${famColor(m.fam)}` }, nm);
      nm.append(m.sup ? "Supervised" : m.id);
      html("td", { class: "l fm" }, tr, m.sup ? FAM[m.fam].name.replace("Video-", "V-") : "");
      cols.forEach(c => {
        const v = S[c.id].get(m), r = ranks[c.id].get(m);
        const td = html("td", {}, tr, v == null ? "–" : S[c.id].fmt(v).replace(/^0\./, "."));
        if (r != null) {
          const t = 1 - (r - 1) / (N - 1);
          td.style.background = `color-mix(in srgb, var(--heat) ${Math.round(t * t * 78 + 3)}%, var(--paper))`;
          td.style.color = t > 0.62 ? "var(--paper)" : "var(--ink)";
          td.title = `${S[c.id].label}: ${S[c.id].fmt(v)} — rank #${r} of ${ranks[c.id].size}`;
        }
      });
      const mr = meanRank(m);
      const td = html("td", { class: "mean" }, tr, mr == null ? "–" : mr.toFixed(1));
    });
  }
  render();
}

window.addEventListener("DOMContentLoaded", () => {
  const q = s => document.querySelector(s);
  q("#c-bump") && bumpChart(q("#c-bump"));
  q("#c-corr") && corrChart(q("#c-corr"));
  q("#c-scatter") && scatter(q("#c-scatter"));
  q("#c-slope") && slope(q("#c-slope"));
  q("#c-actions") && ladder(q("#c-actions"), ["a0", "a1", "a2", "a3", "a4", "a5"]);
  q("#c-tasks") && ladder(q("#c-tasks"), ["t0", "t1", "t2", "t3", "t4", "t5", "t6"]);
  q("#c-family") && familyBest(q("#c-family"));
  q("#c-board") && leaderboard(q("#c-board"));
  // copy-to-clipboard for bibtex
  document.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent); b.textContent = "copied ✓"; setTimeout(() => (b.textContent = "copy"), 1600); } catch (e) {}
  });
});
})();
