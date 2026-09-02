/* Recursive Erosion — ported from an Originkit React/WebGL component to
   vanilla JS+WebGL1 since this site has no build step / React runtime.
   Shader source is unchanged from the original; only the outer plumbing
   (useRef/useEffect -> plain closures) was rewritten. */
(function () {
  var MAX_DPR = 2;
  var VIGNETTE = 0.24;
  var DUR = 3.99;
  var WORMS = 7;
  var TAIL = 14;
  var WN = WORMS * TAIL;
  var PEARL = 34;
  var TN = WORMS * PEARL;
  var TSTRIDE = 5;
  var GRAIN_TILE = 170;
  var CHROMA = 1.0;
  var PERSP = 0.14;
  var SPHERE_FIT = 0.672;

  var VERT_SRC = [
    'precision highp float;',
    'attribute vec3 a_dir;',
    'attribute vec2 a_rand;',
    'uniform mat3  uRot;',
    'uniform float uTh, uPx, uPass, uThr, uTrail;',
    'uniform vec2  uOff, uScale;',
    'uniform vec3  uDim, uMid, uHot;',
    'uniform float uMorph, uGlow, uChroma;',
    'uniform vec4  uWorm[' + WN + '];',
    'varying vec3  v_col;',
    'varying float v_a, v_ca, v_k;',
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    '  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    '  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.0*floor(p*ns.z*ns.z);',
    '  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
    '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;',
    '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}',
    'void main(){',
    '  vec3 dir=a_dir;',
    '  vec2 c=vec2(cos(uTh),sin(uTh));',
    '  float n1=snoise(dir*1.30+vec3(c*0.95,0.0));',
    '  float n2=snoise(dir*2.70+vec3(0.0,c*0.80));',
    '  float n3=snoise(dir*5.60+vec3(c.y*0.62,0.0,c.x*0.62));',
    '  float ridge=1.0-abs(n2);',
    '  float disp=0.54*n1+0.44*(ridge-0.5)+0.20*n3;',
    '  float R=1.0+0.305*uMorph*disp;',
    '  float e=0.66*snoise(dir*1.45+vec3(c*1.30,0.4))+0.34*snoise(dir*3.10+vec3(0.3,c*1.05));',
    '  float alive=smoothstep(uThr-0.05,uThr+0.06,e+0.5);',
    '  vec3 n=uRot*dir;',
    '  vec3 p=uRot*(dir*R);',
    '  float persp=1.0/(1.0-' + PERSP.toFixed(2) + '*p.z);',
    '  float face=smoothstep(-0.10,0.06,n.z);',
    '  float boost=0.0;',
    '  if(uTrail>0.5){',
    '    boost=a_rand.x*1.5;',
    '  }else{',
    '    for(int i=0;i<' + WN + ';i++){',
    '      vec3 d=dir-uWorm[i].xyz;',
    '      boost+=uWorm[i].w*exp(-dot(d,d)*260.0);',
    '    }',
    '    boost=min(boost,1.5);',
    '  }',
    '  float live=(uTrail>0.5?1.0:max(alive,min(1.0,boost*0.9)))*face;',
    '  float sz=uPx*persp*(uTrail>0.5',
    '    ?(0.72+0.55*a_rand.y)*(1.0+boost*1.50)',
    '    :(0.78+0.50*a_rand.y)*(1.0+boost*1.2));',
    '  vec3 col=mix(uDim,uMid,a_rand.x*a_rand.x);',
    '  if(uTrail>0.5) col=mix(uMid,uHot,clamp(boost,0.0,1.0));',
    '  else col=mix(col,uHot,clamp(boost*1.1,0.0,1.0));',
    '  float rim=1.0+0.12*pow(1.0-abs(n.z),4.0);',
    '  float a=(uTrail>0.5',
    '    ?(0.52+0.20*a_rand.y)*clamp(boost,0.0,1.22)',
    '    :(0.92+0.28*a_rand.y)*(0.85+0.60*min(boost,1.2)))*rim*live;',
    '  if(uPass>0.5){',
    '    sz*=4.6; a*=0.115*uGlow*smoothstep(0.15,0.70,boost);',
    '  }',
    '  v_col=col; v_a=a;',
    '  v_k=(uPass>0.5)?3.0:(uTrail>0.5?0.0:2.1);',
    '  v_ca=((uPass>0.5)?0.0:(uTrail>0.5?0.02:clamp(2.0/max(sz,3.0),0.015,0.055)))*uChroma;',
    '  gl_PointSize=(a<0.004)?0.0:clamp(sz,0.0,140.0);',
    '  gl_Position=vec4(p.xy*persp*uScale+uOff,0.0,1.0);',
    '}'
  ].join('\n');

  var FRAG_SRC = [
    'precision mediump float;',
    'varying vec3 v_col;',
    'varying float v_a, v_ca, v_k;',
    'float sp(vec2 c,float k){',
    '  float d=length(c)*2.0;',
    '  if(k<0.5) return 1.0-smoothstep(0.42,1.0,d);',
    '  return pow(max(0.0,1.0-d),k);',
    '}',
    'void main(){',
    '  vec2 q=gl_PointCoord-0.5;',
    '  vec2 o=vec2(v_ca,v_ca*0.35);',
    '  float aR=sp(q+o,v_k), aG=sp(q,v_k), aB=sp(q-o,v_k);',
    '  vec3 c=vec3(v_col.r*aR,v_col.g*aG,v_col.b*aB)*v_a;',
    '  float cov=clamp(max(max(aR,aG),aB)*v_a,0.0,1.0);',
    '  gl_FragColor=vec4(min(c,vec3(1.0)),cov);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('RecursiveErosion shader:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function parseColor(input, fb) {
    if (!input) return fb;
    var str = String(input).trim();
    if (str.charAt(0) === '#') {
      var hex = str.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length >= 6) {
        var r = parseInt(hex.slice(0, 2), 16);
        var g = parseInt(hex.slice(2, 4), 16);
        var b = parseInt(hex.slice(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255];
      }
      return fb;
    }
    var m = str.match(/[\d.]+/g);
    if (m && m.length >= 3) {
      return [Math.min(255, parseFloat(m[0])) / 255, Math.min(255, parseFloat(m[1])) / 255, Math.min(255, parseFloat(m[2])) / 255];
    }
    return fb;
  }

  function clampN(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6d2b79f5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function lattice(n) {
    var R0 = rng(20260812);
    var dirs = new Float32Array(n * 3);
    var rnds = new Float32Array(n * 2);
    var GA = Math.PI * (3 - Math.sqrt(5));
    var SP = Math.sqrt((4 * Math.PI) / n);
    for (var i = 0; i < n; i++) {
      var y = 1 - ((i + 0.5) / n) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = GA * i;
      var jx = (R0() * 2 - 1) * SP * 0.08;
      var jy = (R0() * 2 - 1) * SP * 0.08;
      var jz = (R0() * 2 - 1) * SP * 0.08;
      var vx = Math.cos(th) * r + jx;
      var vy = y + jy;
      var vz = Math.sin(th) * r + jz;
      var il = 1 / Math.hypot(vx, vy, vz);
      dirs[i * 3] = vx * il; dirs[i * 3 + 1] = vy * il; dirs[i * 3 + 2] = vz * il;
      rnds[i * 2] = R0(); rnds[i * 2 + 1] = R0();
    }
    return { dirs: dirs, rnds: rnds };
  }

  function buildPaths() {
    var R0 = rng(77123);
    var out = [];
    for (var i = 0; i < WORMS; i++) {
      var cz = 0.06 + R0() * 0.86;
      var ca0 = R0() * 6.283;
      var crr = Math.sqrt(Math.max(0, 1 - cz * cz));
      var c = [Math.cos(ca0) * crr, Math.sin(ca0) * crr, cz];
      var t0 = Math.abs(c[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
      var d = t0[0] * c[0] + t0[1] * c[1] + t0[2] * c[2];
      var u = [t0[0] - c[0] * d, t0[1] - c[1] * d, t0[2] - c[2] * d];
      var lu = Math.hypot(u[0], u[1], u[2]);
      u = [u[0] / lu, u[1] / lu, u[2] / lu];
      var v = [c[1] * u[2] - c[2] * u[1], c[2] * u[0] - c[0] * u[2], c[0] * u[1] - c[1] * u[0]];
      var rho = 0.46 + R0() * 0.42;
      var sr = Math.sin(rho);
      out.push({
        c: c, u: u, v: v, sr: sr, cr: Math.cos(rho),
        m: 1 + Math.floor(R0() * 2), ph: R0() * 6.283, str: 0.9 + R0() * 0.28,
        arc: (0.78 + R0() * 0.34) / sr, fl: R0() * 6.283
      });
    }
    return out;
  }

  function init(host, opts) {
    opts = opts || {};
    var background = opts.background || 'transparent';
    var baseColor = opts.baseColor || '#FFFFFF';
    var accentColor = opts.accentColor || '#9A00FF';
    var highlight = opts.highlight || '#0028FF';
    var size = opts.size != null ? opts.size : 36;
    var density = opts.density != null ? opts.density : 2867;
    var dotSize = opts.dotSize != null ? opts.dotSize : 66;
    var speed = opts.speed != null ? opts.speed : 71;
    var hover = opts.hover != null ? opts.hover : 119;
    var shell = opts.shell || {};
    var trails = opts.trails || {};
    var reduceMotionOverride = !!opts.reduceMotion;

    var morph = (shell.morph != null ? shell.morph : 250) / 100;
    var erosion = (shell.erosion != null ? shell.erosion : 0) / 100;
    var tumble = (shell.tumble != null ? shell.tumble : 180) / 100;
    var trailCount = Math.round(trails.count != null ? trails.count : 4);
    var trailLength = (trails.length != null ? trails.length : 200) / 100;
    var trailGlow = (trails.glow != null ? trails.glow : 300) / 100;
    var fit = clampN(size, 20, 200) / 100;
    var dotSizeK = clampN(dotSize, 20, 300) / 100;
    var speedK = clampN(speed, 0, 100) / 50;
    var hoverK = clampN(hover, 0, 200) / 100;

    host.style.position = host.style.position || 'relative';
    host.style.overflow = 'hidden';
    host.style.background = 'transparent';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    host.appendChild(canvas);

    if (VIGNETTE > 0) {
      var vigEl = document.createElement('div');
      vigEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:' + VIGNETTE + ';background:radial-gradient(118% 90% at 50% 50%, rgba(0,0,0,0) 36%, ' + background + ' 100%)';
      host.appendChild(vigEl);
    }

    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true });
    if (!gl) { console.error('RecursiveErosion: WebGL unavailable'); return; }

    var vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('RecursiveErosion link:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    var aDir = gl.getAttribLocation(prog, 'a_dir');
    var aRand = gl.getAttribLocation(prog, 'a_rand');
    gl.enableVertexAttribArray(aDir);
    gl.enableVertexAttribArray(aRand);

    var locs = {};
    function u(name) { if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name); return locs[name]; }

    var bDir = gl.createBuffer();
    var bRand = gl.createBuffer();
    var latticeN = 0;
    function buildLattice(n) {
      var L = lattice(n);
      gl.bindBuffer(gl.ARRAY_BUFFER, bDir); gl.bufferData(gl.ARRAY_BUFFER, L.dirs, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bRand); gl.bufferData(gl.ARRAY_BUFFER, L.rnds, gl.STATIC_DRAW);
      latticeN = n;
    }

    var paths = buildPaths();
    var pearls = new Float32Array(TN * TSTRIDE);
    var pearlSeed = new Float32Array(TN);
    var seedR = rng(4242);
    for (var i = 0; i < TN; i++) pearlSeed[i] = seedR();
    var bTrail = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bTrail);
    gl.bufferData(gl.ARRAY_BUFFER, pearls.byteLength, gl.DYNAMIC_DRAW);

    var wormPos = new Float32Array(WN * 4);
    var tmp = [0, 0, 0];

    function onPath(w, ang, out) {
      var ca = Math.cos(ang), sa = Math.sin(ang);
      out[0] = w.c[0] * w.cr + (w.u[0] * ca + w.v[0] * sa) * w.sr;
      out[1] = w.c[1] * w.cr + (w.u[1] * ca + w.v[1] * sa) * w.sr;
      out[2] = w.c[2] * w.cr + (w.u[2] * ca + w.v[2] * sa) * w.sr;
    }
    function bindShell() {
      gl.bindBuffer(gl.ARRAY_BUFFER, bDir); gl.vertexAttribPointer(aDir, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bRand); gl.vertexAttribPointer(aRand, 2, gl.FLOAT, false, 0, 0);
    }
    function bindTrail() {
      gl.bindBuffer(gl.ARRAY_BUFFER, bTrail);
      gl.vertexAttribPointer(aDir, 3, gl.FLOAT, false, TSTRIDE * 4, 0);
      gl.vertexAttribPointer(aRand, 2, gl.FLOAT, false, TSTRIDE * 4, 12);
    }

    var ptr = { tx: 0, ty: 0, x: 0, y: 0, down: false, lx: 0, ly: 0 };
    var raf = 0, last = performance.now(), clock = 0, alive = true;

    var reduce = reduceMotionOverride || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function draw() {
      var th = 2 * Math.PI * (clock / DUR);
      var nActive = trailCount, lenK = trailLength;

      for (var k = 0; k < WORMS; k++) {
        var w = paths[k];
        var on = k < nActive ? 1 : 0;
        var head = th * w.m + w.ph;
        var flick = 0.76 + 0.24 * Math.sin(th * 2.0 + w.fl);
        var arc = w.arc * lenK;
        for (var j = 0; j < TAIL; j++) {
          var o = k * TAIL + j;
          onPath(w, head - j * (arc / TAIL), tmp);
          wormPos[o * 4] = tmp[0]; wormPos[o * 4 + 1] = tmp[1]; wormPos[o * 4 + 2] = tmp[2];
          wormPos[o * 4 + 3] = on * w.str * flick * (0.42 + 0.58 * Math.pow(1 - j / TAIL, 0.7)) * (0.8 + 0.2 * Math.sin(j * 1.7 + head * 2.0));
        }
      }
      for (k = 0; k < WORMS; k++) {
        w = paths[k]; on = k < nActive ? 1 : 0;
        head = th * w.m + w.ph;
        flick = 0.86 + 0.14 * Math.sin(th * 2.0 + w.fl);
        arc = w.arc * lenK;
        var pstep = arc / PEARL;
        for (j = 0; j < PEARL; j++) {
          o = k * PEARL + j;
          var b = o * TSTRIDE;
          var uu = j / PEARL;
          var wob = 0.055 * Math.sin(j * 0.42 + head * 2.0 + w.fl) + 0.03 * Math.sin(j * 0.17 - head);
          onPath(w, head - j * pstep + wob, tmp);
          pearls[b] = tmp[0]; pearls[b + 1] = tmp[1]; pearls[b + 2] = tmp[2];
          pearls[b + 3] = on * w.str * flick * (0.34 + 0.66 * Math.pow(1 - uu, 0.55)) * (0.74 + 0.26 * Math.sin(j * 1.15 + head * 2.0 + w.fl));
          pearls[b + 4] = pearlSeed[o];
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, bTrail);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pearls);

      var tk = tumble;
      var ax = (0.22 * Math.sin(th) + 0.06 * Math.sin(th * 2 + 1.1)) * tk;
      var ay = (0.3 * Math.sin(th + 2.2) + 0.08 * Math.cos(th * 2)) * tk;
      var az = 0.1 * Math.cos(th + 0.6) * tk;
      var axd = ax - ptr.y * 1.1 * hoverK;
      var ayd = ay + ptr.x * 2.0 * hoverK;

      var cx = Math.cos(axd), sx = Math.sin(axd);
      var cy = Math.cos(ayd), sy = Math.sin(ayd);
      var cz = Math.cos(az), sz = Math.sin(az);
      var rotM = new Float32Array([
        cz * cy, sz * cy, -sy,
        cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx,
        cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx
      ]);

      var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      var cw = canvas.clientWidth || 200, ch = canvas.clientHeight || 200;
      var bw = Math.max(1, Math.round(cw * dpr)), bh = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      gl.viewport(0, 0, bw, bh);

      var shortEdge = Math.min(bw, bh);
      var aspX = bw > bh ? bh / bw : 1;
      var aspY = bh > bw ? bw / bh : 1;

      if (density !== latticeN) buildLattice(density);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.uniformMatrix3fv(u('uRot'), false, rotM);
      gl.uniform1f(u('uTh'), th);
      var sfit = SPHERE_FIT * fit;
      gl.uniform2f(u('uScale'), sfit * aspX, sfit * aspY);
      gl.uniform1f(u('uPx'), Math.max(1.0, (shortEdge / 1080) * 8.0 * dotSizeK));
      gl.uniform1f(u('uThr'), erosion + 0.04 * Math.sin(th * 2 + 0.8));
      gl.uniform2f(u('uOff'), 0.006 * Math.sin(th + 1.0), -0.012 * Math.cos(th));
      gl.uniform1f(u('uMorph'), morph);
      gl.uniform1f(u('uGlow'), trailGlow);
      gl.uniform1f(u('uChroma'), CHROMA);
      gl.uniform4fv(u('uWorm'), wormPos);
      var cd = parseColor(baseColor, [0.94, 0.33, 0.05]);
      var cm = parseColor(accentColor, [1.0, 0.56, 0.16]);
      var chh = parseColor(highlight, [1.0, 0.71, 0.31]);
      gl.uniform3f(u('uDim'), cd[0], cd[1], cd[2]);
      gl.uniform3f(u('uMid'), cm[0], cm[1], cm[2]);
      gl.uniform3f(u('uHot'), chh[0], chh[1], chh[2]);

      bindShell();
      gl.uniform1f(u('uTrail'), 0);
      gl.uniform1f(u('uPass'), 0);
      gl.drawArrays(gl.POINTS, 0, latticeN);

      bindTrail();
      gl.uniform1f(u('uTrail'), 1);
      gl.uniform1f(u('uPass'), 1);
      gl.drawArrays(gl.POINTS, 0, TN);
      gl.uniform1f(u('uPass'), 0);
      gl.drawArrays(gl.POINTS, 0, TN);
    }

    function render(now) {
      if (!alive) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      var pk = 1 - Math.exp(-dt * 3.2);
      ptr.x += (ptr.tx - ptr.x) * pk;
      ptr.y += (ptr.ty - ptr.y) * pk;
      last = now;
      clock = (clock + dt * speedK) % DUR;
      draw();
      raf = requestAnimationFrame(render);
    }

    buildLattice(density);

    if (reduce) { clock = 1.2; draw(); }
    else { raf = requestAnimationFrame(render); }

    var ro = new ResizeObserver(function () { if (reduce) draw(); });
    ro.observe(host);

    function onVis() {
      if (reduce) return;
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(render); }
    }
    document.addEventListener('visibilitychange', onVis);

    var DRAG_X = 1.5, DRAG_Y = 1.0;
    function snap() { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    function onDown(e) {
      ptr.down = true; ptr.lx = e.clientX; ptr.ly = e.clientY;
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onMove(e) {
      if (!ptr.down) return;
      var r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      ptr.tx = clampN(ptr.tx + (e.clientX - ptr.lx) / r.width, -DRAG_X, DRAG_X);
      ptr.ty = clampN(ptr.ty + (e.clientY - ptr.ly) / r.height, -DRAG_Y, DRAG_Y);
      ptr.lx = e.clientX; ptr.ly = e.clientY;
      if (reduce) { snap(); draw(); }
    }
    function onUp() {
      if (!ptr.down) return;
      ptr.down = false; ptr.tx = 0; ptr.ty = 0;
      canvas.style.cursor = 'grab';
      if (reduce) { snap(); draw(); }
    }
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  window.RecursiveErosion = { init: init };
})();
