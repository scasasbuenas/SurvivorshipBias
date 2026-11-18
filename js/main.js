(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------
     Avión de referencia (coordenadas de la imagen, 960 x 716)
     LETHAL: zonas sin impactos en el diagrama (motores, cabina,
     torreta, fuselaje trasero). Ahí se dibuja la IA no detectada.
  ------------------------------------------------------------ */
  var HITS = window.PLANE_HITS || [];
  var LETHAL = [
    { x: 377, y: 185, r: 30, lx: 290, ly: 105 },
    { x: 573, y: 185, r: 30, lx: 655, ly: 105 },
    { x: 475, y: 172, r: 26, lx: 545, ly: 40 },
    { x: 476, y: 427, r: 30, lx: 300, ly: 440 },
    { x: 477, y: 545, r: 22, lx: 640, ly: 560 }
  ];
  var MINE_TARGETS = [[100, 250], [860, 255], [476, 330], [380, 630], [570, 630], [320, 300], [620, 300], [476, 380]];

  function circle(cls, x, y, r) {
    var c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("class", cls);
    c.setAttribute("cx", x);
    c.setAttribute("cy", y);
    c.setAttribute("r", r);
    return c;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function nearestHit(t) {
    var best = 0, bd = Infinity;
    HITS.forEach(function (h, i) {
      var d = (h[0] - t[0]) * (h[0] - t[0]) + (h[1] - t[1]) * (h[1] - t[1]);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /* Portada: los impactos de los aviones que sí regresaron */
  function drawHeroHits() {
    var g = document.getElementById("hero-hits");
    if (!g) return;
    HITS.forEach(function (h) { g.appendChild(circle("hit", h[0], h[1], 6)); });
  }

  /* ------------------------------------------------------------
     Gráfico de cuadros (waffle)
  ------------------------------------------------------------ */
  function drawWaffles() {
    document.querySelectorAll(".waffle__grid").forEach(function (grid) {
      var on = parseInt(grid.getAttribute("data-on"), 10) || 0;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < 500; i++) {
        var s = document.createElement("span");
        if (i < on) s.className = "on";
        frag.appendChild(s);
      }
      grid.appendChild(frag);
    });
  }

  /* ------------------------------------------------------------
     Prueba
  ------------------------------------------------------------ */
  var CONF = [
    { label: "Adiviné", value: 50 },
    { label: "Algo", value: 65 },
    { label: "Bastante", value: 80 },
    { label: "Totalmente", value: 95 }
  ];

  var items = (window.QUIZ_ITEMS || []).slice();
  var state = { i: 0, answers: [] };
  var root = document.getElementById("quiz-root");

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function mediaFor(item, opts) {
    opts = opts || {};
    var wrap = document.createDocumentFragment();
    var node;
    if (item.type === "video") {
      node = el("video", { src: item.src, muted: "", loop: "", playsinline: "", preload: "auto", "aria-label": item.alt || "Video" });
      node.muted = true;
      if (!opts.thumb && !reduceMotion) node.autoplay = true;
      if (opts.thumb) node.setAttribute("preload", "metadata");
      if (reduceMotion && !opts.thumb) node.setAttribute("controls", "");
    } else {
      node = el("img", { src: item.src, alt: item.alt || "", decoding: "async", referrerpolicy: "no-referrer" });
      if (opts.thumb) node.setAttribute("loading", "lazy");
    }
    node.addEventListener("error", function () {
      var fb = el("div", { "class": "frame__fallback" });
      fb.appendChild(document.createTextNode("Esta pieza no cargó desde su fuente original. "));
      fb.appendChild(el("a", { href: item.source, target: "_blank", rel: "noopener", text: "Verla en la fuente" }));
      if (node.parentNode) node.parentNode.replaceChild(fb, node);
    });
    wrap.appendChild(node);
    return wrap;
  }

  function renderItem() {
    var item = items[state.i];
    var current = { choice: null, conf: null };
    root.innerHTML = "";

    var dots = el("span", { "class": "progress__dots", "aria-hidden": "true" });
    items.forEach(function (_, k) {
      dots.appendChild(el("span", { "class": k < state.i ? "is-done" : (k === state.i ? "is-current" : "") }));
    });

    var box = el("div", { "class": "frame" });
    box.appendChild(mediaFor(item));
    var frame = el("figure", { "class": "frame-wrap" }, [box, el("figcaption", { "class": "fig-label", text: "FIG. 2." + (state.i + 1) })]);

    var btnReal = el("button", { type: "button", "aria-pressed": "false", text: "Es real" });
    var btnAI = el("button", { type: "button", "aria-pressed": "false", text: "Es IA" });
    var choice = el("div", { "class": "choice", role: "group", "aria-label": "¿Real o generada con IA?" }, [btnReal, btnAI]);

    var confBtns = CONF.map(function (c, k) {
      return el("button", { type: "button", "aria-pressed": "false", "data-k": String(k), text: c.label });
    });
    var conf = el("div", { "class": "confidence", role: "group", "aria-labelledby": "conf-l" }, confBtns);

    var last = state.i === items.length - 1;
    var next = el("button", { "class": "btn btn--solid panel__next", type: "button", disabled: "", text: last ? "Ver resultados" : "Siguiente" });

    function update() {
      btnReal.setAttribute("aria-pressed", String(current.choice === "real"));
      btnAI.setAttribute("aria-pressed", String(current.choice === "ai"));
      confBtns.forEach(function (b, k) { b.setAttribute("aria-pressed", String(current.conf === k)); });
      if (current.choice && current.conf !== null) next.removeAttribute("disabled");
      else next.setAttribute("disabled", "");
    }
    btnReal.addEventListener("click", function () { current.choice = "real"; update(); });
    btnAI.addEventListener("click", function () { current.choice = "ai"; update(); });
    confBtns.forEach(function (b, k) { b.addEventListener("click", function () { current.conf = k; update(); }); });
    next.addEventListener("click", function () {
      state.answers[state.i] = { choice: current.choice, conf: CONF[current.conf].value };
      state.i++;
      if (state.i < items.length) renderItem(); else renderResults();
      root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });

    var panel = el("div", { "class": "panel" }, [
      el("p", { "class": "question", text: item.type === "video" ? "¿Este video es real o fue generado con IA?" : "¿Esta imagen es real o fue generada con IA?" }),
      choice,
      el("div", null, [el("p", { "class": "confidence-label", id: "conf-l", text: "¿Qué tan seguro estás?" }), conf]),
      next
    ]);

    var stage = el("div", { "class": "stage" }, [frame, panel]);
    root.appendChild(el("h2", { "class": "visually-hidden", text: "Prueba: pieza " + (state.i + 1) }));
    root.appendChild(el("p", { "class": "progress" }, [dots, el("span", { text: "Pieza " + (state.i + 1) + " de " + items.length })]));
    root.appendChild(stage);
    btnReal.focus({ preventScroll: true });
  }

  function resultsPlane(aiResults) {
    var svg = svgEl("svg", { viewBox: "-20 -40 1000 790", "class": "results__plane", role: "img" });
    var detected = aiResults.filter(function (r) { return r.hit; }).length;
    svg.setAttribute("aria-label", "Avión con " + detected + " impactos rojos, que son la IA que detectaste, y " + (aiResults.length - detected) + " círculos punteados en los motores y la cabina, que son la IA que pasó como real.");
    var use = svgEl("use", { href: "assets/plane.svg#plane", "class": "plane-ink", x: 0, y: 0, width: 960, height: 716 });
    svg.appendChild(use);

    var old = svgEl("g", {});
    HITS.forEach(function (h) { old.appendChild(circle("hit-old", h[0], h[1], 6)); });
    svg.appendChild(old);

    var used = {}, safe = 0, lethal = 0, delay = 0;
    aiResults.forEach(function (r) {
      var g = svgEl("g", { "class": "is-new" });
      if (r.hit) {
        var idx = nearestHit(MINE_TARGETS[safe++ % MINE_TARGETS.length]);
        while (used[idx]) idx = (idx + 7) % HITS.length;
        used[idx] = true;
        var h = HITS[idx];
        g.appendChild(circle("hit-mine", h[0], h[1], 11));
        g.appendChild(circle("hit-ring", h[0], h[1], 19));
      } else {
        var q = LETHAL[lethal++ % LETHAL.length];
        g.appendChild(circle("ghost", q.x, q.y, q.r));
        var ang = Math.atan2(q.ly - q.y, q.lx - q.x);
        var sx = q.x + Math.cos(ang) * (q.r + 4), sy = q.y + Math.sin(ang) * (q.r + 4);
        var mx = (sx + q.lx) / 2 + 18, my = (sy + q.ly) / 2 - 10;
        g.appendChild(svgEl("path", { "class": "leader", d: "M" + sx + " " + sy + " Q" + mx + " " + my + " " + q.lx + " " + q.ly }));
        var t = svgEl("text", { "class": "refnum", x: q.lx + (q.lx < q.x ? -14 : 4), y: q.ly + (q.ly < q.y ? -6 : 22), "text-anchor": q.lx < q.x ? "end" : "start" });
        t.textContent = String(r.n);
        g.appendChild(t);
      }
      g.style.animationDelay = (0.3 + delay * 0.3) + "s";
      delay++;
      svg.appendChild(g);
    });
    var fig = el("figure", null, [svg, el("figcaption", { "class": "fig-label", text: "FIG. 3" })]);
    return fig;
  }

  function renderResults() {
    root.innerHTML = "";
    var aiResults = [], correct = 0, falseAlarms = 0, confSum = 0;
    items.forEach(function (it, k) {
      var a = state.answers[k];
      var ok = a.choice === it.answer;
      if (ok) correct++;
      confSum += a.conf;
      if (it.answer === "ai") aiResults.push({ n: k + 1, hit: a.choice === "ai" });
      if (it.answer === "real" && a.choice === "ai") falseAlarms++;
    });
    var aiTotal = aiResults.length;
    var aiHit = aiResults.filter(function (r) { return r.hit; }).length;
    var acc = Math.round((correct / items.length) * 100);
    var confAvg = Math.round(confSum / items.length);

    var text = el("div", { "class": "results__text" });
    text.appendChild(el("h2", { text: "Tu avión regresó así" }));
    text.appendChild(el("p", { "class": "results__score", html: aiHit + " de " + aiTotal + "<small>piezas generadas con IA que detectaste</small>" }));
    text.appendChild(el("ul", { "class": "legend" }, [
      el("li", null, [el("i", { "class": "l-mine" }), document.createTextNode("IA que detectaste")]),
      el("li", null, [el("i", { "class": "l-ghost" }), document.createTextNode("IA que pasó como real")]),
      el("li", null, [el("i", { "class": "l-old" }), document.createTextNode("Impactos del diagrama original")])
    ]));

    var msg;
    if (aiHit === aiTotal) msg = "Detectaste todas las piezas de IA de esta prueba. Aun así, son piezas de pruebas públicas, elegidas para poder detectarse. En tu feed no hay nadie que te avise cuáles revisar.";
    else msg = "Cada pieza que detectaste es un impacto en rojo sobre el avión que regresó. Las " + (aiTotal - aiHit) + " que no detectaste están marcadas con su número en los motores y la cabina, las zonas donde un impacto derriba el avión: son los aviones que no regresaron. Si alguien te preguntara cuánta IA viste hoy, esas no estarían en tu cuenta.";
    text.appendChild(el("p", { text: msg }));
    if (falseAlarms > 0) {
      text.appendChild(el("p", { text: "Además, marcaste como IA " + (falseAlarms === 1 ? "una pieza real" : falseAlarms + " piezas reales") + ". Ese es el otro lado del problema: cuando todo puede ser falso, también lo real empieza a ponerse en duda." }));
    }

    var calib = el("div", { "class": "calib", role: "img", "aria-label": "Acierto " + acc + " por ciento; confianza promedio " + confAvg + " por ciento" }, [
      el("div", { "class": "calib__row" }, [el("span", { text: "Tu acierto" }), el("div", { "class": "calib__bar", html: '<span style="width:' + acc + '%"></span>' }), el("span", { "class": "calib__val", text: acc + "%" })]),
      el("div", { "class": "calib__row calib__row--conf" }, [el("span", { text: "Tu confianza" }), el("div", { "class": "calib__bar", html: '<span style="width:' + confAvg + '%"></span>' }), el("span", { "class": "calib__val", text: confAvg + "%" })])
    ]);
    text.appendChild(calib);
    if (confAvg > acc) text.appendChild(el("p", { text: "Tu confianza fue mayor que tu acierto. Es el mismo patrón que encontraron Miller y colegas (2023): quienes más se equivocan suelen ser quienes más seguros se sienten." }));

    var results = el("div", { "class": "results" }, [resultsPlane(aiResults), text]);
    root.appendChild(results);

    // Revelación pieza por pieza
    var list = el("ol", { "class": "reveal__grid" });
    items.forEach(function (it, k) {
      var a = state.answers[k];
      var ok = a.choice === it.answer;
      var thumb = el("div", { "class": "reveal__thumb" });
      thumb.appendChild(mediaFor(it, { thumb: true }));
      list.appendChild(el("li", { "class": "reveal__item" }, [
        thumb,
        el("p", { "class": "reveal__verdict" }, [
          el("span", { text: (k + 1) + ". " + (it.answer === "ai" ? "Generada con IA" : "Real") }),
          el("span", { "class": ok ? "ok" : "miss", text: ok ? "Acertaste" : "Fallaste" })
        ]),
        el("p", { "class": "reveal__credit" }, [document.createTextNode(it.credit + ". "), el("a", { href: it.source, target: "_blank", rel: "noopener", text: "Fuente" })])
      ]));
    });
    root.appendChild(el("section", { "class": "reveal", "aria-label": "Respuestas" }, [el("h3", { text: "Las respuestas" }), list]));

    var again = el("button", { "class": "btn", type: "button", text: "Repetir la prueba" });
    again.addEventListener("click", function () { state = { i: 0, answers: [] }; renderItem(); });
    root.appendChild(el("div", { "class": "results__actions" }, [
      el("a", { "class": "btn btn--solid", href: "#ensayo", text: "Leer el ensayo" }),
      again
    ]));
  }

  document.addEventListener("DOMContentLoaded", function () {
    drawHeroHits();
    drawWaffles();
    var start = document.getElementById("quiz-start");
    if (start && items.length) start.addEventListener("click", function () { renderItem(); });
  });
})();
