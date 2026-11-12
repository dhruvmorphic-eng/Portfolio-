#!/usr/bin/env python3
"""Build the link-preview image for every page into /og, and point each page's tags at it.

Run from anywhere:  python3 scripts/og_build.py        (needs Chrome and Pillow)
Only some pages:    python3 scripts/og_build.py cafes blog-dropout

To add a page, add a line to PAGES. Blog posts are picked up from blog.html by themselves.
The home page keeps /og.png, which this script doesn't touch.
"""
import base64
import html
import os
import re
import subprocess
import sys
import tempfile
from io import BytesIO

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "og")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SITE = "https://dhruvpradeep.in"

CHAYA = '<span lang="ml">ചായ</span>'

# file, path shown top left, headline, dim second line, mono line, description, visual, footer tag
PAGES = [
    dict(file="about.html", slug="about", path="about", word="Hey, I&rsquo;m Dhruv.", mono="19 &middot; dropout &middot; builder",
         desc="Ten years of cricket, then Manipal, then out to build.", visual="portrait"),
    dict(file="cnvrted.html", slug="cnvrted", path="cnvrted", word="cnvrted", mono="the founder&rsquo;s log",
         desc="Incorporated 29.09.2026. DPIIT-recognised 23.10.2026.", visual="mascot"),
    dict(file="cnvrted-archive.html", slug="cnvrted-archive", path="cnvrted/archive", word="archive", mono="building cnvrted, in frames",
         desc="A wall of photos from the journey.", visual="frames"),
    dict(file="now.html", slug="now", path="now", word="now", mono="what I&rsquo;m on right now",
         desc="Building Cnvrted, fixing how sales finds real buyers."),
    dict(file="learning.html", slug="learning", path="learning", word="Learning.", mono="learning in public",
         desc="Sales and buyer intent, AI and its economics, and how to think."),
    dict(file="blog.html", slug="blog", path="blog", word="Blog", mono="essays",
         desc="On startups, sales, AI and building in public."),
    dict(file="playbooks.html", slug="playbooks", path="playbooks", word="Playbooks.", mono="working documents",
         desc="On sales, AI and building, shared while they&rsquo;re still being figured out."),
    dict(file="sales.html", slug="sales", path="sales", word="Sales Playbook.", mono="a living document",
         desc="The sales playbook being built at Cnvrted."),
    dict(file="ai.html", slug="ai", path="ai", word="The AI Index.", mono="live data",
         desc="Intelligence, price and speed for 400+ AI models."),
    dict(file="manifesto.html", slug="manifesto", path="manifesto", word="I don&rsquo;t wait.", dim="I move.", mono="manifesto.js",
         desc="The principles behind the work.", tag="// read only."),
    dict(file="cafes.html", slug="cafes", path="cafes", word="Cafes I&rsquo;d", dim="send you to.", mono=f"coffee &amp; {CHAYA}",
         desc="Spots across Bengaluru, from Koramangala up to Kothanur.", visual="fan", tag='// <span lang="ml">അപ്പോ ശരി</span>'),
    dict(file="contact.html", slug="contact", path="contact", word="Reach out.", mono="mail &middot; socials &middot; book a call",
         desc="Personal and Cnvrted email, or book a call directly."),
    dict(file="uses.html", slug="uses", path="uses", word="Uses", mono="the setup",
         desc="The desk, the daily apps, the tools for making things, and the fuel."),
    dict(file="work.html", slug="work", path="work", word="MorphicKIDS.", mono="an AI-made YouTube channel for kids",
         desc="Bedtime stories, sing-alongs and science stories, built at Morphic."),
    dict(file="posts.html", slug="posts", path="posts", word="Scattered across the web.", mono="posts",
         desc="LinkedIn, X, Substack, Bluesky, Product Hunt and Spotify."),
    dict(file="music.html", slug="music", path="music", word="Music.", mono="the aux",
         desc="The artists and music I keep coming back to."),
]


def blog_pages():
    """Every post listed on blog.html, as date, title and read time."""
    src = open(os.path.join(ROOT, "blog.html"), encoding="utf8").read()
    out = []
    for slug, inner in re.findall(r'<a[^>]*href="/blog/([^"]+)"[^>]*>(.*?)</a>', src, re.S):
        text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", inner))).strip()
        m = re.match(r"(\d{4}\.\d{2}\.\d{2}) (.+) (\d+ min)$", text)
        if not m:
            print("skipped, can't read blog row:", slug)
            continue
        date, title, mins = m.groups()
        out.append(dict(file=f"blog/{slug}.html", slug=f"blog-{slug}", path="blog", word=html.escape(title),
                        mono=f"essay &middot; {date} &middot; {mins}", desc="", plain=title))
    return out


