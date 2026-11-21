"""Builds a stylised Bangalore map SVG for the About page.
Rough real coordinates (lat, lon) projected onto a 640x640 box; shapes are simplified, not survey-accurate."""
import math, random

N, W, K = 13.15, 77.44, 1800
COS = math.cos(math.radians(13))

def P(lat, lon):
    return ((lon - W) * K * COS, (N - lat) * K)

def f(v): return f"{v:.1f}".rstrip('0').rstrip('.')

def smooth(pts, closed=False, t=0.5):
    """Catmull-Rom through points -> cubic bezier path."""
    n = len(pts)
    if n < 2: return ''
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed or i > 0 else pts[0]
        p1 = pts[i]; p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else p2
        c1 = (p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3)
        d += f"C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}"
    return d + ('Z' if closed else '')

def blob(lat, lon, rx, ry, rot=0, seed=1, k=9, wob=.22):
    random.seed(seed)
    cx, cy = P(lat, lon); a0 = math.radians(rot); pts = []
    for i in range(k):
        a = i / k * 2 * math.pi; r = 1 + random.uniform(-wob, wob)
        x, y = math.cos(a) * rx * r, math.sin(a) * ry * r
        pts.append((cx + x * math.cos(a0) - y * math.sin(a0), cy + x * math.sin(a0) + y * math.cos(a0)))
    return smooth(pts, True)

def line(coords): return smooth([P(*c) for c in coords])

out = []
A = out.append

# the city: roughly the BBMP limits
city = [(13.135,77.585),(13.115,77.64),(13.08,77.69),(13.04,77.73),(13.0,77.785),(12.955,77.775),(12.9,77.735),
        (12.84,77.7),(12.815,77.655),(12.83,77.6),(12.855,77.535),(12.895,77.48),(12.95,77.455),(13.0,77.465),
        (13.05,77.485),(13.095,77.525),(13.125,77.55)]
A(f'<path class="city" d="{smooth([P(*c) for c in city], True)}"/>')

# parks
A(f'<path class="park" d="{blob(12.9755,77.5945,22,15,-30,4,8,.15)}"/>')
A(f'<path class="park" d="{blob(12.9505,77.5850,13,11,10,7,7,.15)}"/>')

# lakes
lakes = [(13.0455,77.5935,9,6,20,2),(12.9830,77.6210,8,6,0,3),(12.9370,77.6650,24,9,-20,5),(12.9450,77.7330,14,7,10,6),
         (13.0090,77.5740,6,4,0,8),(12.9090,77.6150,8,6,0,9),(12.9230,77.6450,7,5,0,10),(13.0300,77.6720,8,5,30,11),
         (12.9000,77.5500,6,4,0,12),(13.0820,77.6000,7,5,0,13)]
for la, lo, rx, ry, rot, s in lakes:
    A(f'<path class="lake" d="{blob(la,lo,rx,ry,rot,s)}"/>')

# outer ring road
orr = [(13.036,77.597),(13.043,77.62),(13.03,77.66),(13.005,77.69),(12.975,77.70),(12.956,77.70),(12.93,77.68),
       (12.925,77.665),(12.92,77.64),(12.917,77.623),(12.914,77.60),(12.92,77.57),(12.928,77.545),(12.945,77.52),
       (12.97,77.51),(12.99,77.515),(13.02,77.528),(13.04,77.555),(13.036,77.597)]
A(f'<path class="road" d="{line(orr)}"/>')

# metro
purple = [(12.897,77.461),(12.908,77.483),(12.947,77.530),(12.970,77.537),(12.976,77.572),(12.981,77.597),(12.975,77.607),
          (12.973,77.617),(12.976,77.626),(12.978,77.638),(12.991,77.652),(13.000,77.676),(12.988,77.711),(12.995,77.735),(12.997,77.761)]
green = [(13.057,77.473),(13.048,77.500),(13.033,77.533),(13.023,77.550),(12.990,77.570),(12.976,77.572),(12.961,77.575),
         (12.947,77.580),(12.930,77.580),(12.915,77.573),(12.890,77.555),(12.862,77.530)]
