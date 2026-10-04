// Renders every table on the page from data.js. Cells are shaded by each model's
// rank within its column (blue = better), so patterns show up at a glance.
(function () {
  var FAMC = { cnn: "var(--cnn)", vo: "var(--vo)", vt: "var(--vt)" };
  var FAMN = { cnn: "CNN · contrastive", vo: "Video-only transformer", vt: "Video-text transformer" };

  function shade(t) { return "rgba(var(--good)," + (0.06 + 0.74 * t).toFixed(3) + ")"; }
  function diverge(r) { // r in [-1, 1]
    var a = Math.min(1, Math.abs(r)) * 0.75;
    return "rgba(var(" + (r >= 0 ? "--good" : "--bad") + ")," + a.toFixed(3) + ")";
  }

  // Rank (1 = best) of each model within a setting; null scores are skipped.
  function ranksFor(s, rows) {
    var vals = rows.map(function (m) { return { m: m, v: s.get(m) }; }).filter(function (x) { return x.v != null; });
    vals.sort(function (a, b) { return s.hi ? b.v - a.v : a.v - b.v; });
    var out = new Map();
    vals.forEach(function (x, i) { out.set(x.m, i + 1); });
    out.n = vals.length;
    return out;
  }

  // cols: [{id (key in S), label, group?}]. opts.show: "score" | "rank"
  function table(host, cols, opts) {
    opts = opts || {};
    var rows = M.slice();
    var R = {}; cols.forEach(function (c) { R[c.id] = ranksFor(S[c.id], rows); });
    var state = { sort: null };

    function meanRank(m) {
      var t = 0;
      for (var i = 0; i < cols.length; i++) { var r = R[cols[i].id].get(m); if (r == null) return null; t += r; }
      return t / cols.length;
    }

    function cell(c, m) {
      var s = S[c.id], v = s.get(m), r = R[c.id].get(m);
      if (v == null) return '<td class="na">–</td>';
      var t = 1 - (r - 1) / Math.max(1, R[c.id].n - 1);
      return '<td style="background:' + shade(t) + '">' + (opts.show === "rank" ? r : s.fmt(v)) + '</td>';
    }

    function draw() {
      var head = '<tr><th class="l">Model</th>' + cols.map(function (c) {
        return '<th class="sortable' + (state.sort === c.id ? " cur" : "") + '" data-c="' + c.id + '">' + c.label + '</th>';
      }).join("") + (opts.mean ? '<th class="mean sortable' + (state.sort === "mean" ? " cur" : "") + '" data-c="mean">Mean rank</th>' : "") + '</tr>';

      var body = "";
      function row(m) {
        var mr = opts.mean ? meanRank(m) : null;
        return '<tr class="' + (m.sup ? "sup" : "") + '"><td class="l">' + (m.sup ? "Supervised" : m.id) + '</td>' +
          cols.map(function (c) { return cell(c, m); }).join("") +
          (opts.mean ? '<td class="mean' + (mr == null ? " na" : "") + '">' + (mr == null ? "–" : mr.toFixed(1)) + '</td>' : "") + '</tr>';
      }
      if (state.sort) {
        var key = state.sort;
        var sorted = rows.slice().sort(function (a, b) {
          var ra = key === "mean" ? meanRank(a) : R[key].get(a), rb = key === "mean" ? meanRank(b) : R[key].get(b);
          if (ra == null) return 1; if (rb == null) return -1; return ra - rb;
        });
        body = sorted.map(function (m) {
          return row(m).replace('<td class="l">', '<td class="l"><span style="color:' + FAMC[m.fam] + '">●</span> ');
        }).join("");
      } else {
        ["cnn", "vo", "vt"].forEach(function (f) {
          body += '<tr class="fam" style="--c:' + FAMC[f] + '"><td colspan="' + (cols.length + 2) + '">' + FAMN[f] + '</td></tr>';
          rows.filter(function (m) { return m.fam === f; }).forEach(function (m) { body += row(m); });
        });
      }
      host.innerHTML = '<div class="tw"><table class="t"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
        '<div class="legend">worse<i></i>better <span>· shading = rank within column · click a header to sort</span></div>';
      host.querySelectorAll("th.sortable").forEach(function (th) {
        th.onclick = function () { state.sort = state.sort === th.dataset.c ? null : th.dataset.c; draw(); };
      });
    }
    draw();
  }

  function cols(ids, labels) { return ids.map(function (id, i) { return { id: id, label: labels ? labels[i] : S[id].label }; }); }
  function $(id) { return document.getElementById(id); }

  // 1. rank of every model on every domain (finetune)
  table($("t-rank"), cols(["ft0", "ft1", "ft2", "ft3", "ft4", "ft5"], DSs), { show: "rank" });

  // 2. domain
  table($("t-domain"), cols(["ft0", "ft1", "ft2", "ft3", "ft4", "ft5"], DSs));
  table($("t-linear"), cols(["lin1", "lin2", "lin3", "lin4", "lin5"], DSs.slice(1)));

  // 3. samples
  table($("t-samples"), cols(["s0", "s1", "ft1", "ft3"], ["UCF-101 · 1k", "Gym-99 · 1k", "UCF-101 · all", "Gym-99 · all"]));

  // 4. actions
  table($("t-actions"), cols(["a0", "a1", "a2", "a3", "a4", "a5"], ["Gym-99", "Vault", "Floor", "FX-S1", "UB-S1", "Gym-288"]));

  // 5. tasks
  table($("t-tasks"), cols(["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
    ["STAD mAP", "Rep. count (error ↓)", "Arrow of time", "TAL", "Charades MLC", "AVA (ood)", "ActivityNet (ood)"]));

  // 6. correlation with K400 finetuning
  (function () {
    function rankArr(a) {
      var idx = a.map(function (v, i) { return i; }).sort(function (i, j) { return a[i] - a[j]; });
      var r = new Array(a.length), i = 0;
      while (i < idx.length) {
        var j = i; while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++;
        for (var k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1;
        i = j + 1;
      }
      return r;
    }
    function spearman(x, y) {
      var rx = rankArr(x), ry = rankArr(y), n = x.length;
      var mx = rx.reduce(function (a, b) { return a + b; }, 0) / n, my = ry.reduce(function (a, b) { return a + b; }, 0) / n;
      var sxy = 0, sxx = 0, syy = 0;
      for (var i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += Math.pow(rx[i] - mx, 2); syy += Math.pow(ry[i] - my, 2); }
      return sxy / Math.sqrt(sxx * syy);
    }
    var groups = [["All 22", null], ["CNN", "cnn"], ["Video-only", "vo"], ["Video-text", "vt"]];
    var ids = ["ft1", "ft2", "ft3", "ft4", "ft5", "s0", "s1", "a1", "a2", "a3", "a4", "t0", "t1", "t2", "t3", "t4"];
    var body = ids.map(function (id) {
      var s = S[id];
      var tds = groups.map(function (g) {
        var ms = M.filter(function (m) { return !m.sup && (!g[1] || m.fam === g[1]) && m.ft[0] != null && s.get(m) != null; });
        if (ms.length < 4) return '<td class="na">–</td>';
        var r = spearman(ms.map(function (m) { return m.ft[0]; }), ms.map(function (m) { return s.get(m) * (s.hi ? 1 : -1); }));
        return '<td style="background:' + diverge(r) + '">' + (r > 0 ? "+" : "") + r.toFixed(2) + '</td>';
      }).join("");
      return '<tr><td class="l">' + s.label + '</td>' + tds + '</tr>';
    }).join("");
    $("t-corr").innerHTML = '<div class="tw"><table class="t"><thead><tr><th class="l">Setting</th>' +
      groups.map(function (g) { return '<th>' + g[0] + '</th>'; }).join("") + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="legend">negative<i class="div"></i>positive <span>· Spearman ρ with Kinetics-400 finetuning accuracy · repetition counting sign-flipped so + always means “better”</span></div>';
  })();

  // 7. who wins where: best model per family on each benchmark column
  (function () {
    var B = [["ft4", "SS-v2"], ["ft3", "Gym-99"], ["s0", "UCF · 1k"], ["s1", "Gym · 1k"], ["a3", "FX-S1"], ["a4", "UB-S1"], ["t1", "Rep. counting"], ["t4", "Charades"]];
    var fams = ["cnn", "vo", "vt"];
    var body = B.map(function (b) {
      var s = S[b[0]], best = {}, top = null;
      fams.forEach(function (f) {
        M.filter(function (m) { return m.fam === f && !m.sup && s.get(m) != null; }).forEach(function (m) {
          var v = s.get(m); if (!best[f] || (s.hi ? v > best[f].v : v < best[f].v)) best[f] = { m: m, v: v };
        });
        if (best[f] && (!top || (s.hi ? best[f].v > best[top].v : best[f].v < best[top].v))) top = f;
      });
      return '<tr><td class="l">' + b[1] + '</td>' + fams.map(function (f) {
        var x = best[f];
        return '<td class="' + (f === top ? "win" : "") + '"' + (f === top ? ' style="background:' + shade(0.8) + '"' : "") + '>' + x.m.id + ' <span class="muted">' + s.fmt(x.v) + '</span></td>';
      }).join("") + '</tr>';
    }).join("");
    $("t-family").innerHTML = '<div class="tw"><table class="t"><thead><tr><th class="l">Evaluation</th><th class="cnn-c">Best CNN</th><th class="vo-c">Best video-only</th><th class="vt-c">Best video-text</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Shaded = best family for that evaluation. Supervised models excluded.</p>';
  })();

  // 8. SEVERE++ benchmark
  table($("t-board"), BENCH.map(function (b) { return { id: b.id, label: b.short }; }), { mean: true, show: "rank" });
  var bd = $("t-board").querySelector(".legend");
  if (bd) bd.insertAdjacentHTML("afterend", '<p class="note">Ranks among all 24 rows. MGM has no 1k-sample results, so no mean rank.</p>');

  // 9. roster
  $("t-roster").innerHTML = '<div class="tw"><table class="t"><thead><tr><th class="l">Model</th><th class="l">Objective</th><th class="l">Pre-training data</th></tr></thead><tbody>' +
    ["cnn", "vo", "vt"].map(function (f) {
      return '<tr class="fam" style="--c:' + FAMC[f] + '"><td colspan="3">' + FAMN[f] + '</td></tr>' +
        M.filter(function (m) { return m.fam === f && !m.sup; }).map(function (m) {
          return '<tr><td class="l">' + m.id + '</td><td class="l">' + m.obj + '</td><td class="l">' + m.data + '</td></tr>';
        }).join("");
    }).join("") + '</tbody></table></div>';

  // copy buttons
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.onclick = function () {
      var t = $(b.dataset.copy).textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "copied"; setTimeout(function () { b.textContent = "copy"; }, 1500); }, function () {});
    };
  });
})();