def asset(rel):
    return "file://" + os.path.join(ROOT, rel)


def visual_html(kind, tmp):
    if kind == "fan":
        picks = [("chaipedia-2", -7, 12), ("copper-2", -2, 0), ("ela-2", 3, 6)]
        return '<div class="v fan">' + "".join(
            f'<img src="{asset(f"assets/cafes/{n}-t.webp")}" style="--r:{r}deg;--y:{y}px">' for n, r, y in picks
        ) + "</div>"
    if kind == "portrait":
        path = os.path.join(ROOT, "assets", "portrait.jpg")
        return f'<div class="v portrait"><img src="file://{path}"></div>'
    if kind == "mascot":
        return f'<div class="v mascot"><img src="{asset("assets/cnvrted/mascot-dhruv.webp")}"></div>'
    if kind == "frames":
        ids = ["17", "07", "15", "13", "19", "09"]
        return '<div class="v frames">' + "".join(
            f'<img src="{asset(f"assets/cnvrted/archive/{i}-t.webp")}">' for i in ids
        ) + "</div>"
    return ""


TEMPLATE = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&family=JetBrains+Mono:wght@400;500&family=Manjari:wght@400&display=block" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1200px;height:630px;overflow:hidden;background:#efeee9;color:#191917;font-family:'Inter Tight',sans-serif;-webkit-font-smoothing:antialiased}}
[lang=ml]{{font-family:'Manjari',sans-serif;letter-spacing:0}}
.card{{position:relative;width:1200px;height:630px;padding:32px 44px 30px;display:flex;flex-direction:column}}
.top,.foot{{display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:24px;letter-spacing:.01em}}
.top b{{font-weight:500}} .top em{{font-style:normal;color:rgba(25,25,23,.58)}}
.loc{{font-size:22px;letter-spacing:.06em;display:flex;align-items:center;gap:16px}}
.loc i{{width:11px;height:11px;border-radius:50%;background:#4fa83d}}
.body{{flex:1;min-height:0;display:flex;gap:40px;margin-top:6px}}
.text{{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end}}
.box{{flex:1;min-height:0;display:flex;align-items:flex-end;overflow:hidden;padding-bottom:18px}}
.word{{font-weight:400;font-size:190px;letter-spacing:-.06em;line-height:.96;text-wrap:balance;margin-left:-.03em}}
.word span{{display:block;color:rgba(25,25,23,.58)}}
hr{{border:0;border-top:1px solid rgba(25,25,23,.3)}}
.mono{{margin-top:24px;font-family:'JetBrains Mono',monospace;font-size:30px;line-height:1.25;color:#2b3bd1;white-space:nowrap}}
.mono [lang=ml]{{font-size:34px}}
.mono u{{display:inline-block;width:15px;height:30px;background:#1f35e0;margin-left:8px;vertical-align:-5px;text-decoration:none}}
.desc{{margin-top:12px;font-size:30px;line-height:1.2;letter-spacing:-.01em;min-height:36px;text-wrap:balance}}
.rule2{{margin-top:22px}}
.foot{{padding-top:20px;font-size:24px}}
.foot em{{font-style:normal;color:rgba(25,25,23,.58)}}
.foot [lang=ml]{{font-size:26px}}
.v{{flex:none;position:relative}}
.fan{{width:440px;display:flex;align-items:center;justify-content:center;padding-bottom:10px}}
.fan img{{width:178px;height:252px;object-fit:cover;box-shadow:0 0 0 5px #efeee9,0 14px 30px rgba(25,25,23,.2);margin-left:-44px;transform:translateY(var(--y)) rotate(var(--r))}}
.fan img:first-child{{margin-left:0}}
.portrait{{width:340px;display:flex;align-items:center;justify-content:center}}
.portrait img{{width:300px;height:360px;object-fit:cover;box-shadow:0 0 0 6px #efeee9,0 16px 34px rgba(25,25,23,.22);transform:rotate(2.5deg)}}
.mascot{{width:380px;display:flex;align-items:center;justify-content:center}}
.mascot img{{width:380px;height:380px;mix-blend-mode:multiply}}
.frames{{width:470px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;align-content:center}}
.frames img{{width:100%;height:150px;object-fit:cover;display:block}}
</style></head><body><div class="card">
<div class="top"><span><b>dhruv/</b><em>{path}</em></span><span class="loc"><i></i>BENGALURU, IN</span></div>
<div class="body">
  <div class="text">
    <div class="box"><h1 class="word">{word}{dim}</h1></div>
    <hr>
    <p class="mono">{mono}<u></u></p>
    {desc}
  </div>
  {visual}
</div>
<hr class="rule2">
<div class="foot"><span>dhruvpradeep.in</span><em>{tag}</em></div>
</div>
<script>
document.fonts.ready.then(function(){{
  var w=document.querySelector('.word'),b=document.querySelector('.box'),m=document.querySelector('.mono'),t=document.querySelector('.text');
  var size=190;
  function over(){{return w.scrollWidth>b.clientWidth+2||w.offsetHeight>b.clientHeight-18||m.scrollWidth>t.clientWidth}}
  while(over()&&size>40){{size-=2;w.style.fontSize=size+'px'}}
  while(m.scrollWidth>t.clientWidth){{m.style.fontSize=(parseFloat(getComputedStyle(m).fontSize)-1)+'px'}}
  document.title='fit:'+size;
}});
</script></body></html>"""


def render(page, tmp):
    dim = f"<span>{page['dim']}</span>" if page.get("dim") else ""
    desc = f'<p class="desc">{page["desc"]}</p>' if page.get("desc") else ""
    doc = TEMPLATE.format(path=page["path"], word=page["word"], dim=dim, mono=page["mono"], desc=desc,
                          visual=visual_html(page.get("visual"), tmp), tag=page.get("tag", "// still shipping."))
    src = os.path.join(tmp, page["slug"] + ".html")
    png = os.path.join(tmp, page["slug"] + ".png")
    open(src, "w", encoding="utf8").write(doc)
    subprocess.run([CHROME, "--headless=new", f"--user-data-dir={os.path.join(tmp, 'profile')}", "--no-first-run",
                    "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630",
                    "--allow-file-access-from-files", "--virtual-time-budget=6000", f"--screenshot={png}", "file://" + src],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    im = Image.open(png).convert("RGB").crop((0, 0, 1200, 630))
    # JPEG keeps these small: WhatsApp and others drop preview images that are too heavy
    buf = BytesIO()
    im.save(buf, "JPEG", quality=88, optimize=True, progressive=True)
    open(os.path.join(OUT, page["slug"] + ".jpg"), "wb").write(buf.getvalue())
    return len(buf.getvalue()) // 1024


def alt_text(page):
    words = html.unescape(re.sub(r"<[^>]+>", " ", page["word"] + " " + page.get("dim", "")))
    return html.escape(re.sub(r"\s+", " ", words).strip() + " — Dhruv Pradeep", quote=True)


def retag(page):
    """Point one page's preview tags at its image, adding whichever tags are missing."""
    path = os.path.join(ROOT, page["file"])
    s = open(path, encoding="utf8").read()
    url = f"{SITE}/og/{page['slug']}.jpg"
    # the JSON-LD image on posts used the old dynamic image too
    s = re.sub(r"https://dhruvpradeep\.in/api/og\?[^\"'<\s]*", url, s)
    block = [
        f'<meta property="og:image" content="{url}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{alt_text(page)}">',
        f'<meta name="twitter:image" content="{url}">',
    ]
    s = re.sub(r'[ \t]*<meta (?:property="og:image(?::[a-z]+)?"|name="twitter:image") content="[^"]*">\n?', "", s)
    if 'name="twitter:card"' not in s:
        block.append('<meta name="twitter:card" content="summary_large_image">')
    tags = "".join("    " + t + "\n" for t in block)
    anchor = re.search(r'[ \t]*<meta property="og:title"[^>]*>\n', s) or re.search(r"[ \t]*<title>.*?</title>\n", s)
    s = s[: anchor.end()] + tags + s[anchor.end():]
    open(path, "w", encoding="utf8").write(s)


def main():
    os.makedirs(OUT, exist_ok=True)
    pages = PAGES + blog_pages()
    only = set(sys.argv[1:])
    if only:
        pages = [p for p in pages if p["slug"] in only]
    with tempfile.TemporaryDirectory() as tmp:
        for page in pages:
            kb = render(page, tmp)
            retag(page)
            print(f"{page['slug']:<34}{kb:>5} KB")
    print(len(pages), "images")


main()
