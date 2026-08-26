(function(){
  // ---- Reading progress bar ----
  var bar = document.createElement('div');
  bar.id = 'readProgress';
  bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:#fff;z-index:60;width:0%;transition:width .1s linear;box-shadow:0 0 8px rgba(255,255,255,.5);pointer-events:none';
  document.documentElement.appendChild(bar);
  function updateProgress(){
    var h = document.documentElement;
    var scrollTop = h.scrollTop || document.body.scrollTop;
    var scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
    var pct = scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // ---- Share row (copy link / X / LinkedIn) ----
  var target = document.querySelector('article') || document.querySelector('.m-close');
  if (target) {
    var row = document.createElement('div');
    row.className = 'share-row';
    var url = encodeURIComponent(location.href);
    var text = encodeURIComponent(document.title.replace(/\s*—\s*Dhruv Pradeep.*$/, ''));
    row.innerHTML =
      '<button type="button" class="share-btn" id="copyLinkBtn" aria-label="Copy link">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L12.5 19.5"/></svg>' +
        '<span>Copy link</span>' +
      '</button>' +
      '<a class="share-btn" href="https://x.com/intent/tweet?text=' + text + '&url=' + url + '" target="_blank" rel="noopener" aria-label="Share on X">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82L5 21.75H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"/></svg>' +
        '<span>Share on X</span>' +
      '</a>' +
      '<a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=' + url + '" target="_blank" rel="noopener" aria-label="Share on LinkedIn">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>' +
        '<span>Share on LinkedIn</span>' +
      '</a>';
    target.parentNode.insertBefore(row, target.nextSibling);

    var style = document.createElement('style');
    style.textContent =
      '.share-row{display:flex;gap:.7rem;flex-wrap:wrap;margin:3rem 0 1rem;padding-top:2rem;border-top:1px solid rgba(255,255,255,.08)}' +
      '.share-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.1rem;border:1px solid rgba(255,255,255,.14);border-radius:100px;background:rgba(255,255,255,.03);color:rgba(255,255,255,.75);font-family:Poppins,sans-serif;font-size:.8rem;font-weight:500;text-decoration:none;cursor:pointer;transition:all .25s}' +
      '.share-btn:hover{background:#fff;color:#000;border-color:#fff;transform:translateY(-2px)}' +
      '.share-btn svg{width:14px;height:14px;flex-shrink:0}' +
      '@media(max-width:600px){.share-btn span{display:none}.share-btn{padding:.65rem;width:38px;height:38px;justify-content:center}}';
    document.head.appendChild(style);

    var copyBtn = document.getElementById('copyLinkBtn');
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(location.href).then(function () {
        var span = copyBtn.querySelector('span');
        var orig = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(function () { span.textContent = orig; }, 1800);
      });
    });
  }
})();