yellow = [(12.921,77.580),(12.917,77.600),(12.917,77.623),(12.900,77.632),(12.875,77.645),(12.848,77.660),(12.815,77.695)]
for cls, pts in (('m-purple', purple), ('m-green', green), ('m-yellow', yellow)):
    A(f'<path class="metro {cls}" pathLength="1" d="{line(pts)}"/>')

# labels: (text, lat, lon, anchor, class)
labels = [("Yelahanka",13.100,77.596,'middle',''),("Hebbal",13.058,77.592,'middle',''),("Malleshwaram",13.003,77.560,'end',''),
          ("Majestic",12.976,77.566,'end',''),("Indiranagar",12.966,77.650,'start',''),("Koramangala",12.937,77.616,"end",""),
          ("HSR",12.905,77.645,'start',''),("Jayanagar",12.928,77.574,'end',''),("Whitefield",12.982,77.752,'middle',''),
          ("Electronic City",12.835,77.665,'start',''),("Kalyan Nagar",13.025,77.652,'start',''),("Kothanur",13.066,77.660,'start',''),
          ("Bellandur",12.928,77.672,'middle','lk'),("Cubbon Park",12.964,77.590,"end","pk"),("Lalbagh",12.948,77.597,'start','pk'),
          ("Ulsoor",12.993,77.622,'start','lk')]
for t, la, lo, an, c in labels:
    x, y = P(la, lo)
    minor = {"Yelahanka","Malleshwaram","Jayanagar","HSR","Ulsoor","Lalbagh","Majestic"}
    c = (c + ' minor').strip() if t in minor else c
    A(f'<text class="lb {c}" x="{f(x)}" y="{f(y)}" text-anchor="{an}">{t}</text>')

# chaya glasses where my cafes are (count from /cafes)
cafes = [(12.978,77.640,6),(13.025,77.640,3),(13.015,77.630,1),(12.935,77.624,1),(13.062,77.648,4)]
glass = 'M-4.5,-5 L4.5,-5 L3.4,5 L-3.4,5 Z'
A('<a href="/cafes" class="chai" aria-label="Cafes I&#8217;d send you to">')
for la, lo, n in cafes:
    x, y = P(la, lo)
    A(f'<g transform="translate({f(x)},{f(y)})"><path class="glass" d="{glass}"/><path class="tea" d="M-3.9,-1.2 L3.9,-1.2 L3.4,5 L-3.4,5 Z"/><title>{n} cafe{"s" if n>1 else ""} on /cafes</title></g>')
A('</a>')

# me, pinned at the middle of the city
x, y = P(12.979, 77.591)
A(f'<g class="pin" transform="translate({f(x)},{f(y)})">'
  f'<circle class="pin-pulse" r="7"/><circle class="pin-spot" r="3.2"/>'
  f'<g class="pin-me"><path class="pin-tail" d="M-9,-38 L0,-5 L9,-38 Z"/><circle class="pin-ring" cy="-60" r="30"/>'
  f'<clipPath id="meclip"><circle cy="-60" r="26.5"/></clipPath>'
  f'<image href="/assets/avatar-face.webp" x="-27" y="-87" width="54" height="54" clip-path="url(#meclip)"/></g></g>')

# the name of the city, in its own script, faint behind everything else
A('<text class="kn" x="320" y="600" text-anchor="middle" lang="kn">\u0cac\u0cc6\u0c82\u0c97\u0cb3\u0cc2\u0cb0\u0cc1</text>')
x, y = P(13.13, 77.66)
A(f'<text class="lb air" x="{f(x)}" y="{f(y)}">&#8593; Airport &#183; 35 km</text>')
# compass + coordinates
A('<g class="nrth" transform="translate(600,40)"><path d="M0,-14 L6,6 L0,2 L-6,6 Z"/><text y="22" text-anchor="middle">N</text></g>')
A('<text class="coord" x="12" y="628">12.97&#176; N &#183; 77.59&#176; E</text>')

svg = '\n'.join(out)
open(__file__.replace('blr_map.py', 'blr_map.svg.txt'), 'w').write(svg)
print(len(svg))
