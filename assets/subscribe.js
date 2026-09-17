/* Substack subscribe modal — self-contained (injects its own styles + DOM).
   Shows once per visitor (re-shows after 30 days), on first interaction or
   ~4s after load, whichever comes first. Dismiss via X, backdrop, or Esc. */
(function () {
  var KEY = 'dp-sub-seen';
  var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  var SUBSTACK = 'https://dhruvprad.substack.com/subscribe';

  function recentlySeen() {
    try { var t = +localStorage.getItem(KEY); return t && (Date.now() - t) < THIRTY_DAYS; }
    catch (e) { return false; }
  }
  function markSeen() { try { localStorage.setItem(KEY, Date.now()); } catch (e) {} }
  if (recentlySeen()) return;

  var css =
    '.dpsub-back{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:1.5rem;' +
      'background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);opacity:0;pointer-events:none;transition:opacity .35s}' +
    '.dpsub-back.show{opacity:1;pointer-events:auto}' +
    '.dpsub-card{width:min(94vw,420px);background:#0e0e11;border:1px solid rgba(255,255,255,.1);border-radius:18px;' +
      'padding:2rem 1.8rem 1.6rem;box-shadow:0 30px 80px rgba(0,0,0,.7);transform:scale(.94) translateY(10px);transition:transform .4s cubic-bezier(.16,.84,.32,1);position:relative;color:#fff}' +
    '.dpsub-back.show .dpsub-card{transform:none}' +
    '.dpsub-x{position:absolute;top:.9rem;right:1rem;background:none;border:none;color:rgba(255,255,255,.4);font-size:1.4rem;line-height:1;cursor:pointer;transition:color .25s;font-family:system-ui,sans-serif}' +
    '.dpsub-x:hover{color:#fff}' +
    '.dpsub-badge{display:inline-flex;align-items:center;gap:.45rem;font-family:"JetBrains Mono",monospace;font-size:.56rem;letter-spacing:2.5px;text-transform:uppercase;color:#FF6719;margin-bottom:.9rem}' +
    '.dpsub-badge b{width:16px;height:16px;border-radius:4px;background:#FF6719;display:inline-flex;align-items:center;justify-content:center}' +
    '.dpsub-badge b svg{width:10px;height:10px;fill:#fff}' +
    '.dpsub-title{font-family:"Manrope",system-ui,sans-serif;font-weight:700;font-size:1.4rem;letter-spacing:-.01em;line-height:1.15;margin-bottom:.5rem}' +
    '.dpsub-sub{font-family:"Manrope",system-ui,sans-serif;font-size:.9rem;color:rgba(255,255,255,.6);line-height:1.5;margin-bottom:1.3rem}' +
    '.dpsub-form{display:flex;gap:.5rem}' +
    '.dpsub-form input{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:10px;' +
      'padding:.75rem .9rem;color:#fff;font-family:"Manrope",system-ui,sans-serif;font-size:.92rem;outline:none;transition:border-color .25s}' +
    '.dpsub-form input:focus{border-color:rgba(255,255,255,.5)}' +
    '.dpsub-form input::placeholder{color:rgba(255,255,255,.35)}' +
    '.dpsub-btn{background:#FF6719;color:#fff;border:none;border-radius:10px;padding:.75rem 1.1rem;font-family:"Manrope",system-ui,sans-serif;' +
      'font-weight:600;font-size:.9rem;cursor:pointer;white-space:nowrap;transition:background .25s}' +
    '.dpsub-btn:hover{background:#ff7d3a}' +
    '.dpsub-note{margin-top:.9rem;font-family:"JetBrains Mono",monospace;font-size:.6rem;letter-spacing:1px;color:rgba(255,255,255,.3)}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var back = document.createElement('div');
  back.className = 'dpsub-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', 'Subscribe');
  back.innerHTML =
    '<div class="dpsub-card">' +
      '<button class="dpsub-x" type="button" aria-label="Close">&times;</button>' +
      '<span class="dpsub-badge"><b><svg viewBox="0 0 24 24"><path d="M3 3h18v3H3V3zm0 5.5h18V22l-9-4.5L3 22V8.5z"/></svg></b>On Substack</span>' +
      '<div class="dpsub-title">New essays, in your inbox.</div>' +
      '<div class="dpsub-sub">I write on building, sales, AI and figuring it out in public. No noise — just the good stuff.</div>' +
      '<form class="dpsub-form">' +
        '<input type="email" name="email" placeholder="you@email.com" autocomplete="email" required>' +
        '<button class="dpsub-btn" type="submit">Subscribe</button>' +
      '</form>' +
      '<div class="dpsub-note">No spam. Unsubscribe anytime.</div>' +
    '</div>';
  document.body.appendChild(back);

  var card = back.querySelector('.dpsub-card');
  var closeBtn = back.querySelector('.dpsub-x');
  var form = back.querySelector('.dpsub-form');
  var input = back.querySelector('input');
  var shown = false, timer = null;

  function open() {
    if (shown) return; shown = true;
    if (timer) { clearTimeout(timer); timer = null; }
    document.removeEventListener('click', onFirst, true);
    document.removeEventListener('keydown', onFirst, true);
    back.classList.add('show');
    markSeen();
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 400);
  }
  function close() { back.classList.remove('show'); }

  closeBtn.addEventListener('click', close);
  back.addEventListener('click', function (e) { if (e.target === back) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && back.classList.contains('show')) close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (input.value || '').trim();
    if (!email) return;
    window.open(SUBSTACK + '?email=' + encodeURIComponent(email) + '&utm_source=dhruvpradeep.in', '_blank', 'noopener');
    close();
  });

  // trigger: first interaction OR 4s after load, whichever first
  function onFirst() { open(); }
  document.addEventListener('click', onFirst, true);
  document.addEventListener('keydown', onFirst, true);
  timer = setTimeout(open, 4000);
})();
