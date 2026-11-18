(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------
     Geometría del avión
     Zonas donde los aviones que regresaron muestran impactos
     (alas, fuselaje, cola) y zonas letales (motores, cabina).
  ------------------------------------------------------------ */
  var LETHAL = [
    { x: 400, y: 296, r: 34 }, { x: 300, y: 312, r: 34 },
    { x: 600, y: 296, r: 34 }, { x: 700, y: 312, r: 34 },
    { x: 500, y: 120, r: 30 }
  ];
  var SAFE_SPOTS = [
    { x: 190, y: 332 }, { x: 812, y: 330 }, { x: 500, y: 440 }, { x: 392, y: 612 },
    { x: 612, y: 608 }, { x: 140, y: 338 }, { x: 858, y: 342 }, { x: 503, y: 510 }
  ];

  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function zonePaths() {
    var paths = [];
    document.querySelectorAll("#plane .zone").forEach(function (el) {
      paths.push(new Path2D(el.getAttribute("d")));
    });
    return paths;
  }

  function nearLethal(x, y, pad) {
    for (var i = 0; i < LETHAL.length; i++) {
      var dx = x - LETHAL[i].x, dy = y - LETHAL[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < LETHAL[i].r + pad) return true;
    }
    return false;
  }

  function circle(cls, x, y, r) {
    var c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("class", cls);
    c.setAttribute("cx", x.toFixed(1));
    c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("r", r);
    return c;
  }

  /* Portada: los impactos de los aviones que sí regresaron */
  function drawHeroHits() {
    var g = document.getElementById("hero-hits");
    if (!g || typeof Path2D === "undefined") return;
    var ctx = document.createElement("canvas").getContext("2d");
    var paths = zonePaths();
    var rand = rng(1943);
    var placed = 0, tries = 0;
    while (placed < 64 && tries < 6000) {
      tries++;
      var x = 60 + rand() * 880, y = 50 + rand() * 620;
      var inside = paths.some(function (p) { return ctx.isPointInPath(p, x, y); });
      if (!inside || nearLethal(x, y, 18)) continue;
      // evitar el borde exacto del fuselaje en la nariz
      if (y < 170) continue;
      g.appendChild(circle("hit", x, y, 4 + rand() * 2.5));
      placed++;
    }
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

    var frame = el("figure", { "class": "frame" });
    frame.appendChild(mediaFor(item));

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
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 1000 720");
    svg.setAttribute("class", "results__plane");
    svg.setAttribute("role", "img");
    var detected = aiResults.filter(function (r) { return r.hit; }).length;
    svg.setAttribute("aria-label", "Avión con " + detected + " impactos visibles y " + (aiResults.length - detected) + " marcas amarillas en motores y cabina, que representan la IA no detectada.");
    var use = document.createElementNS(SVGNS, "use");
    use.setAttribute("href", "#plane");
    svg.appendChild(use);

    var safe = 0, lethal = 0, delay = 0;
    aiResults.forEach(function (r) {
      var node;
      if (r.hit) {
        var p = SAFE_SPOTS[safe++ % SAFE_SPOTS.length];
        node = circle("hit is-new", p.x, p.y, 16);
      } else {
        var q = LETHAL[lethal++ % LETHAL.length];
        node = document.createElementNS(SVGNS, "g");
        node.appendChild(circle("ghost is-new", q.x, q.y, q.r));
        var t = document.createElementNS(SVGNS, "text");
        t.setAttribute("class", "ghost-label");
        t.setAttribute("x", q.x + q.r + 6);
        t.setAttribute("y", q.y - q.r + 6);
        t.textContent = String(r.n);
        node.appendChild(t);
      }
      node.style.animationDelay = (0.4 + delay * 0.35) + "s";
      Array.prototype.forEach.call(node.querySelectorAll ? node.querySelectorAll(".is-new") : [], function (c) { c.style.animationDelay = node.style.animationDelay; });
      delay++;
      svg.appendChild(node);
    });
    return svg;
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
      el("li", null, [el("i", { "class": "l-hit" }), document.createTextNode("IA que detectaste")]),
      el("li", null, [el("i", { "class": "l-ghost" }), document.createTextNode("IA que pasó como real")])
    ]));

    var msg;
    if (aiHit === aiTotal) msg = "Detectaste todas las piezas de IA de esta prueba. Aun así, son piezas de pruebas públicas, elegidas para poder detectarse. En tu feed no hay nadie que te avise cuáles revisar.";
    else msg = "Cada pieza que detectaste es un impacto en el avión que regresó. Las " + (aiTotal - aiHit) + " que no detectaste están en amarillo, sobre los motores y la cabina: son los aviones que no regresaron. Si alguien te preguntara cuánta IA viste hoy, esas no estarían en tu cuenta.";
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
