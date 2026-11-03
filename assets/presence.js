/* Mascot with a presence dot, bottom-left.
   Green while it's working hours in Bengaluru (Mon–Fri, 9–5 IST), hollow grey otherwise.
   Self-contained: injects its own styles and DOM. */
(function () {
  var TZ = 'Asia/Kolkata', START = 9, END = 17, DAYS = [1, 2, 3, 4, 5];

  var css =
    '.slk{position:fixed;left:clamp(14px,2.4vw,28px);bottom:clamp(14px,2.4vw,28px);z-index:30;display:block;width:40px;height:40px;transition:transform .5s cubic-bezier(.2,1.3,.4,1),opacity .4s}' +
    '.slk:hover{transform:translateY(-2px)}' +
    '.slk.away-foot{transform:translateY(160%);opacity:0;pointer-events:none}' +
    '.slk img{display:block;width:100%;height:100%;border-radius:50%;box-shadow:0 0 0 1px rgba(25,25,23,.14),0 6px 18px rgba(25,25,23,.14)}' +
    '.slk i{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 2.5px #efeee9}' +
    '.slk i.on{background:#2bac76}' +
    '.slk i.off{background:#efeee9;box-shadow:0 0 0 2.5px #efeee9,inset 0 0 0 2px #6b6a65}' +
    '@media(prefers-reduced-motion:reduce){.slk{transition:none}}';

  function active() {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g.weekday), h = +g.hour % 24;
    return DAYS.indexOf(day) > -1 && h >= START && h < END;
  }

  function start() {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var a = document.createElement('a'); a.className = 'slk'; a.href = '/contact';
    a.innerHTML = '<img src="/favicon.png" alt=""><i></i>';
    document.body.appendChild(a);
    function paint() {
      var on = active();
      a.querySelector('i').className = on ? 'on' : 'off';
      a.title = on ? 'Active' : 'Away · back at 9 AM IST';
      a.setAttribute('aria-label', 'Dhruv is ' + (on ? 'active' : 'away') + '. Contact');
    }
    paint(); setInterval(paint, 60000);
    // step aside when the footer is on screen, so it never covers the links there
    var foot = document.querySelector('footer');
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { a.classList.toggle('away-foot', e[0].isIntersecting); }).observe(foot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
