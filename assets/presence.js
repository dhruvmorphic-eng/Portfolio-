/* Slack-style presence, bottom-left. Reads /status.json:
   status  — the custom status (emoji + text), edit it any time
   huddle  — true while you're on a call; the huddle button then says "join"
   hours   — working hours in IST; outside them notifications show as paused
   Self-contained: injects its own styles and DOM. */
(function () {
  var TZ = 'Asia/Kolkata';
  var DEF = { status: { emoji: '🚀', text: 'Shipping Cnvrted' }, huddle: false, hours: { start: 9, end: 17, days: [1, 2, 3, 4, 5] }, calendar: 'https://cal.com/cnvrted' };

  var css =
    '.slk{position:fixed;left:clamp(14px,2.4vw,28px);bottom:clamp(14px,2.4vw,28px);z-index:30;font-family:"Inter Tight",-apple-system,sans-serif;transition:transform .5s cubic-bezier(.2,1.3,.4,1),opacity .4s}' +
    '.slk.away-foot{transform:translateY(160%);opacity:0;pointer-events:none}' +
    '.slk-btn{position:relative;display:block;width:42px;height:42px;padding:0;border:0;border-radius:10px;background:none;cursor:pointer;box-shadow:0 0 0 1px rgba(25,25,23,.14),0 8px 22px rgba(25,25,23,.14);transition:transform .25s}' +
    '.slk-btn:hover{transform:translateY(-2px)}' +
    '.slk-btn img{display:block;width:100%;height:100%;border-radius:10px;object-fit:cover}' +
    '.slk-dot{position:absolute;right:-3px;bottom:-3px;width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 2.5px #efeee9}' +
    '.slk-dot.on{background:#2bac76}' +
    '.slk-dot.off{background:#efeee9;box-shadow:0 0 0 2.5px #efeee9,inset 0 0 0 2px #6b6a65}' +
    '.slk-em{position:absolute;right:-9px;top:-9px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(25,25,23,.14);display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1}' +
    '.slk-em.hud{background:#2bac76;animation:slkp 1.6s infinite}' +
    '@keyframes slkp{0%{box-shadow:0 0 0 0 rgba(43,172,118,.5)}100%{box-shadow:0 0 0 9px rgba(43,172,118,0)}}' +
    '.slk-card{position:absolute;left:0;bottom:56px;width:300px;background:#fff;color:#1d1c1d;border-radius:10px;box-shadow:0 0 0 1px rgba(29,28,29,.13),0 18px 48px rgba(0,0,0,.16);padding:18px;opacity:0;transform:translateY(8px) scale(.98);transform-origin:bottom left;pointer-events:none;transition:opacity .18s,transform .18s}' +
    '.slk.open .slk-card{opacity:1;transform:none;pointer-events:auto}' +
    '.slk-top{display:flex;gap:12px;align-items:center}' +
    '.slk-top img{width:56px;height:56px;border-radius:10px}' +
    '.slk-name{font-size:17px;font-weight:700;letter-spacing:-.01em;line-height:1.2;display:flex;align-items:center;gap:6px}' +
    '.slk-name i{font-style:normal;font-size:14px}' +
    '.slk-role{font-size:13px;color:#616061;margin-top:2px}' +
    '.slk-pres{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#616061;margin-top:4px}' +
    '.slk-pres b{width:8px;height:8px;border-radius:50%;display:inline-block}' +
    '.slk-pres b.on{background:#2bac76}.slk-pres b.off{box-shadow:inset 0 0 0 1.5px #616061}' +
    '.slk-rows{margin:14px 0 0;padding:12px 0 0;border-top:1px solid #ebeaeb;display:grid;gap:8px;font-size:13.5px}' +
    '.slk-rows div{display:flex;gap:10px;align-items:flex-start}' +
    '.slk-rows .ic{width:18px;flex:none;text-align:center}' +
    '.slk-rows .mut{color:#616061}' +
    '.slk-dnd{background:#f8f8f8;border-radius:6px;padding:8px 10px;font-size:12.5px;color:#616061}' +
    '.slk-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}' +
    '.slk-acts a{display:flex;align-items:center;justify-content:center;gap:6px;height:34px;border-radius:6px;font-size:13.5px;font-weight:700;text-decoration:none;color:#1d1c1d;box-shadow:inset 0 0 0 1px rgba(29,28,29,.3);transition:background .15s}' +
    '.slk-acts a:hover{background:#f8f8f8}' +
    '.slk-acts a.hud{background:#2bac76;color:#fff;box-shadow:none}' +
    '.slk-acts a.hud:hover{background:#25985f}' +
    '.slk-ws{display:flex;align-items:center;gap:6px;font-size:11px;color:#868686;margin-bottom:12px;letter-spacing:.02em}' +
    '.slk-ws span{width:14px;height:14px;border-radius:4px;background:#4a154b;color:#fff;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}' +
    '@media(max-width:600px){.slk-card{width:calc(100vw - 28px)}}' +
    '@media(prefers-reduced-motion:reduce){.slk,.slk-card,.slk-btn{transition:none}.slk-em.hud{animation:none}}';

  function now() {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[g.weekday], h: +g.hour % 24, m: +g.minute };
  }
  function clock() {
    return new Date().toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  }
  function fmtHour(h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); }
  function working(hours) {
    var t = now();
    return hours.days.indexOf(t.day) > -1 && t.h >= hours.start && t.h < hours.end;
  }
  function nextStart(hours) {
    var t = now(), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (var i = 0; i < 8; i++) {
      var d = (t.day + i) % 7;
      if (hours.days.indexOf(d) < 0) continue;
      if (i === 0 && t.h >= hours.start) continue;
      return fmtHour(hours.start) + (i === 0 ? ' today' : i === 1 ? ' tomorrow' : ' ' + names[d]);
    }
    return fmtHour(hours.start);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(root, cfg) {
    var on = working(cfg.hours), st = cfg.status || {}, hud = !!cfg.huddle;
    var badge = hud ? '<span class="slk-em hud" aria-hidden="true">🎧</span>' : st.emoji ? '<span class="slk-em" aria-hidden="true">' + esc(st.emoji) + '</span>' : '';
    root.innerHTML =
      '<button class="slk-btn" type="button" aria-expanded="false" aria-label="Dhruv on Slack: ' + (hud ? 'in a huddle' : on ? 'active' : 'away') + '">' +
        '<img src="/assets/avatar-slack.webp" alt="">' + badge + '<span class="slk-dot ' + (on || hud ? 'on' : 'off') + '"></span>' +
      '</button>' +
      '<div class="slk-card" role="dialog" aria-label="Dhruv Pradeep, status">' +
        '<div class="slk-ws"><span>D</span>dhruvpradeep.in &middot; #general</div>' +
        '<div class="slk-top"><img src="/assets/avatar-slack.webp" alt="">' +
          '<div><div class="slk-name">Dhruv Pradeep' + (st.emoji ? ' <i>' + esc(st.emoji) + '</i>' : '') + '</div>' +
          '<div class="slk-role">Co-founder &amp; CEO, Cnvrted</div>' +
          '<div class="slk-pres"><b class="' + (on || hud ? 'on' : 'off') + '"></b>' + (hud ? 'In a huddle' : on ? 'Active' : 'Away') + '</div></div>' +
        '</div>' +
        '<div class="slk-rows">' +
          (st.text ? '<div><span class="ic">' + esc(st.emoji || '💬') + '</span><span>' + esc(st.text) + '</span></div>' : '') +
          (hud ? '<div><span class="ic">🎧</span><span>On a huddle right now. Grab the next slot.</span></div>' : '') +
          '<div><span class="ic">🕘</span><span class="mut">' + clock() + ' local time &middot; Bengaluru</span></div>' +
          (on ? '<div><span class="ic">🔔</span><span class="mut">Working hours, ' + fmtHour(cfg.hours.start) + '&ndash;' + fmtHour(cfg.hours.end) + ' IST</span></div>'
              : '<div class="slk-dnd">🔕 Notifications paused outside 9&ndash;5. Back at ' + nextStart(cfg.hours) + ' IST.</div>') +
        '</div>' +
        '<div class="slk-acts">' +
          '<a class="hud" href="' + esc(cfg.calendar) + '" target="_blank" rel="noopener">🎧 ' + (hud ? 'Join next huddle' : 'Huddle') + '</a>' +
          '<a href="mailto:dhruvcp07@gmail.com">Message</a>' +
        '</div>' +
      '</div>';
  }

  function mount(cfg) {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var root = document.createElement('div'); root.className = 'slk'; document.body.appendChild(root);
    render(root, cfg);
    var hoverT;
    function set(open) { root.classList.toggle('open', open); var b = root.querySelector('.slk-btn'); if (b) b.setAttribute('aria-expanded', open); }
    root.addEventListener('click', function (e) { if (e.target.closest('.slk-btn')) set(!root.classList.contains('open')); });
    if (matchMedia('(hover:hover)').matches) {
      root.addEventListener('mouseenter', function () { clearTimeout(hoverT); set(true); });
      root.addEventListener('mouseleave', function () { hoverT = setTimeout(function () { set(false); }, 250); });
    }
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    // refresh the clock and presence every minute, keeping the card open if it was
    setInterval(function () { var o = root.classList.contains('open'); render(root, cfg); set(o); }, 60000);
    // step aside when the footer is on screen, so it never covers the links there
    var foot = document.querySelector('footer');
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { root.classList.toggle('away-foot', e[0].isIntersecting); if (e[0].isIntersecting) set(false); }).observe(foot);
  }

  function start() {
    fetch('/status.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : DEF; })
      .catch(function () { return DEF; })
      .then(function (c) { c = c || DEF; c.hours = c.hours || DEF.hours; c.calendar = c.calendar || DEF.calendar; mount(c); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
