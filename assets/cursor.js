/* A custom cursor for mouse users: an ink dot that sits exactly on the pointer, and a ring that trails it.
   Over a link the ring swells into a disc that inverts what's under it, with the site's arrow inside
   (↘ stays on the site, ↗ leaves it). In a text field it becomes a thin bar.
   Off on touch devices and for reduced-motion users. Self-contained: injects its own styles and DOM. */
(function () {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  // both pieces use `difference` blending in the paper colour, so they read as ink on paper
  // and flip to paper on any dark surface without knowing what's behind them
  var css =
    '.cur-on,.cur-on *{cursor:none!important}' +
    '.cur-dot,.cur-ring{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;border-radius:50%;mix-blend-mode:difference;opacity:0;will-change:transform}' +
    '.cur-dot{width:8px;height:8px;margin:-4px 0 0 -4px;background:#efeee9;transition:opacity .2s,width .2s,height .2s,margin .2s,border-radius .2s}' +
    '.cur-ring{width:34px;height:34px;margin:-17px 0 0 -17px;border:1px solid #efeee9;display:flex;align-items:center;justify-content:center;color:#000;font:400 17px/1 "Inter Tight","Helvetica Neue",Arial,sans-serif;transition:opacity .25s,width .3s cubic-bezier(.2,.9,.3,1.2),height .3s cubic-bezier(.2,.9,.3,1.2),margin .3s cubic-bezier(.2,.9,.3,1.2),background-color .2s}' +
    '.cur-ring span{opacity:0;transform:scale(.4);transition:opacity .2s,transform .3s cubic-bezier(.2,.9,.3,1.4)}' +
    '.cur-show .cur-dot,.cur-show .cur-ring{opacity:1}' +
    /* over something clickable: the dot gives way to a filled disc with the arrow cut out of it */
    '.cur-link .cur-dot{opacity:0}' +
    '.cur-link .cur-ring{width:56px;height:56px;margin:-28px 0 0 -28px;background:#efeee9}' +
    '.cur-link .cur-ring span{opacity:1;transform:none}' +
    '.cur-btn .cur-ring{width:44px;height:44px;margin:-22px 0 0 -22px}' +
    /* in a text field: a caret-like bar, no ring */
    '.cur-text .cur-dot{width:2px;height:20px;margin:-10px 0 0 -1px;border-radius:1px}' +
    '.cur-text .cur-ring{opacity:0}' +
    '.cur-down .cur-ring{width:26px;height:26px;margin:-13px 0 0 -13px}' +
    '.cur-down.cur-link .cur-ring{width:46px;height:46px;margin:-23px 0 0 -23px}';

  function start() {
    var root = document.documentElement;
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var dot = document.createElement('div'); dot.className = 'cur-dot';
    var ring = document.createElement('div'); ring.className = 'cur-ring'; ring.innerHTML = '<span></span>';
    var glyph = ring.firstChild;
    dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);

    var x = -100, y = -100, rx = -100, ry = -100, live = false, running = false;

    function frame() {
      // the ring eases toward the pointer; the dot is always exactly on it
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) requestAnimationFrame(frame); else running = false;
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

    function show() { if (!live) { live = true; rx = x; ry = y; root.classList.add('cur-on', 'cur-show'); } }
    function hide() { live = false; root.classList.remove('cur-show', 'cur-on', 'cur-link', 'cur-btn', 'cur-text', 'cur-down'); }

    function read(t) {
      var link = false, btn = false, text = false, arrow = '';
      if (t && t.closest) {
        var field = t.closest('input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=""],[contenteditable="true"]');
        var a = t.closest('a[href]'), b = t.closest('button,[role=button],summary,label,select,input[type=button],input[type=submit]');
        if (field) text = true;
        else if (a) {
          link = true;
          var out = a.target === '_blank' || (a.host && a.host !== location.host) || /^mailto:|^tel:/.test(a.getAttribute('href'));
          arrow = out ? '↗︎' : '↘︎';
        } else if (b) { link = true; btn = true; }
      }
      root.classList.toggle('cur-link', link);
      root.classList.toggle('cur-btn', btn);
      root.classList.toggle('cur-text', text);
      if (glyph.textContent !== arrow) glyph.textContent = arrow;
    }

    addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') { hide(); return; }
      x = e.clientX; y = e.clientY;
      // an embedded page keeps its own cursor; ours steps out while the pointer is over it
      if (e.target && e.target.tagName === 'IFRAME') { hide(); return; }
      show(); read(e.target); kick();
    }, { passive: true });
    addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') root.classList.add('cur-down'); else hide(); }, { passive: true });
    addEventListener('pointerup', function () { root.classList.remove('cur-down'); }, { passive: true });
    document.addEventListener('mouseleave', hide);
    addEventListener('blur', hide);
    // content can change under a still pointer (menus opening, page scrolling)
    addEventListener('scroll', function () { if (live) read(document.elementFromPoint(x, y)); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
