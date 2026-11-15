/* Mascot with a presence dot, bottom-left.
   Green while I'm usually on (every day, 10:30 AM to 2 AM IST), hollow grey otherwise.
   On phones it sits bottom-right, where it can't cover the left-aligned nav; anywhere else it slides away while it would cover a link.
   Self-contained: injects its own styles and DOM. */
(function () {
  var TZ = 'Asia/Kolkata', START = 10 * 60 + 30, END = 2 * 60; // minutes past midnight; the window wraps past 12

  var css =
    '.slk{position:fixed;left:clamp(14px,2.4vw,28px);bottom:clamp(14px,2.4vw,28px);z-index:30;display:block;width:40px;height:40px;transition:transform .5s cubic-bezier(.2,1.3,.4,1),opacity .4s}' +
    '.slk:hover{transform:translateY(-2px)}' +
    '.slk.away-foot{transform:translateY(160%);opacity:0;pointer-events:none}' +
    '.slk img{display:block;width:100%;height:100%;border-radius:50%;box-shadow:0 0 0 1px rgba(25,25,23,.14),0 6px 18px rgba(25,25,23,.14)}' +
    '.slk i{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 2.5px #efeee9}' +
    '.slk i.on{background:#2bac76}' +
    '.slk i.off{background:#efeee9;box-shadow:0 0 0 2.5px #efeee9,inset 0 0 0 2px #6b6a65}' +
    '@media(max-width:600px){.slk{left:auto;right:16px;bottom:16px}}' +
    '@media(prefers-reduced-motion:reduce){.slk{transition:none}}';

  function active() {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    var m = (+g.hour % 24) * 60 + +g.minute;
    return m >= START || m < END;
  }

  function start() {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var a = document.createElement('a'); a.className = 'slk'; a.href = '/contact';
    a.innerHTML = '<img src="/favicon.png" alt=""><i></i>';
    document.body.appendChild(a);
    function paint() {
      var on = active();
      a.querySelector('i').className = on ? 'on' : 'off';
      a.title = on ? 'Active' : 'Away · back at 10:30 AM IST';
      a.setAttribute('aria-label', 'Dhruv is ' + (on ? 'active' : 'away') + '. Contact');
    }
    paint(); setInterval(paint, 60000);
    // step aside when the footer is on screen, or whenever it would sit on top of a link
    // (on narrower windows the home menu runs right into this corner)
    var foot = document.querySelector('footer'), footOn = false, ticking = false;
    var links = document.querySelectorAll('main a, main button');
    function covers() {
      // where the mascot sits when shown: fixed position, ignoring the slide-away transform
      var r = { l: a.offsetLeft - 8, t: a.offsetTop - 8, r: a.offsetLeft + a.offsetWidth + 8, b: a.offsetTop + a.offsetHeight + 8 };
      for (var i = 0; i < links.length; i++) {
        var q = links[i].getBoundingClientRect();
        if (q.width && q.right > r.l && q.left < r.r && q.bottom > r.t && q.top < r.b) return true;
      }
      return false;
    }
    function update() { ticking = false; a.classList.toggle('away-foot', footOn || covers()); }
    function queue() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { footOn = e[0].isIntersecting; queue(); }).observe(foot);
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
