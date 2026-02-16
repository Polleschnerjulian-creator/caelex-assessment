"use strict";
(() => {
  var k = {
    dark: {
      "--caelex-bg": "#0A0F1E",
      "--caelex-card-bg": "#1E293B",
      "--caelex-card-border": "#334155",
      "--caelex-text-primary": "#E2E8F0",
      "--caelex-text-secondary": "#94A3B8",
      "--caelex-text-heading": "#F8FAFC",
      "--caelex-accent": "#3B82F6",
      "--caelex-accent-hover": "#2563EB",
      "--caelex-green": "#22C55E",
      "--caelex-amber": "#F59E0B",
      "--caelex-red": "#EF4444",
      "--caelex-input-bg": "#0F172A",
      "--caelex-input-border": "#334155",
      "--caelex-input-text": "#E2E8F0",
    },
    light: {
      "--caelex-bg": "#FFFFFF",
      "--caelex-card-bg": "#F8FAFC",
      "--caelex-card-border": "#E2E8F0",
      "--caelex-text-primary": "#1E293B",
      "--caelex-text-secondary": "#64748B",
      "--caelex-text-heading": "#0F172A",
      "--caelex-accent": "#3B82F6",
      "--caelex-accent-hover": "#2563EB",
      "--caelex-green": "#16A34A",
      "--caelex-amber": "#D97706",
      "--caelex-red": "#DC2626",
      "--caelex-input-bg": "#FFFFFF",
      "--caelex-input-border": "#CBD5E1",
      "--caelex-input-text": "#1E293B",
    },
  };
  var S = `
.caelex-widget-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--caelex-text-primary);
  background: var(--caelex-bg);
  border: 1px solid var(--caelex-card-border);
  border-radius: 12px;
  overflow: hidden;
  max-width: 420px;
  width: 100%;
}
.caelex-widget-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.caelex-card {
  background: var(--caelex-card-bg);
  border: 1px solid var(--caelex-card-border);
  border-radius: 8px;
  padding: 16px;
}
.caelex-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--caelex-card-border);
  display: flex;
  align-items: center;
  gap: 10px;
}
.caelex-header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--caelex-text-heading);
}
.caelex-header-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--caelex-accent);
  color: #fff;
}
.caelex-body { padding: 20px; }
.caelex-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}
.caelex-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--caelex-card-border);
  transition: background 0.2s, transform 0.2s;
}
.caelex-step-dot.active {
  background: var(--caelex-accent);
  transform: scale(1.25);
}
.caelex-step-dot.completed { background: var(--caelex-green); }
.caelex-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--caelex-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.caelex-select {
  width: 100%;
  padding: 10px 12px;
  background: var(--caelex-input-bg);
  border: 1px solid var(--caelex-input-border);
  border-radius: 8px;
  color: var(--caelex-input-text);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394A3B8' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}
.caelex-select:focus { border-color: var(--caelex-accent); }
.caelex-field { margin-bottom: 14px; }
.caelex-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.caelex-btn-primary { background: var(--caelex-accent); color: #fff; }
.caelex-btn-primary:hover { background: var(--caelex-accent-hover); }
.caelex-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.caelex-btn-outline {
  background: transparent;
  color: var(--caelex-accent);
  border: 1px solid var(--caelex-accent);
}
.caelex-btn-outline:hover { background: var(--caelex-accent); color: #fff; }
.caelex-result { animation: caelex-fadeIn 0.3s ease-out; }
.caelex-result-header { text-align: center; margin-bottom: 16px; }
.caelex-result-regime {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.caelex-regime-standard { background: rgba(59,130,246,0.15); color: var(--caelex-accent); }
.caelex-regime-light { background: rgba(34,197,94,0.15); color: var(--caelex-green); }
.caelex-result-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--caelex-card-border);
  font-size: 13px;
}
.caelex-result-stat:last-child { border-bottom: none; }
.caelex-result-stat-label { color: var(--caelex-text-secondary); }
.caelex-result-stat-value { font-weight: 600; color: var(--caelex-text-heading); }
.caelex-module-badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.caelex-module-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.caelex-module-badge.required { background: rgba(239,68,68,0.12); color: var(--caelex-red); }
.caelex-module-badge.simplified { background: rgba(245,158,11,0.12); color: var(--caelex-amber); }
.caelex-grade {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  margin: 0 auto 12px;
  border: 3px solid;
}
.caelex-grade-essential { color: var(--caelex-red); border-color: var(--caelex-red); background: rgba(239,68,68,0.08); }
.caelex-grade-important { color: var(--caelex-amber); border-color: var(--caelex-amber); background: rgba(245,158,11,0.08); }
.caelex-grade-out_of_scope { color: var(--caelex-green); border-color: var(--caelex-green); background: rgba(34,197,94,0.08); }
.caelex-cta { margin-top: 16px; }
.caelex-footer {
  padding: 10px 20px;
  border-top: 1px solid var(--caelex-card-border);
  text-align: center;
  font-size: 11px;
  color: var(--caelex-text-secondary);
}
.caelex-footer a { color: var(--caelex-accent); text-decoration: none; }
.caelex-footer a:hover { text-decoration: underline; }
.caelex-loading { display: flex; justify-content: center; padding: 32px 0; }
.caelex-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--caelex-card-border);
  border-top-color: var(--caelex-accent);
  border-radius: 50%;
  animation: caelex-spin 0.6s linear infinite;
}
.caelex-error { text-align: center; padding: 16px; color: var(--caelex-red); font-size: 13px; }
@keyframes caelex-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes caelex-spin { to { transform: rotate(360deg); } }
`;
  function L(t, n) {
    let c = t.attachShadow({ mode: "open" }),
      r = document.createElement("style");
    ((r.textContent = S), c.appendChild(r));
    let e = document.createElement("div");
    e.classList.add("caelex-widget-root");
    let s = k[n] || k.dark;
    for (let [m, u] of Object.entries(s)) e.style.setProperty(m, u);
    return (c.appendChild(e), e);
  }
  var f = class {
    constructor(n) {
      this.baseUrl = n.replace(/\/$/, "");
    }
    async quickCheck(n) {
      let c = await fetch(`${this.baseUrl}/api/public/compliance/quick-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n),
      });
      if (!c.ok) {
        let e = await c.json().catch(() => ({ error: "Request failed" }));
        throw new Error(e.error || `HTTP ${c.status}`);
      }
      return (await c.json()).data;
    }
    async nis2Classify(n) {
      let c = await fetch(
        `${this.baseUrl}/api/public/compliance/nis2/quick-classify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(n),
        },
      );
      if (!c.ok) {
        let e = await c.json().catch(() => ({ error: "Request failed" }));
        throw new Error(e.error || `HTTP ${c.status}`);
      }
      return (await c.json()).data;
    }
    async trackEvent(n, c) {
      try {
        await fetch(`${this.baseUrl}/api/public/widget/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: n, widgetId: c }),
        });
      } catch {}
    }
  };
  function C(t, n, c) {
    let r = document.createElement("div");
    r.className = "caelex-steps";
    for (let e = 0; e < n; e++) {
      let s = document.createElement("div");
      ((s.className = "caelex-step-dot"),
        e === c
          ? s.classList.add("active")
          : e < c && s.classList.add("completed"),
        r.appendChild(s));
    }
    t.appendChild(r);
  }
  function M(t, n, c, r) {
    let e = document.createElement("div");
    e.className = "caelex-result";
    let s = document.createElement("div");
    s.className = "caelex-result-header";
    let m = document.createElement("span");
    ((m.className = `caelex-result-regime caelex-regime-${n.regime}`),
      (m.textContent = n.regimeLabel),
      s.appendChild(m),
      e.appendChild(s));
    let u = [
      { label: "Operator Type", value: n.operatorTypeLabel },
      {
        label: "Applicable Articles",
        value: `${n.applicableArticleCount} / ${n.totalArticles}`,
      },
    ];
    for (let a of u) {
      let l = document.createElement("div");
      ((l.className = "caelex-result-stat"),
        (l.innerHTML = `
      <span class="caelex-result-stat-label">${a.label}</span>
      <span class="caelex-result-stat-value">${a.value}</span>
    `),
        e.appendChild(l));
    }
    if (n.topModules.length > 0) {
      let a = document.createElement("div");
      a.className = "caelex-module-badges";
      for (let l of n.topModules) {
        let i = document.createElement("span");
        ((i.className = `caelex-module-badge ${l.status}`),
          (i.textContent = l.name),
          a.appendChild(i));
      }
      e.appendChild(a);
    }
    let b = document.createElement("div");
    b.className = "caelex-cta";
    let x = document.createElement("a");
    ((x.className = "caelex-btn caelex-btn-primary"),
      (x.textContent = "Get Full Assessment"),
      x.setAttribute("href", n.ctaUrl),
      x.setAttribute("target", "_blank"),
      x.setAttribute("rel", "noopener"),
      (x.style.display = "block"),
      (x.style.textAlign = "center"),
      (x.style.textDecoration = "none"),
      x.addEventListener("click", () => {
        r && c.trackEvent("cta_click", r);
      }),
      b.appendChild(x),
      e.appendChild(b),
      t.appendChild(e));
  }
  var z = [
      { value: "spacecraft", label: "Spacecraft Operator" },
      { value: "launch_vehicle", label: "Launch Vehicle Operator" },
      { value: "launch_site", label: "Launch Site Operator" },
      { value: "isos", label: "In-Space Services" },
      { value: "data_provider", label: "Data Provider" },
    ],
    _ = [
      { value: "small", label: "Small Enterprise" },
      { value: "research", label: "Research Institution" },
      { value: "medium", label: "Medium Enterprise" },
      { value: "large", label: "Large Enterprise" },
    ],
    O = [
      { value: "eu", label: "EU Member State" },
      {
        value: "third_country_eu_services",
        label: "Non-EU (serves EU market)",
      },
      { value: "third_country_no_eu", label: "Non-EU (no EU services)" },
    ];
  function w(t, n) {
    let c = document.createElement("select");
    c.className = "caelex-select";
    let r = document.createElement("option");
    ((r.value = ""),
      (r.textContent = n),
      (r.disabled = !0),
      (r.selected = !0),
      c.appendChild(r));
    for (let e of t) {
      let s = document.createElement("option");
      ((s.value = e.value), (s.textContent = e.label), c.appendChild(s));
    }
    return c;
  }
  function T(t, n) {
    let c = new f(n.apiUrl);
    n.widgetId && c.trackEvent("impression", n.widgetId);
    let r = 0,
      e = {};
    function s() {
      t.innerHTML = "";
      let a = document.createElement("div");
      ((a.className = "caelex-header"),
        (a.innerHTML = `
      <span class="caelex-header-title">Space Act Compliance Check</span>
      <span class="caelex-header-badge">Free</span>
    `),
        t.appendChild(a));
      let l = document.createElement("div");
      if (((l.className = "caelex-body"), r < 3)) {
        C(l, 3, r);
        let i = document.createElement("div");
        if (((i.className = "caelex-field"), r === 0)) {
          let o = document.createElement("label");
          ((o.className = "caelex-label"),
            (o.textContent = "Activity Type"),
            i.appendChild(o));
          let p = w(z, "Select your activity...");
          (e.activityType && (p.value = e.activityType),
            p.addEventListener("change", () => {
              e.activityType = p.value;
            }),
            i.appendChild(p));
        } else if (r === 1) {
          let o = document.createElement("label");
          ((o.className = "caelex-label"),
            (o.textContent = "Entity Size"),
            i.appendChild(o));
          let p = w(_, "Select your size...");
          (e.entitySize && (p.value = e.entitySize),
            p.addEventListener("change", () => {
              e.entitySize = p.value;
            }),
            i.appendChild(p));
        } else if (r === 2) {
          let o = document.createElement("label");
          ((o.className = "caelex-label"),
            (o.textContent = "Establishment"),
            i.appendChild(o));
          let p = w(O, "Select establishment...");
          (e.establishment && (p.value = e.establishment),
            p.addEventListener("change", () => {
              e.establishment = p.value;
            }),
            i.appendChild(p));
        }
        l.appendChild(i);
        let d = document.createElement("button");
        ((d.className = "caelex-btn caelex-btn-primary"),
          (d.textContent = r === 2 ? "Check Compliance" : "Next"),
          d.addEventListener("click", () => {
            e[["activityType", "entitySize", "establishment"][r]] &&
              (r++, r === 3 ? (m(), b()) : s());
          }),
          l.appendChild(d));
      }
      (t.appendChild(l), x());
    }
    function m() {
      t.innerHTML = "";
      let a = document.createElement("div");
      ((a.className = "caelex-header"),
        (a.innerHTML = '<span class="caelex-header-title">Analyzing...</span>'),
        t.appendChild(a));
      let l = document.createElement("div");
      l.className = "caelex-body";
      let i = document.createElement("div");
      ((i.className = "caelex-loading"),
        (i.innerHTML = '<div class="caelex-spinner"></div>'),
        l.appendChild(i),
        t.appendChild(l),
        x());
    }
    function u(a) {
      t.innerHTML = "";
      let l = document.createElement("div");
      ((l.className = "caelex-header"),
        (l.innerHTML = '<span class="caelex-header-title">Error</span>'),
        t.appendChild(l));
      let i = document.createElement("div");
      i.className = "caelex-body";
      let d = document.createElement("div");
      ((d.className = "caelex-error"), (d.textContent = a), i.appendChild(d));
      let o = document.createElement("button");
      ((o.className = "caelex-btn caelex-btn-outline"),
        (o.textContent = "Try Again"),
        o.addEventListener("click", () => {
          ((r = 0), s());
        }),
        i.appendChild(o),
        t.appendChild(i),
        x());
    }
    async function b() {
      try {
        let a = await c.quickCheck({
          activityType: e.activityType,
          entitySize: e.entitySize,
          establishment: e.establishment,
        });
        (n.widgetId && c.trackEvent("completion", n.widgetId),
          (t.innerHTML = ""));
        let l = document.createElement("div");
        ((l.className = "caelex-header"),
          (l.innerHTML =
            '<span class="caelex-header-title">Your Compliance Profile</span>'),
          t.appendChild(l));
        let i = document.createElement("div");
        ((i.className = "caelex-body"),
          M(i, a, c, n.widgetId),
          t.appendChild(i),
          x());
      } catch (a) {
        u(a instanceof Error ? a.message : "Something went wrong");
      }
    }
    function x() {
      let a = document.createElement("div");
      ((a.className = "caelex-footer"),
        (a.innerHTML =
          'Powered by <a href="https://caelex.eu" target="_blank" rel="noopener">Caelex</a>'),
        t.appendChild(a));
    }
    s();
  }
  function I(t, n) {
    let c = new f(n.apiUrl);
    (n.widgetId && c.trackEvent("impression", n.widgetId), (t.innerHTML = ""));
    let r = document.createElement("div");
    ((r.className = "caelex-header"),
      (r.innerHTML = `
    <span class="caelex-header-title">Compliance Badge</span>
    <span class="caelex-header-badge">Preview</span>
  `),
      t.appendChild(r));
    let e = document.createElement("div");
    ((e.className = "caelex-body"), (e.style.textAlign = "center"));
    let s = document.createElement("div");
    ((s.className = "caelex-grade caelex-grade-important"),
      (s.textContent = "B"),
      e.appendChild(s));
    let m = document.createElement("p");
    ((m.style.color = "var(--caelex-text-secondary)"),
      (m.style.fontSize = "13px"),
      (m.style.marginBottom = "16px"),
      (m.textContent =
        "Connect your Caelex account to display your live compliance score."),
      e.appendChild(m));
    let u = document.createElement("a");
    ((u.className = "caelex-btn caelex-btn-primary"),
      (u.textContent = "Get Your Score"),
      u.setAttribute("href", "https://app.caelex.eu/pricing"),
      u.setAttribute("target", "_blank"),
      u.setAttribute("rel", "noopener"),
      (u.style.display = "block"),
      (u.style.textAlign = "center"),
      (u.style.textDecoration = "none"),
      u.addEventListener("click", () => {
        n.widgetId && c.trackEvent("cta_click", n.widgetId);
      }),
      e.appendChild(u),
      t.appendChild(e));
    let b = document.createElement("div");
    ((b.className = "caelex-footer"),
      (b.innerHTML =
        'Powered by <a href="https://caelex.eu" target="_blank" rel="noopener">Caelex</a>'),
      t.appendChild(b));
  }
  var P = [
    { value: "micro", label: "Micro (< 10 employees)" },
    { value: "small", label: "Small (< 50 employees)" },
    { value: "medium", label: "Medium (50-250 employees)" },
    { value: "large", label: "Large (> 250 employees)" },
  ];
  function A(t, n) {
    let c = new f(n.apiUrl);
    n.widgetId && c.trackEvent("impression", n.widgetId);
    let r = 0,
      e = "";
    function s() {
      t.innerHTML = "";
      let a = document.createElement("div");
      ((a.className = "caelex-header"),
        (a.innerHTML = `
      <span class="caelex-header-title">NIS2 Classification</span>
      <span class="caelex-header-badge">Free</span>
    `),
        t.appendChild(a));
      let l = document.createElement("div");
      if (((l.className = "caelex-body"), r === 0)) {
        C(l, 2, 0);
        let i = document.createElement("div");
        i.className = "caelex-field";
        let d = document.createElement("label");
        ((d.className = "caelex-label"),
          (d.textContent = "Organization Size"),
          i.appendChild(d));
        let o = document.createElement("select");
        o.className = "caelex-select";
        let p = document.createElement("option");
        ((p.value = ""),
          (p.textContent = "Select your size..."),
          (p.disabled = !0),
          (p.selected = !0),
          o.appendChild(p));
        for (let y of P) {
          let v = document.createElement("option");
          ((v.value = y.value), (v.textContent = y.label), o.appendChild(v));
        }
        (e && (o.value = e),
          o.addEventListener("change", () => {
            e = o.value;
          }),
          i.appendChild(o),
          l.appendChild(i));
        let h = document.createElement("button");
        ((h.className = "caelex-btn caelex-btn-primary"),
          (h.textContent = "Classify"),
          h.addEventListener("click", () => {
            e && ((r = 1), m(), b());
          }),
          l.appendChild(h));
      }
      (t.appendChild(l), x());
    }
    function m() {
      t.innerHTML = "";
      let a = document.createElement("div");
      ((a.className = "caelex-header"),
        (a.innerHTML =
          '<span class="caelex-header-title">Classifying...</span>'),
        t.appendChild(a));
      let l = document.createElement("div");
      ((l.className = "caelex-body"),
        (l.innerHTML =
          '<div class="caelex-loading"><div class="caelex-spinner"></div></div>'),
        t.appendChild(l),
        x());
    }
    function u(a) {
      t.innerHTML = "";
      let l = document.createElement("div");
      ((l.className = "caelex-header"),
        (l.innerHTML =
          '<span class="caelex-header-title">NIS2 Classification</span>'),
        t.appendChild(l));
      let i = document.createElement("div");
      i.className = "caelex-body";
      let d = document.createElement("div");
      d.className = "caelex-result";
      let o = document.createElement("div");
      o.className = `caelex-grade caelex-grade-${a.classification}`;
      let p = { essential: "E", important: "I", out_of_scope: "O" };
      ((o.textContent = p[a.classification] || "?"), d.appendChild(o));
      let h = document.createElement("div");
      ((h.className = "caelex-result-header"),
        (h.innerHTML = `<strong style="color: var(--caelex-text-heading); font-size: 16px">${a.classification.replace(/_/g, " ").replace(/\b\w/g, (F) => F.toUpperCase())}</strong>`),
        d.appendChild(h));
      let y = document.createElement("p");
      ((y.style.cssText =
        "font-size: 12px; color: var(--caelex-text-secondary); margin: 12px 0;"),
        (y.textContent =
          a.reason.length > 150 ? a.reason.slice(0, 150) + "..." : a.reason),
        d.appendChild(y));
      let v = document.createElement("div");
      ((v.className = "caelex-result-stat"),
        (v.innerHTML = `
      <span class="caelex-result-stat-label">Max Penalty</span>
      <span class="caelex-result-stat-value" style="font-size: 12px">${a.penaltyRange}</span>
    `),
        d.appendChild(v));
      let E = document.createElement("div");
      E.className = "caelex-cta";
      let g = document.createElement("a");
      ((g.className = "caelex-btn caelex-btn-primary"),
        (g.textContent = "Get Full NIS2 Assessment"),
        g.setAttribute("href", a.ctaUrl),
        g.setAttribute("target", "_blank"),
        g.setAttribute("rel", "noopener"),
        (g.style.display = "block"),
        (g.style.textAlign = "center"),
        (g.style.textDecoration = "none"),
        g.addEventListener("click", () => {
          n.widgetId && c.trackEvent("cta_click", n.widgetId);
        }),
        E.appendChild(g),
        d.appendChild(E),
        i.appendChild(d),
        t.appendChild(i),
        x());
    }
    async function b() {
      try {
        let a = await c.nis2Classify({ entitySize: e, sector: "space" });
        (n.widgetId && c.trackEvent("completion", n.widgetId), u(a));
      } catch (a) {
        t.innerHTML = "";
        let l = document.createElement("div");
        ((l.className = "caelex-header"),
          (l.innerHTML = '<span class="caelex-header-title">Error</span>'),
          t.appendChild(l));
        let i = document.createElement("div");
        i.className = "caelex-body";
        let d = document.createElement("div");
        ((d.className = "caelex-error"),
          (d.textContent =
            a instanceof Error ? a.message : "Something went wrong"),
          i.appendChild(d));
        let o = document.createElement("button");
        ((o.className = "caelex-btn caelex-btn-outline"),
          (o.textContent = "Try Again"),
          o.addEventListener("click", () => {
            ((r = 0), s());
          }),
          i.appendChild(o),
          t.appendChild(i),
          x());
      }
    }
    function x() {
      let a = document.createElement("div");
      ((a.className = "caelex-footer"),
        (a.innerHTML =
          'Powered by <a href="https://caelex.eu" target="_blank" rel="noopener">Caelex</a>'),
        t.appendChild(a));
    }
    s();
  }
  function W() {
    let t = document.querySelectorAll("script[src]");
    for (let n = 0; n < t.length; n++) {
      let c = t[n].getAttribute("src") || "";
      if (c.includes("caelex-widget"))
        try {
          return new URL(c, window.location.href).origin;
        } catch {}
    }
    return "https://app.caelex.eu";
  }
  function H(t) {
    let n = t.dataset.type || "quick-check",
      c = t.dataset.theme || "dark",
      r = t.dataset.locale || "en",
      e = t.dataset.widgetId,
      s = { type: n, theme: c, locale: r, apiUrl: W(), widgetId: e },
      m = L(t, c);
    switch (n) {
      case "quick-check":
        T(m, s);
        break;
      case "compliance-badge":
        I(m, s);
        break;
      case "nis2-classifier":
        A(m, s);
        break;
      default:
        T(m, s);
    }
  }
  function N() {
    document.querySelectorAll("[data-caelex-widget]").forEach(H);
  }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", N)
    : N();
  window.CaelexWidget = { init: N, initWidget: H };
})();
