// Scatter plot: compare any two domain evaluations. Each dot is a model.
(function () {
  var host = document.getElementById("scatter");
  var ids = Object.keys(S).filter(function (k) { return S[k].factor === "domain"; });
  var FAMC = { cnn: "#c0392b", vo: "#17806d", vt: "#6c4bb0" };
  var st = { x: "ft0", y: "ft1", pin: null };
  var W = 640, H = 420, P = { l: 48, r: 16, t: 14, b: 42 };
  var NS = "http://www.w3.org/2000/svg";

  function opts(sel) { return ids.map(function (k) { return '<option value="' + k + '"' + (k === sel ? " selected" : "") + '>' + S[k].label + '</option>'; }).join(""); }
  var presets = [["K400 → UCF-101", "ft0", "ft1"], ["K400 → Gym-99", "ft0", "ft3"], ["K400 → EK-100", "ft0", "ft5"]];

  host.innerHTML =
    '<div class="ctrl">' +
    '<label>x <select id="sx">' + opts(st.x) + '</select></label> ' +
    '<label>y <select id="sy">' + opts(st.y) + '</select></label>' +
    '<span class="presets">try: ' + presets.map(function (p, i) { return '<button type="button" data-p="' + i + '">' + p[0] + '</button>'; }).join(" ") + '</span></div>' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Scatter plot of two evaluations, one dot per model"></svg>' +
    '<div class="readout" id="sread">Hover or tap a dot.</div>' +
    '<div class="legend" style="gap:14px"><span><b style="color:#c0392b">●</b> CNN</span><span><b style="color:#17806d">●</b> video-only</span><span><b style="color:#6c4bb0">●</b> video-text</span><span>□ supervised</span></div>';

  var svg = host.querySelector("svg"), read = document.getElementById("sread");

  function el(n, a, txt) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; }
  function nice(lo, hi) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / 4)));
    var f = span / 4 / step; step *= f > 5 ? 10 : f > 2 ? 5 : f > 1 ? 2 : 1;
    var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for (var v = a; v <= b + 1e-9; v += step) t.push(v);
    return { lo: a, hi: b, ticks: t };
  }

  function draw() {
    svg.innerHTML = "";
    var sx = S[st.x], sy = S[st.y];
    var pts = M.filter(function (m) { return sx.get(m) != null && sy.get(m) != null; });
    var xs = pts.map(sx.get), ys = pts.map(sy.get);
    var ax = nice(Math.min.apply(0, xs), Math.max.apply(0, xs)), ay = nice(Math.min.apply(0, ys), Math.max.apply(0, ys));
    function X(v) { return P.l + (v - ax.lo) / (ax.hi - ax.lo) * (W - P.l - P.r); }
    function Y(v) { return H - P.b - (v - ay.lo) / (ay.hi - ay.lo) * (H - P.t - P.b); }

    ax.ticks.forEach(function (v) {
      svg.appendChild(el("line", { x1: X(v), x2: X(v), y1: P.t, y2: H - P.b, stroke: "#eee" }));
      svg.appendChild(el("text", { x: X(v), y: H - P.b + 16, "text-anchor": "middle", "font-size": 11, fill: "#666" }, sx.fmt(v)));
    });
    ay.ticks.forEach(function (v) {
      svg.appendChild(el("line", { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), stroke: "#eee" }));
      svg.appendChild(el("text", { x: P.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#666" }, sy.fmt(v)));
    });
    svg.appendChild(el("line", { x1: P.l, x2: W - P.r, y1: H - P.b, y2: H - P.b, stroke: "#999" }));
    svg.appendChild(el("line", { x1: P.l, x2: P.l, y1: P.t, y2: H - P.b, stroke: "#999" }));
    svg.appendChild(el("text", { x: (P.l + W - P.r) / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: "#333" }, sx.label + (sx.hi ? "" : " (lower = better)")));
    var yl = el("text", { transform: "translate(13," + (P.t + H - P.b) / 2 + ") rotate(-90)", "text-anchor": "middle", "font-size": 12, fill: "#333" }, sy.label + (sy.hi ? "" : " (lower = better)"));
    svg.appendChild(yl);

    pts.forEach(function (m) {
      var cx = X(sx.get(m)), cy = Y(sy.get(m)), c = FAMC[m.fam];
      var g = el("g", { style: "cursor:pointer" });
      g.appendChild(m.sup ? el("rect", { x: cx - 5, y: cy - 5, width: 10, height: 10, fill: "#fff", stroke: c, "stroke-width": 2 })
                          : el("circle", { cx: cx, cy: cy, r: 6, fill: c, "fill-opacity": .8, stroke: "#fff" }));
      g.appendChild(el("circle", { cx: cx, cy: cy, r: 12, fill: "transparent" }));
      function show() {
        read.innerHTML = '<b style="color:' + c + '">' + (m.sup ? "Supervised · " + FAM[m.fam].name : m.id) + '</b> — ' +
          sx.label + ': ' + sx.fmt(sx.get(m)) + ' · ' + sy.label + ': ' + sy.fmt(sy.get(m));
      }
      g.addEventListener("mouseenter", show);
      g.addEventListener("click", function () { st.pin = m; show(); });
      svg.appendChild(g);
      if (st.pin === m) { svg.appendChild(el("text", { x: cx + 9, y: cy - 8, "font-size": 12, "font-weight": 700, fill: c }, m.sup ? "Supervised" : m.id)); show(); }
    });
  }

  document.getElementById("sx").onchange = function (e) { st.x = e.target.value; draw(); };
  document.getElementById("sy").onchange = function (e) { st.y = e.target.value; draw(); };
  host.querySelectorAll("[data-p]").forEach(function (b) {
    b.onclick = function () {
      var p = presets[+b.dataset.p]; st.x = p[1]; st.y = p[2];
      document.getElementById("sx").value = st.x; document.getElementById("sy").value = st.y; draw();
    };
  });
  draw();
})();
