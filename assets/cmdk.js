(function(){
  // ---- View Transitions (native cross-fade between pages) ----
  var vt = document.createElement('style');
  vt.textContent = '@view-transition{navigation:auto}';
  document.head.appendChild(vt);

  // ---- Command palette (Cmd/Ctrl+K) ----
  var PAGES = [
    { title: 'Home', url: '/', desc: 'Dhruv Pradeep' },
    { title: 'About', url: '/about', desc: 'Who I am, based in Bangalore' },
    { title: 'Now', url: '/now', desc: "What I'm building — Cnvrted & Morphic" },
    { title: 'Work', url: '/work', desc: 'MorphicKIDS videos' },
    { title: 'Words', url: '/words', desc: 'Quote cards' },
    { title: 'Posts', url: '/posts', desc: 'LinkedIn, X, Substack, Bluesky, Product Hunt, Spotify' },
    { title: 'Blog', url: '/blog', desc: 'Essays on startups, sales, AI' },
    { title: 'Manifesto', url: '/manifesto', desc: "I don't wait. I move." },
    { title: 'Contact', url: '/contact', desc: 'Mail, socials, book a call' },
    { title: 'The Anatomy of Misdirected Desire', url: '/blog/misdirected-desire', desc: 'Most of what you want, you were taught to want by someone standing close enough to envy.' },
    { title: 'Your Degree Was Never the Point', url: '/blog/degree-was-never-the-point', desc: "Your major, your degree, your dropout story — none of it is the finish line." },
    { title: 'The Architecture of Thought', url: '/blog/architecture-of-thought', desc: 'Your brain is the one tool you use for everything. Sharpen it.' },
    { title: 'Beyond Default Mode', url: '/blog/high-agency', desc: 'You are not a bucket, waiting to be filled. You are a tap.' },
    { title: 'The Truth Is a Gift', url: '/blog/truth-is-a-gift', desc: "Don't react. Sit with it. Then rise." },
    { title: 'I Am Autotelic', url: '/blog/autotelic', desc: 'The goal lives inside the doing.' },
    { title: '88% of AI Money Went to America', url: '/blog/twelve-percent', desc: "The money went to America. Fine. The problems didn't." },
    { title: 'Why I Dropped Out of College at 19', url: '/blog/dropout', desc: 'Own the credit, own the blame, and stand solid behind every decision.' },
    { title: "They're Not Coming for Your Job", url: '/blog/first-job', desc: 'A junior analyst is now a $20 API call.' },
    { title: 'AI Is a Bubble', url: '/blog/ai-bubble', desc: 'I build AI for a living. Both things are true.' }
  ];

  var overlay, input, list, activeIndex = 0, filtered = PAGES.slice();

  function buildUI(){
    var style = document.createElement('style');
    style.textContent =
      '.cmdk-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding:12vh 1.5rem 2rem;opacity:0;pointer-events:none;transition:opacity .18s ease}' +
      '.cmdk-overlay.open{opacity:1;pointer-events:auto}' +
      '.cmdk-box{width:100%;max-width:560px;background:#0d0d0d;border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;transform:translateY(-10px);transition:transform .18s ease}' +
      '.cmdk-overlay.open .cmdk-box{transform:translateY(0)}' +
      '.cmdk-input-row{display:flex;align-items:center;gap:.8rem;padding:1.1rem 1.3rem;border-bottom:1px solid rgba(255,255,255,.1)}' +
      '.cmdk-input-row svg{width:16px;height:16px;flex-shrink:0;stroke:rgba(255,255,255,.4)}' +
      '.cmdk-input{flex:1;background:none;border:none;outline:none;color:#fff;font-family:Poppins,sans-serif;font-size:.95rem}' +
      '.cmdk-input::placeholder{color:rgba(255,255,255,.35)}' +
      '.cmdk-esc{font-family:"JetBrains Mono",monospace;font-size:.62rem;letter-spacing:1px;color:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.16);border-radius:4px;padding:.2rem .4rem}' +
      '.cmdk-list{max-height:50vh;overflow-y:auto;padding:.5rem}' +
      '.cmdk-item{display:flex;flex-direction:column;gap:.15rem;padding:.75rem 1rem;border-radius:10px;cursor:pointer;text-decoration:none}' +
      '.cmdk-item.active{background:rgba(255,255,255,.08)}' +
      '.cmdk-item-title{color:#fff;font-family:Poppins,sans-serif;font-size:.9rem;font-weight:600}' +
      '.cmdk-item-desc{color:rgba(255,255,255,.4);font-family:Poppins,sans-serif;font-size:.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.cmdk-empty{padding:1.5rem 1rem;text-align:center;color:rgba(255,255,255,.35);font-family:Poppins,sans-serif;font-size:.85rem}' +
      '.cmdk-hint{position:fixed;bottom:1.4rem;right:1.6rem;z-index:40;font-family:"JetBrains Mono",monospace;font-size:.62rem;letter-spacing:1.5px;color:rgba(255,255,255,.3);display:flex;align-items:center;gap:.4rem;pointer-events:none;opacity:.8}' +
      '.cmdk-hint kbd{border:1px solid rgba(255,255,255,.18);border-radius:4px;padding:.15rem .4rem;color:rgba(255,255,255,.55)}' +
      '@media(max-width:600px){.cmdk-hint{display:none}}';
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.className = 'cmdk-overlay';
    overlay.innerHTML =
      '<div class="cmdk-box">' +
        '<div class="cmdk-input-row">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input class="cmdk-input" type="text" placeholder="Search pages and posts...">' +
          '<span class="cmdk-esc">ESC</span>' +
        '</div>' +
        '<div class="cmdk-list"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('.cmdk-input');
    list = overlay.querySelector('.cmdk-list');

    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    input.addEventListener('input', function(){ render(input.value); });
    input.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      if (e.key === 'Enter') { e.preventDefault(); go(filtered[activeIndex]); }
    });
  }

  function render(q){
    q = (q || '').toLowerCase().trim();
    filtered = !q ? PAGES.slice() : PAGES.filter(function(p){
      return p.title.toLowerCase().indexOf(q) !== -1 || p.desc.toLowerCase().indexOf(q) !== -1;
    });
    activeIndex = 0;
    if (!filtered.length) {
      list.innerHTML = '<div class="cmdk-empty">No matches.</div>';
      return;
    }
    list.innerHTML = filtered.map(function(p, i){
      return '<a class="cmdk-item' + (i === 0 ? ' active' : '') + '" href="' + p.url + '" data-i="' + i + '">' +
        '<span class="cmdk-item-title">' + p.title + '</span>' +
        '<span class="cmdk-item-desc">' + p.desc + '</span>' +
      '</a>';
    }).join('');
    Array.prototype.forEach.call(list.querySelectorAll('.cmdk-item'), function(el){
      el.addEventListener('mouseenter', function(){
        activeIndex = parseInt(el.getAttribute('data-i'), 10);
        highlight();
      });
      el.addEventListener('click', function(e){ e.preventDefault(); go(filtered[parseInt(el.getAttribute('data-i'), 10)]); });
    });
  }

  function highlight(){
    Array.prototype.forEach.call(list.querySelectorAll('.cmdk-item'), function(el, i){
      el.classList.toggle('active', i === activeIndex);
    });
  }

  function move(delta){
    if (!filtered.length) return;
    activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
    highlight();
    var el = list.querySelectorAll('.cmdk-item')[activeIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function go(page){
    if (!page) return;
    location.href = page.url;
  }

  function open(){
    if (!overlay) buildUI();
    overlay.classList.add('open');
    input.value = '';
    render('');
    setTimeout(function(){ input.focus(); }, 10);
  }

  function close(){
    if (overlay) overlay.classList.remove('open');
  }

  document.addEventListener('keydown', function(e){
    var mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (overlay && overlay.classList.contains('open')) close(); else open();
    }
  });

  document.addEventListener('DOMContentLoaded', function(){
    if (!document.querySelector('.cmdk-hint')) {
      // hint is created lazily in buildUI on first open; create a static one now
      var hint = document.createElement('div');
      hint.className = 'cmdk-hint';
      var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      hint.innerHTML = '<kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd><span>Search</span>';
      var style = document.createElement('style');
      style.textContent = '.cmdk-hint{position:fixed;bottom:1.4rem;right:1.6rem;z-index:40;font-family:"JetBrains Mono",monospace;font-size:.62rem;letter-spacing:1.5px;color:rgba(255,255,255,.3);display:flex;align-items:center;gap:.4rem;pointer-events:none;opacity:.8}.cmdk-hint kbd{border:1px solid rgba(255,255,255,.18);border-radius:4px;padding:.15rem .4rem;color:rgba(255,255,255,.55)}@media(max-width:600px){.cmdk-hint{display:none}}';
      document.head.appendChild(style);
      document.body.appendChild(hint);
    }
  });
})();
