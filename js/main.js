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
     Todo lo que cambia con el scroll
     - Los bloques del ensayo aparecen al entrar en pantalla.
     - Los gráficos se dibujan en proporción a cuánto se ha bajado
       (si se sube, se deshacen).
     - El avión fijo de la sección de Wald cambia según el párrafo.
  ------------------------------------------------------------ */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function drawWaffles() {
    document.querySelectorAll(".waffle__grid").forEach(function (grid) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < 500; i++) frag.appendChild(document.createElement("span"));
      grid.appendChild(frag);
      grid._shown = 0;
    });
  }

  function setWaffle(grid, p) {
    var on = parseInt(grid.getAttribute("data-on"), 10) || 0;
    var target = Math.round(on * p), cells = grid.children;
    if (target === grid._shown) return;
    if (target > grid._shown) for (var i = grid._shown; i < target; i++) cells[i].className = "on";
    else for (var j = target; j < grid._shown; j++) cells[j].className = "";
    grid._shown = target;
  }

  function figProgress(f, vh) {
    var r = f.getBoundingClientRect();
    // 0 cuando la figura asoma por abajo; 1 cuando su centro llega al 45% de la pantalla
    return clamp((vh - r.top) / (vh * 0.55 + r.height * 0.5));
  }

  function updateFigures(vh) {
    document.querySelectorAll(".essay .fig").forEach(function (f) {
      var p = reduceMotion ? 1 : figProgress(f, vh);
      f.querySelectorAll(".scale__row").forEach(function (row, k) {
        var q = clamp(p * 1.25 - k * 0.12);
        row.querySelector(".scale__fill").style.transform = "scaleX(" + q + ")";
        row.querySelector(".scale__val").style.opacity = q > 0.92 ? 1 : 0;
      });
      f.querySelectorAll(".waffle__grid").forEach(function (g) { setWaffle(g, p); });
      var bar = f.querySelector(".bar516__track span");
      if (bar) bar.style.transform = "scaleX(" + p + ")";
      f.classList.toggle("is-flagged", p > 0.6);
    });
  }

  /* Avión fijo (sección 2) */
  var SCROLLY_ORDER = [];
  function buildScrolly() {
    var svg = document.getElementById("scrolly-plane");
    if (!svg) return;
    var g = svg.querySelector(".scrolly-hits");
    var order = HITS.map(function (h, i) { return i; });
    // orden pseudoaleatorio fijo, para que los impactos "lleguen" dispersos
    var seed = 1943;
    for (var i = order.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      var j = Math.floor((seed / 4294967296) * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t;
    }
    order.forEach(function (k) {
      var c = circle("hit", HITS[k][0], HITS[k][1], 6);
      c.style.opacity = 0;
      g.appendChild(c);
      SCROLLY_ORDER.push(c);
    });
  }

  function updateScrolly(vh) {
    var wrap = document.querySelector(".scrolly");
    if (!wrap || !SCROLLY_ORDER.length) return;
    var steps = wrap.querySelectorAll("p[data-step]");
    var svg = document.getElementById("scrolly-plane");
    var active = 0;
    steps.forEach(function (st, k) { if (st.getBoundingClientRect().top < vh * 0.6) active = k + 1; });
    var first = steps[0].getBoundingClientRect();
    var p = reduceMotion ? 1 : clamp((vh * 0.85 - first.top) / (first.height + vh * 0.25));
    var n = active > 1 ? SCROLLY_ORDER.length : Math.round(SCROLLY_ORDER.length * p);
    for (var i = 0; i < SCROLLY_ORDER.length; i++) SCROLLY_ORDER[i].style.opacity = i < n ? 1 : 0;
    svg.setAttribute("data-step", String(active));
    var cap = document.getElementById("scrolly-cap");
    if (cap) cap.textContent = cap.getAttribute("data-s" + Math.max(1, active)) || "";
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var essay = document.getElementById("ensayo");
      if (!essay || essay.hidden) return;
      var vh = window.innerHeight;
      updateFigures(vh);
      updateScrolly(vh);
      updateRail(vh);
    });
  }

  /* Bloques que aparecen al entrar */
  function watchReveal() {
    var blocks = document.querySelectorAll(".chapter > h2, .chapter > p, .chapter > .fig, .chapter .scrolly__text > p, .refs ol, .refs > p");
    blocks.forEach(function (b) { b.classList.add("sr"); });
    if (reduceMotion || !("IntersectionObserver" in window)) { blocks.forEach(function (b) { b.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    blocks.forEach(function (b) { io.observe(b); });
  }

  /* Barra de progreso de lectura */
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var rail = document.getElementById("rail");
  var railButtons = [];
  function buildRail() {
    var list = document.getElementById("rail-list");
    chapters.forEach(function (ch, i) {
      var b = el("button", { type: "button", "aria-label": "Ir a " + ch.getAttribute("data-title") });
      b.addEventListener("click", function () {
        ch.querySelector("h2").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
      railButtons.push(b);
      list.appendChild(el("li", null, [b]));
    });
  }
  var lastIdx = -1;
  function updateRail(vh) {
    if (!rail) return;
    var essay = document.getElementById("ensayo").getBoundingClientRect();
    rail.classList.toggle("is-shown", essay.top < vh * 0.4 && essay.bottom > vh * 0.3);
    var idx = 0;
    chapters.forEach(function (c, i) { if (c.getBoundingClientRect().top < vh * 0.45) idx = i; });
    if (idx === lastIdx) return;
    lastIdx = idx;
    railButtons.forEach(function (b, i) {
      b.classList.toggle("is-read", i < idx);
      b.classList.toggle("is-current", i === idx);
      if (i === idx) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    var label = document.getElementById("rail-label");
    label.innerHTML = "";
    label.appendChild(document.createTextNode("Sección " + (idx + 1) + " de " + chapters.length + ": "));
    label.appendChild(el("b", { text: chapters[idx].getAttribute("data-title") }));
  }

  /* El ensayo aparece cuando se termina la prueba */
  var session = { done: false, answers: null };
  try { var saved = JSON.parse(sessionStorage.getItem("lqnr2")); if (saved) session = saved; } catch (e) {}
  function saveSession() { try { sessionStorage.setItem("lqnr2", JSON.stringify(session)); } catch (e) {} }

  function showEssay() {
    var essay = document.getElementById("ensayo");
    if (!essay.hidden) return;
    essay.hidden = false;
    if (rail) rail.hidden = false;
    onScroll();
  }


  /* ------------------------------------------------------------
     Inicio guiado por scroll
     1. Solo la frase "Ya no veo tanto contenido hecho por IA.", centrada.
     2. Se tacha en rojo, de izquierda a derecha.
     3. Aparece "Ya no reconozco el contenido hecho por IA."
     4. Las dos frases se desplazan a su lugar en la portada y aparece
        el resto (descripción, avión, firma). Luego sigue la prueba.
  ------------------------------------------------------------ */
  var introEl = document.getElementById("intro");
  var heroEl = document.getElementById("inicio");
  var claimEl = document.getElementById("claim");
  var M = null;

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function textBox(span) {
    // ancho real de los renglones (el bloque ocupa toda la columna)
    var rects = span.getClientRects(), l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    for (var i = 0; i < rects.length; i++) {
      l = Math.min(l, rects[i].left); r = Math.max(r, rects[i].right);
      t = Math.min(t, rects[i].top); b = Math.max(b, rects[i].bottom);
    }
    return { l: l, r: r, t: t, b: b };
  }

  function measureIntro() {
    if (!claimEl) return;
    claimEl.style.transform = "none";
    var R = claimEl.getBoundingClientRect();
    var o = textBox(claimEl.querySelector(".claim__old .claim__text"));
    var n = textBox(claimEl.querySelector(".claim__new .claim__text"));
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var oldW = o.r - R.left, bothW = Math.max(o.r, n.r) - R.left;
    var s = Math.max(1, Math.min(1.3, (vw * 0.84) / bothW));
    function centerOn(x0, x1, y0, y1) {
      // traslación para que el rectángulo (en coordenadas del bloque) quede centrado con escala s
      var cx = R.left + s * ((x0 + x1) / 2 - R.left), cy = R.top + s * ((y0 + y1) / 2 - R.top);
      return { x: vw / 2 - cx, y: vh / 2 - cy };
    }
    M = {
      s: s,
      A: centerOn(R.left, R.left + oldW, o.t, o.b),
      B: centerOn(R.left, R.left + bothW, o.t, n.b)
    };
  }

  function updateIntro() {
    if (!introEl || !claimEl) return;
    if (reduceMotion) {
      heroEl.style.setProperty("--strike", 1); heroEl.style.setProperty("--new", 1);
      heroEl.style.setProperty("--reveal", 1); heroEl.style.setProperty("--cue", 0);
      claimEl.style.transform = "none";
      return;
    }
    if (!M) measureIntro();
    var total = introEl.offsetHeight - window.innerHeight;
    var p = total > 0 ? clamp(-introEl.getBoundingClientRect().top / total) : 1;

    var strike = ease(seg(p, 0.05, 0.28));
    var newIn = ease(seg(p, 0.32, 0.46));
    var settle = ease(seg(p, 0.54, 0.82));
    var reveal = ease(seg(p, 0.66, 0.9));

    heroEl.style.setProperty("--strike", strike.toFixed(4));
    heroEl.style.setProperty("--new", newIn.toFixed(3));
    heroEl.style.setProperty("--reveal", reveal.toFixed(3));
    heroEl.style.setProperty("--cue", (1 - seg(p, 0, 0.05)).toFixed(3));
    // el texto tachado pasa de blanco a gris a medida que se tacha
    claimEl.style.setProperty("--old-color", strike > 0.98 ? "var(--trazo-2)" : "color-mix(in srgb, var(--trazo) " + Math.round((1 - strike) * 100) + "%, var(--trazo-2))");

    var a = M.A, b = M.B;
    var x = lerp(a.x, b.x, newIn), y = lerp(a.y, b.y, newIn);
    x = lerp(x, 0, settle); y = lerp(y, 0, settle);
    var sc = lerp(M.s, 1, settle);
    claimEl.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + sc.toFixed(4) + ")";
  }

  var introTick = false;
  function onIntroScroll() {
    if (introTick) return;
    introTick = true;
    requestAnimationFrame(function () { introTick = false; updateIntro(); });
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

  function fallbackFor(item) {
    var fb = el("div", { "class": "frame__fallback" });
    fb.appendChild(document.createTextNode("Esta pieza no cargó desde su fuente original. "));
    fb.appendChild(el("a", { href: item.source, target: "_blank", rel: "noopener", text: "Verla en la fuente" }));
    return fb;
  }

  function mediaFor(item, opts) {
    opts = opts || {};
    var wrap = document.createDocumentFragment();
    var node;
    if (item.type === "video") {
      node = el("video", { src: item.src, muted: "", loop: "", playsinline: "", preload: opts.thumb ? "metadata" : "auto", "aria-label": item.alt || "Video" });
      node.muted = true;
      if (!opts.thumb && !reduceMotion) node.autoplay = true;
      if (reduceMotion && !opts.thumb) node.setAttribute("controls", "");
    } else {
      node = el("img", { src: item.src, alt: item.alt || "", decoding: "async", referrerpolicy: "no-referrer" });
      if (opts.thumb) node.setAttribute("loading", "lazy");
      else node.setAttribute("fetchpriority", "high");
    }
    var done = false;
    function ready() {
      if (done) return;
      done = true;
      node.classList.add("is-loaded");
      if (node.parentNode) node.parentNode.classList.remove("is-loading");
    }
    function fail() {
      if (done) return;
      done = true;
      var parent = node.parentNode;
      if (parent) { parent.classList.remove("is-loading"); parent.replaceChild(fallbackFor(item), node); }
    }
    node.addEventListener(item.type === "video" ? "loadeddata" : "load", ready);
    node.addEventListener("error", fail);
    // Si ya estaba en caché (precargada), mostrarla de una vez
    if (item.type !== "video" && node.complete && node.naturalWidth) setTimeout(ready, 0);
    if (!opts.thumb) setTimeout(function () { if (!done && node.parentNode) node.parentNode.classList.add("is-slow"); }, 6000);
    wrap.appendChild(node);
    return wrap;
  }

  /* Precarga de todas las piezas apenas abre la página, para que no se
     note la espera al pasar de una a otra. */
  var preloaded = [];
  function preloadQuiz() {
    items.forEach(function (it, k) {
      if (it.type === "video") {
        var v = document.createElement("video");
        v.preload = "auto"; v.muted = true; v.src = it.src;
        preloaded.push(v);
      } else {
        var im = new Image();
        im.referrerPolicy = "no-referrer";
        im.decoding = "async";
        if (k < 2 && "fetchPriority" in im) im.fetchPriority = "high";
        im.src = it.src;
        preloaded.push(im);
      }
    });
  }

  function renderItem(moveFocus) {
    var item = items[state.i];
    var current = { choice: null, conf: null };
    root.innerHTML = "";

    var dots = el("span", { "class": "progress__dots", "aria-hidden": "true" });
    items.forEach(function (_, k) {
      dots.appendChild(el("span", { "class": k < state.i ? "is-done" : (k === state.i ? "is-current" : "") }));
    });

    var box = el("div", { "class": "frame is-loading" });
    box.appendChild(el("span", { "class": "frame__loading", "aria-hidden": "true", text: "Cargando la pieza" }));
    box.appendChild(mediaFor(item));
    var frame = el("figure", { "class": "frame-wrap" }, [box, el("figcaption", { "class": "fig-label", text: "FIG. 2." + (state.i + 1) })]);

    var btnReal = el("button", { type: "button", "aria-pressed": "false", text: "Es real" });
    var btnAI = el("button", { type: "button", "aria-pressed": "false", text: "Es IA" });
    var choice = el("div", { "class": "choice", role: "group", "aria-label": "¿Real o generada con IA?" }, [btnReal, btnAI]);

    var confBtns = CONF.map(function (c, k) {
      return el("button", { type: "button", "aria-pressed": "false", "data-k": String(k), text: c.label });
    });
    var conf = el("div", { "class": "confidence", role: "group", "aria-labelledby": "conf-l" }, confBtns);

    var advancing = false;
    function update() {
      btnReal.setAttribute("aria-pressed", String(current.choice === "real"));
      btnAI.setAttribute("aria-pressed", String(current.choice === "ai"));
      confBtns.forEach(function (b, k) { b.setAttribute("aria-pressed", String(current.conf === k)); });
      if (current.choice && current.conf !== null && !advancing) {
        advancing = true;
        setTimeout(advance, reduceMotion ? 0 : 450);
      }
    }
    function advance() {
      state.answers[state.i] = { choice: current.choice, conf: CONF[current.conf].value };
      state.i++;
      if (state.i < items.length) renderItem(true); else finishQuiz();
    }
    btnReal.addEventListener("click", function () { current.choice = "real"; update(); });
    btnAI.addEventListener("click", function () { current.choice = "ai"; update(); });
    confBtns.forEach(function (b, k) { b.addEventListener("click", function () { current.conf = k; update(); }); });
    var panel = el("div", { "class": "panel" }, [
      el("p", { "class": "question", text: item.type === "video" ? "¿Este video es real o fue generado con IA?" : "¿Esta imagen es real o fue generada con IA?" }),
      choice,
      el("div", null, [el("p", { "class": "confidence-label", id: "conf-l", text: "¿Qué tan seguro estás?" }), conf])
    ]);

    var stage = el("div", { "class": "stage" }, [frame, panel]);
    root.appendChild(el("h2", { "class": "visually-hidden", text: "Prueba: pieza " + (state.i + 1) }));
    root.appendChild(el("p", { "class": "progress" }, [dots, el("span", { text: "Pieza " + (state.i + 1) + " de " + items.length + ". Algunas son reales y otras fueron generadas con IA." })]));
    root.appendChild(stage);
    if (moveFocus) {
      btnReal.focus({ preventScroll: true });
      var top = root.getBoundingClientRect().top;
      if (top < 0) root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  function finishQuiz() {
    session.done = true;
    session.answers = state.answers;
    saveSession();
    renderResults();
    root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    showEssay();
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
      var thumb = el("div", { "class": "reveal__thumb is-loading" });
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
    again.addEventListener("click", function () { state = { i: 0, answers: [] }; renderItem(true); });
    root.appendChild(el("div", { "class": "results__actions" }, [again]));
    root.appendChild(el("p", { "class": "scroll-cue", text: "Sigue bajando: lo que acabas de vivir tiene nombre." }));
  }

  function init() {
    measureIntro();
    updateIntro();
    window.addEventListener("scroll", onIntroScroll, { passive: true });
    window.addEventListener("resize", function () { M = null; onIntroScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { M = null; updateIntro(); });
    preloadQuiz();
    drawHeroHits();
    drawWaffles();
    buildScrolly();
    buildRail();
    watchReveal();
    var essay = document.getElementById("ensayo");
    if (session.done && session.answers && session.answers.length === items.length) {
      state.answers = session.answers;
      renderResults();
    } else {
      essay.hidden = true;
      if (items.length) renderItem(false);
    }
    if (session.done) showEssay();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
