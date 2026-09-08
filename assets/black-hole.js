/* Black Hole — self-contained WebGL1 background.
   Original shader (no external deps / no build step). Gravitationally-lensed
   procedural starfield + stylized accretion disk + photon ring, kept dim so
   page text stays readable. Exposes window.BlackHole.init(host, opts).
   Falls back silently to the host's plain background if WebGL is unavailable. */
(function () {
  var MAX_DPR = 1.5;

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uPtr;',
    'uniform vec2 uCenter;',
    'uniform float uInten;',
    'float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}',
    'float starLayer(vec2 uv,float scale,float thresh,float t){',
    '  vec2 p=uv*scale; vec2 ip=floor(p); vec2 fp=fract(p)-0.5;',
    '  float h=hash21(ip);',
    '  float on=step(thresh,h);',
    '  float tw=0.55+0.45*sin(t*1.5+h*42.0);',
    '  float d=length(fp);',
    '  return on*tw*smoothstep(0.5,0.0,d)*smoothstep(thresh,1.0,h);',
    '}',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;',
    '  vec2 c=uv-uCenter-uPtr*0.025;',
    '  float r=length(c);',
    '  vec2 dir=c/max(r,1e-4);',
    '  float rs=0.16;',
    '  float bend=(rs*rs)/max(r,0.02);',       // lensing pull ~ 1/r
    '  vec2 luv=c-dir*bend;',
    '  vec2 base=luv+vec2(uTime*0.005,uTime*0.0025);',
    '  float st=0.0;',
    '  st+=starLayer(base,9.0,0.86,uTime)*0.9;',
    '  st+=starLayer(base*1.7+11.0,15.0,0.90,uTime)*0.7;',
    '  st+=starLayer(base*2.9+27.0,26.0,0.93,uTime)*0.5;',
    '  vec3 col=vec3(st)*vec3(0.78,0.84,1.0);',
    '  float ang=atan(c.y,c.x);',
    '  float swirl=ang*2.0+uTime*0.55+2.1/max(r,rs);',
    '  float ns=(0.5+0.5*sin(swirl))*(0.6+0.4*sin(swirl*2.0-uTime*0.4));',
    '  float band=smoothstep(rs*0.98,rs*1.4,r)*smoothstep(rs*3.4,rs*1.55,r);',
    '  float disk=band*ns;',
    '  vec3 hot=mix(vec3(1.0,0.55,0.16),vec3(1.0,0.9,0.72),smoothstep(rs*1.6,rs*1.05,r));',
    '  hot=mix(hot,vec3(0.32,0.48,1.0),smoothstep(rs*2.3,rs*3.4,r));',
    '  col+=hot*disk*0.55;',                    // disk kept dim for legibility
    '  float ring=smoothstep(0.02,0.0,abs(r-rs*1.06)-0.003);',
    '  col+=vec3(1.0,0.82,0.58)*ring*0.9;',
    '  float core=smoothstep(rs*1.02,rs*0.98,r);',
    '  col*=(1.0-core);',
    '  float vig=smoothstep(1.3,0.15,length(uv));',
    '  col*=vig*uInten;',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error('BlackHole shader:', gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }

  function init(host, opts) {
    opts = opts || {};
    var inten = opts.intensity != null ? opts.intensity : 0.62;
    var cx = opts.offsetX != null ? opts.offsetX : 0.14;
    var cy = opts.offsetY != null ? opts.offsetY : 0.04;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    host.appendChild(canvas);

    var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) { return; } // graceful: host keeps its own (black) background

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('BlackHole link:', gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var pl = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uPtr = gl.getUniformLocation(prog, 'uPtr');
    var uInten = gl.getUniformLocation(prog, 'uInten');
    var uCenter = gl.getUniformLocation(prog, 'uCenter');
    gl.uniform2f(uCenter, cx, cy);
    gl.uniform1f(uInten, inten);

    var ptx = 0, pty = 0, tpx = 0, tpy = 0;
    window.addEventListener('pointermove', function (e) {
      tpx = (e.clientX / window.innerWidth) * 2 - 1;
      tpy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      var w = Math.max(1, Math.round(window.innerWidth * dpr));
      var h = Math.max(1, Math.round(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }

    var raf = 0, alive = true, t0 = performance.now();
    var reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame(now) {
      if (!alive) return;
      size();
      ptx += (tpx - ptx) * 0.04; pty += (tpy - pty) * 0.04;
      gl.uniform2f(uPtr, ptx, pty);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    if (reduce) { size(); gl.uniform2f(uPtr, 0, 0); gl.uniform1f(uTime, 12.0); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    else { raf = requestAnimationFrame(frame); }

    window.addEventListener('resize', function () { if (reduce) { size(); gl.drawArrays(gl.TRIANGLES, 0, 3); } });
    document.addEventListener('visibilitychange', function () {
      if (reduce) return;
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      else if (!raf) { t0 = performance.now() - 12000; raf = requestAnimationFrame(frame); }
    });
  }

  window.BlackHole = { init: init };
})();
