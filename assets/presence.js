/* Mascot with a presence dot, bottom-left, and a tiny coffee cup beside it (Buy Me a Coffee).
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
    '.bmc{position:fixed;left:calc(clamp(14px,2.4vw,28px) + 48px);bottom:calc(clamp(14px,2.4vw,28px) + 2px);z-index:30;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#efeee9;color:#191917;box-shadow:0 0 0 1px rgba(25,25,23,.16),0 4px 12px rgba(25,25,23,.12);transition:transform .5s cubic-bezier(.2,1.3,.4,1),opacity .4s,color .2s}' +
    '.bmc svg{width:15px;height:15px;overflow:visible}' +
    '.bmc .c{fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.bmc .k{fill:#c79a68}' +
    '.bmc .s{fill:none;stroke:currentColor;stroke-width:1.1;stroke-linecap:round;opacity:.55}' +
    '.bmc b{position:absolute;left:calc(100% + 8px);top:50%;transform:translate(-4px,-50%);white-space:nowrap;font:400 .62rem/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#2b3bd1;background:#efeee9;padding:.3rem .45rem;border-radius:3px;box-shadow:0 0 0 1px rgba(25,25,23,.12);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}' +
    '.bmc:hover{color:#2b3bd1;transform:translateY(-2px) rotate(-8deg)}' +
    '.bmc:hover b{opacity:1;transform:translate(0,-50%)}' +
    '.bmc:focus-visible{outline:2px solid #2b3bd1;outline-offset:3px}' +
    '.bmc.away-foot{transform:translateY(220%);opacity:0;pointer-events:none}' +
    '@media(max-width:600px){.slk{left:auto;right:16px;bottom:16px}.bmc{left:auto;right:64px;bottom:23px}.bmc b{left:auto;right:calc(100% + 8px);transform:translate(4px,-50%)}.bmc:hover b{transform:translate(0,-50%)}}' +
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
    // a tiny coffee cup beside the mascot: Buy Me a Coffee
    var cup = document.createElement('a'); cup.className = 'bmc';
    cup.href = 'https://buymeacoffee.com/dhruvprad'; cup.target = '_blank'; cup.rel = 'noopener';
    cup.setAttribute('aria-label', 'Buy me a coffee');
    cup.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="s" d="M5.5 4.2c-.8-.8.8-1.5 0-2.4M8.5 4.2c-.8-.8.8-1.5 0-2.4"/><path class="k" d="M3.2 7.6h8.6l-.5 4.3c-.1.9-.9 1.6-1.8 1.6H5.5c-.9 0-1.7-.7-1.8-1.6z"/><path class="c" d="M2.8 6h9.4l-.8 6.1c-.1 1-1 1.8-2 1.8H5.6c-1 0-1.9-.8-2-1.8zM12.1 7.4h.9c1 0 1.6.8 1.4 1.7-.2.9-1 1.4-1.9 1.4h-.8"/></svg><b>buy me a coffee &#8599;&#xFE0E;</b>';
    document.body.appendChild(cup);
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
      var l = Math.min(a.offsetLeft, cup.offsetLeft), rr = Math.max(a.offsetLeft + a.offsetWidth, cup.offsetLeft + cup.offsetWidth);
      var r = { l: l - 8, t: a.offsetTop - 8, r: rr + 8, b: a.offsetTop + a.offsetHeight + 8 };
      for (var i = 0; i < links.length; i++) {
        var q = links[i].getBoundingClientRect();
        if (q.width && q.right > r.l && q.left < r.r && q.bottom > r.t && q.top < r.b) return true;
      }
      return false;
    }
    function update() { ticking = false; var away = footOn || covers(); a.classList.toggle('away-foot', away); cup.classList.toggle('away-foot', away); }
    function queue() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { footOn = e[0].isIntersecting; queue(); }).observe(foot);
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
