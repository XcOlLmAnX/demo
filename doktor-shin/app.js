(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => (/^https:\/\//i.test(u || "") ? u : "#");
  const list = a => (Array.isArray(a) ? a : []);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many;
  };
  const hhmm = t => String(t).replace(/^0/, "");
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const hide = el => el && el.remove();

  const tel = "tel:" + C.phone;
  const hoursText = C.hoursText || "";
  const fullAddr = `${C.city}, ${C.address}`;
  const reviewsWord = plural(C.rating.count, "отзыв", "отзыва", "отзывов");

  /* logo */
  const name = esc(C.name), acc = C.logoAccent ? esc(C.logoAccent) : "";
  $("logo").innerHTML = acc && name.endsWith(acc) ? name.slice(0, -acc.length) + "<b>" + acc + "</b>" : name;

  /* phones */
  for (const id of ["headPhone", "cPhone", "formPhone"]) { $(id).href = tel; $(id).textContent = C.phoneText; }
  for (const id of ["heroCall", "barCall", "priceCall", "headCall"]) $(id).href = tel;

  /* hero */
  setText("heroTitle", C.heroTitle || "Шиномонтаж");
  setText("heroCity", C.cityIn || C.city);
  setText("heroLead", `${C.address}.${hoursText ? " По данным 2ГИС — " + hoursText.charAt(0).toLowerCase() + hoursText.slice(1) : ""}${C.booking ? ", " + C.booking.toLowerCase() : ""}. Перед поездкой лучше позвонить.`);
  const facts = [];
  if (C.rating && C.rating.value) facts.push(`<div><strong>★ ${esc(C.rating.value)}</strong>рейтинг в ${esc(C.rating.source)}${C.rating.asOf ? ", " + esc(C.rating.asOf) : ""}</div>`);
  if (C.rating && C.rating.count) facts.push(`<div><strong>${esc(C.rating.count)}</strong>${reviewsWord}</div>`);
  if (C.hoursShort && C.hoursShort.value) facts.push(`<div><strong>${esc(C.hoursShort.value)}</strong>${esc(C.hoursShort.label || "")}</div>`);
  $("facts").innerHTML = facts.join("");
  if (C.heroPhoto && C.heroPhoto.src) {
    $("heroBg").style.backgroundImage = "url(" + JSON.stringify(C.heroPhoto.src) + ")";
    setText("photoCredit", C.heroPhoto.credit || "");
  }

  /* open / closed — by the business's own timezone */
  /* open / closed — by the business's own timezone and per-day schedule from 2GIS.
     C.schedule = "24x7" | { Mon: ["09:00","18:00"] | null, ... } */
  const toM = t => { const [h, m] = String(t).split(":"); return +h * 60 + +m; };
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_ACC = { Mon: "в понедельник", Tue: "во вторник", Wed: "в среду", Thu: "в четверг", Fri: "в пятницу", Sat: "в субботу", Sun: "в воскресенье" };
  function updateOpen() {
    const S = C.schedule;
    if (!S) { $("openTag").hidden = true; return; }
    if (S === "24x7") { $("openText").textContent = "По данным 2ГИС: работает круглосуточно"; return; }
    let m, wd;
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: C.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      m = +parts.find(p => p.type === "hour").value * 60 + +parts.find(p => p.type === "minute").value;
      wd = parts.find(p => p.type === "weekday").value;
    } catch (e) { $("openTag").hidden = true; return; }
    const di = DAYS.indexOf(wd);
    const span = d => { const h = S[d]; if (!h) return null; const f = toM(h[0]); let t = toM(h[1]); if (t <= f) t += 1440; return [f, t, h]; };
    // still open after midnight from yesterday's late shift?
    const y = span(DAYS[(di + 6) % 7]);
    if (y && y[1] > 1440 && m < y[1] - 1440) return setOpen(true, `открыто до ${y[2][1]}`);
    const t = span(DAYS[di]);
    if (t && m >= t[0] && m < t[1]) return setOpen(true, `открыто до ${t[2][1]}`);
    if (t && m < t[0]) return setOpen(false, `сейчас закрыто, откроется в ${hhmm(t[2][0])}`);
    for (let k = 1; k <= 7; k++) {
      const d = DAYS[(di + k) % 7], n = span(d);
      if (n) return setOpen(false, `сейчас закрыто, откроется ${k === 1 ? "завтра" : DAY_ACC[d]} в ${hhmm(n[2][0])}`);
    }
    $("openTag").hidden = true;
  }
  function setOpen(open, txt) {
    $("openDot").classList.toggle("off", !open);
    $("openText").textContent = "По данным 2ГИС: " + txt;
  }
  updateOpen(); setInterval(updateOpen, 60000);

  /* find block + contacts */
  setText("fAddr", fullAddr); setText("fHours", hoursText);
  setText("cAddr", fullAddr); setText("cHours", hoursText);
  $("fRoute").href = safeUrl(C.route || C.gis);
  $("cRoute").href = safeUrl(C.route || C.gis);
  const links = list(C.links).filter(l => l && l.url && l.label);
  $("socials").insertAdjacentHTML("beforeend", links.map(l =>
    `<a class="btn btn-ghost" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join(""));
  const branches = list(C.branches);
  if (branches.length) {
    $("branches").innerHTML = `<small>${branches.length === 1 ? "Ещё одна точка" : "Другие точки"} (по данным 2ГИС)</small><ul class="branches">` +
      branches.map(b => `<li>${b.url ? `<a href="${esc(safeUrl(b.url))}" target="_blank" rel="noopener noreferrer">${esc(b.address)}</a>` : esc(b.address)}${b.note ? " — " + esc(b.note) : ""}</li>`).join("") + "</ul>";
  } else hide($("branches"));
  document.querySelectorAll(".mapFallback").forEach(a => (a.href = safeUrl(C.gis)));

  /* services / prices — price is an EXACT string from the source (e.g. "от 400 ₽"), never computed */
  const groups = list(C.services);
  const allSvc = groups.flatMap(g => list(g.items));
  const priced = s => typeof s.price === "string" && s.price.trim() !== "";
  const anyPrice = allSvc.some(priced);
  const allPriced = allSvc.length && allSvc.every(priced);
  setText("svcTitle", anyPrice ? "Услуги и цены" : "Услуги");
  $("priceCallout").hidden = !!allPriced;
  setText("priceCalloutText", anyPrice ? "Цены на остальные работы уточняйте по телефону" : "Стоимость работ уточняйте по телефону");
  $("svcGrid").innerHTML = groups.map(g =>
    `<div class="pgroup"><h3>${esc(g.group)}</h3>` + list(g.items).map(s =>
      `<div class="prow"><span><b>${esc(s.name)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ""}</span>` +
      (priced(s) ? `<span class="pv">${esc(s.price)}</span>` : "") + `</div>`).join("") +
    `</div>`).join("");
  const ps = C.priceSource;
  if (anyPrice && ps && ps.label) {
    $("priceSrc").innerHTML = `Цены — по данным ${ps.url ? `<a href="${esc(safeUrl(ps.url))}" target="_blank" rel="noopener noreferrer">${esc(ps.label)}</a>` : esc(ps.label)}${ps.date ? " на " + esc(ps.date) : ""}. Могли измениться — уточняйте по телефону.`;
  } else hide($("priceSrc"));
  $("svcSelect").innerHTML = `<option value="">Что нужно сделать?</option>` + allSvc.map(s => `<option>${esc(s.name)}</option>`).join("");

  /* extras */
  const lounge = list(C.lounge), payment = list(C.payment);
  if (lounge.length) {
    $("lounge").innerHTML = lounge.map(x => `<li>${esc(x)}</li>`).join("");
    setText("loungeNote", C.loungeNote || "");
  } else hide($("loungePanel"));
  if (payment.length) $("payment").innerHTML = payment.map(x => `<li>${esc(x)}</li>`).join(""); else hide($("paymentPanel"));
  if (!lounge.length && !payment.length) hide($("extras"));

  /* reviews */
  const reviews = list(C.reviews);
  if (reviews.length) {
    $("score").href = safeUrl(C.gis + "/tab/reviews");
    $("score").innerHTML = `<span class="big">${esc(C.rating.value)}</span><span><span class="star">★</span><small>${esc(C.rating.count)} ${reviewsWord} в ${esc(C.rating.source)}${C.rating.asOf ? " · на " + esc(C.rating.asOf) : ""}</small></span>`;
    $("revGrid").innerHTML = reviews.map(([n, d, r, t]) => {
      const stars = Math.max(0, Math.min(5, Math.round(+r) || 0));
      const initial = esc(String(n || "").trim().charAt(0).toUpperCase());
      return `<article class="rev"><div class="stars" aria-label="Оценка ${stars} из 5">${"★".repeat(stars)}</div><p>${esc(t)}</p>` +
        `<footer><span class="ava">${initial}</span><span>${esc(n)}<small>${esc(d)} · ${esc(C.rating.source)}</small></span></footer></article>`;
    }).join("");
    const allPositive = reviews.every(r => +r[2] >= 4);
    $("revSrc").innerHTML = `Показаны ${reviews.length} из ${esc(C.rating.count)} ${reviewsWord} ${esc(C.rating.source)}${allPositive ? " — выбраны положительные" : ""}. ${esc(C.reviewsEditNote || "Пропуски в текстах отмечены […], исправлены опечатки и пунктуация, фамилии авторов сокращены.")} ` +
      `<a href="${esc(safeUrl(C.gis + "/tab/reviews"))}" target="_blank" rel="noopener noreferrer">Все отзывы, включая критические, — в ${esc(C.rating.source)}</a>`;
  } else hide($("reviews"));

  /* footer */
  setText("footAddr", fullAddr);

  /* booking form → WhatsApp (or phone if WhatsApp isn't set) */
  $("bookForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nameV = String(f.get("name") || "").trim();
    if (!nameV) { setText("formStatus", "Укажите имя"); e.target.elements.name.focus(); return; }
    const pd = e.target.elements.pd_consent;
    if (pd && !pd.checked) { setText("formStatus", "Отметьте согласие на обработку персональных данных"); pd.focus(); return; }
    if (!C.whatsapp) { location.href = tel; return; }
    const text = `Здравствуйте! Хочу записаться.\nИмя: ${nameV}\nУслуга: ${f.get("service") || "—"}\nАвто: ${String(f.get("car") || "").trim() || "—"}`;
    const url = `https://wa.me/${String(C.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setText("formStatus", "Открываем WhatsApp с готовым сообщением…");
  });
  const waText = C.whatsappText || C.phoneText;
  if (C.whatsapp && C.whatsappConfirmed) {
    setText("bookLead", `Оставьте имя и что нужно сделать — откроется WhatsApp с готовым сообщением на номер ${waText} (WhatsApp указан в карточке 2ГИС).`);
  } else if (C.whatsapp) {
    setText("bookLead", `Оставьте имя и что нужно сделать — откроется WhatsApp с готовым сообщением на номер ${waText}. Есть ли на этом номере WhatsApp, не подтверждено — надёжнее позвонить.`);
  } else {
    setText("bookLead", "Позвоните — мастер подскажет по времени и стоимости работ.");
    hide($("bookForm"));
    $("bookCall").hidden = false;
    $("bookCallBtn").href = tel;
    setText("bookCallText", "Позвонить " + C.phoneText);
  }

  /* maps */
  const boxes = document.querySelectorAll(".mapbox");
  if (window.L && Array.isArray(C.coords)) {
    boxes.forEach(el => {
      const ll = [C.coords[1], C.coords[0]];
      const touch = L.Browser.mobile;
      const m = L.map(el, { scrollWheelZoom: true, dragging: !touch, attributionControl: true }).setView(ll, 16);
      m.attributionControl.setPrefix(false);
      L.tileLayer("https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1", { subdomains: "0123", maxZoom: 18, attribution: "© 2ГИС" }).addTo(m);
      L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [22, 22], iconAnchor: [11, 26] }) })
        .addTo(m).bindTooltip(esc(C.name), { permanent: true, direction: "top", offset: [0, -24] });
    });
  } else boxes.forEach(el => el.remove());

  /* scroll reveal: blocks fade/slide in as the page is scrolled; siblings in one group appear one after another */
  if ("IntersectionObserver" in window) {
    const groups = [
      [".hero .tag, .hero h1, .hero .lead, .hero .actions, .hero .facts", 90],
      ["#find .panel, #find .map", 120],
      [".svc-head h2, .svc-head .callout", 100],
      ["#svcGrid .pgroup", 120],
      [".extras .panel", 120],
      [".rev-head h2, .rev-head .score", 100],
      ["#revGrid .rev", 90],
      [".rev-src", 0],
      [".book .wrap > div, .book form", 120],
      [".contacts .c-list, .contacts .map", 120],
      [".foot .wrap", 0]
    ];
    const els = [];
    groups.forEach(([sel, step]) => document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add("rv");
      el.style.setProperty("--d", Math.min(i * step, 600) + "ms");
      els.push(el);
    }));
    document.documentElement.classList.add("js-reveal");
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(el => io.observe(el));
    // after the reveal finishes, drop the delay so hover effects aren't sluggish
    els.forEach(el => el.addEventListener("transitionend", () => el.style.removeProperty("--d"), { once: true }));
  }

  /* smooth anchor scrolling (JS, so it works even when the OS has animations turned off) */
  const header = document.querySelector("header");
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let anim = 0;
  function smoothTo(y) {
    const start = window.scrollY, dist = y - start;
    if (Math.abs(dist) < 2) return;
    const dur = Math.min(900, Math.max(350, Math.abs(dist) * 0.45));
    const t0 = performance.now(), id = ++anim;
    document.documentElement.style.scrollBehavior = "auto";
    const step = now => {
      if (id !== anim) return;
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, start + dist * ease(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  ["wheel", "touchstart", "keydown"].forEach(ev => window.addEventListener(ev, () => anim++, { passive: true }));
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const hash = a.getAttribute("href");
    const target = hash === "#" ? document.body : document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    const y = hash === "#" ? 0 : target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 8;
    smoothTo(Math.max(0, y));
    history.replaceState(null, "", hash === "#" ? location.pathname + location.search : hash);
  });

  /* mobile: hide the bottom call bar while the hero (with its own buttons) is visible */
  const hero = document.querySelector(".hero");
  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver(([e]) => document.body.classList.toggle("hero-vis", e.isIntersecting), { threshold: 0.15 }).observe(hero);
  }
})();
