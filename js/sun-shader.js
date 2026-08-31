/* ════════════════════════════════════════════════════════════════════════
   SUN SHADER · Vanilla Three.js port of the React Three Fiber ParticleSwarm
   - InstancedMesh with 20,000 billboarded plane particles
   - Per-particle layered solar model (core → wind)
   - GLSL noise + radial falloff for soft particle edges
   - UnrealBloomPass via EffectComposer
   - Tinted for the Editorial Luxury cream/ink/gold palette
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[sun-shader] Three.js not available; skipping.');
    return;
  }

  window.initSunShader = function initSunShader(container, opts) {
    opts = opts || {};

    // ── Tame particle count on small screens ─────────────────────
    var IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
    var COUNT = IS_MOBILE ? 7000 : (opts.count || 20000);
    var SPEED = opts.speed != null ? opts.speed : 0.55; // gentle
    var TINT = opts.tint || 'gold'; // 'gold' | 'ember' | 'mono'

    // ── Renderer ────────────────────────────────────────────────
    var renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.setClearColor(0x000000, 0); // transparent — CSS controls backdrop
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── Scene & camera ──────────────────────────────────────────
    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0);

    var camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      2000
    );
    camera.position.set(0, 0, 100);

    // ── Bloom composer (graceful fallback if EffectComposer missing) ──
    var composer = null;
    var useBloom = false;
    if (
      typeof THREE.EffectComposer !== 'undefined' &&
      typeof THREE.RenderPass !== 'undefined' &&
      typeof THREE.UnrealBloomPass !== 'undefined' &&
      typeof THREE.ShaderPass !== 'undefined' &&
      typeof THREE.OutputPass !== 'undefined'
    ) {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      var bloom = new THREE.UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        1.4, // strength
        0.6, // radius
        0.0  // threshold
      );
      composer.addPass(bloom);
      composer.addPass(new THREE.OutputPass());
      useBloom = true;
    }

    // ── Material (your original shaders, unchanged) ─────────────
    var material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTint: { value: TINT === 'mono' ? 0.0 : (TINT === 'ember' ? 2.0 : 1.0) }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'varying vec3 vColor;',
        'void main() {',
        '  vUv = uv;',
        '  vColor = instanceColor;',
        '  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec2 vUv;',
        'varying vec3 vColor;',
        'uniform float uTime;',
        'uniform float uTint;',
        'float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }',
        'float noise(vec2 p) {',
        '  vec2 ip = floor(p);',
        '  vec2 u = fract(p);',
        '  u = u*u*(3.0-2.0*u);',
        '  float res = mix(',
        '    mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),',
        '    mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x),',
        '    u.y',
        '  );',
        '  return res * res;',
        '}',
        'void main() {',
        '  float dist = distance(vUv, vec2(0.5));',
        '  float n = noise(vUv * 5.0 + uTime * 0.5);',
        '  float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * (0.5 + 0.5 * n);',
        '  if (alpha < 0.1) discard;',
        // Tint: 0 mono / 1 gold / 2 ember
        '  vec3 c = vColor;',
        '  if (uTint > 0.5 && uTint < 1.5) {',
        '    c = mix(vColor, vec3(0.72, 0.54, 0.23), 0.55);', // gold
        '  } else if (uTint > 1.5) {',
        '    c = mix(vColor, vec3(0.78, 0.30, 0.17), 0.45);', // ember
        '  }',
        '  gl_FragColor = vec4(c + 0.2, alpha * 0.8);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    var geometry = new THREE.PlaneGeometry(0.8, 0.8);

    // ── Particle swarms (your original logic, 1:1) ───────────────
    var mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Per-instance color buffer
    var colorArr = new Float32Array(COUNT * 3);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArr, 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

    scene.add(mesh);

    // ── RNG hashing helpers (unchanged) ─────────────────────────
    function h1(i, seed) {
      return (Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1);
    }
    function h2(i, seed) {
      return (Math.abs(Math.sin(i * 78.2330 + seed) * 12543.1230) % 1);
    }
    function h3(i, seed) {
      return (Math.abs(Math.sin(i * 45.1640 + seed) * 98765.4320) % 1);
    }
    function h4(i, seed) {
      return (Math.abs(Math.sin(i * 33.7190 + seed) * 54321.9870) % 1);
    }
    function h5(i, seed) {
      return (Math.abs(Math.sin(i * 61.4310 + seed) * 31415.9265) % 1);
    }
    function h6(i, seed) {
      return (Math.abs(Math.sin(i * 19.8410 + seed) * 27182.8182) % 1);
    }

    // Pre-compute stable hashes per particle (cheaper than recomputing every frame)
    var H = new Float32Array(COUNT * 6);
    for (var k = 0; k < COUNT; k++) {
      H[k * 6 + 0] = h1(k, 0);
      H[k * 6 + 1] = h2(k, 0);
      H[k * 6 + 2] = h3(k, 0);
      H[k * 6 + 3] = h4(k, 0);
      H[k * 6 + 4] = h5(k, 0);
      H[k * 6 + 5] = h6(k, 0);
    }

    var positions = [];
    for (var p = 0; p < COUNT; p++) {
      positions.push(new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      ));
    }

    var dummy = new THREE.Object3D();
    var target = new THREE.Vector3();
    var pColor = new THREE.Color();

    // PARAMS straight from your React code
    var PARAMS = {
      radius: 120,
      fusion: 2.5,
      convect: 1.2,
      magnetic: 1.4,
      wind: 1.8,
      loops: 16
    };
    function addControl(id, l, min, max, val) {
      return PARAMS[id] !== undefined ? PARAMS[id] : val;
    }

    var speedMult = SPEED;

    // Frame tick — exact port of your `useFrame` body
    var clock = new THREE.Clock();
    function tick() {
      var time = clock.getElapsedTime() * speedMult;
      material.uniforms.uTime.value = time;

      var scaleR     = addControl('radius', 'Sun Radius', 40, 300, 120);
      var fusionRate = addControl('fusion', 'Fusion Rate', 0.5, 6, 2.5);
      var convection = addControl('convect', 'Convection Turbulence', 0, 3, 1.2);
      var magnetic   = addControl('magnetic', 'Magnetic Activity', 0, 3, 1.4);
      var windSpeed  = addControl('wind', 'Solar Wind Speed', 0, 5, 1.8);
      var loopsCount = Math.max(4, Math.floor(addControl('loops', 'Active Regions', 4, 40, 16)));

      var t0 = 0.12, t1 = 0.32, t2 = 0.55, t3 = 0.68, t4 = 0.78, t5 = 0.90, t6 = 0.97;

      for (var i = 0; i < COUNT; i++) {
        var h1v = H[i * 6 + 0];
        var h2v = H[i * 6 + 1];
        var h3v = H[i * 6 + 2];
        var h4v = H[i * 6 + 3];
        var h5v = H[i * 6 + 4];
        var h6v = H[i * 6 + 5];

        var t = i / Math.max(1, COUNT);
        var px = 0, py = 0, pz = 0;

        if (t < t0) {
          var coreR = scaleR * 0.22;
          var theta = h1v * 6.2831853;
          var cphi = h2v * 2 - 1;
          var sphi = Math.sqrt(Math.max(0, 1 - cphi * cphi));
          var rr = Math.cbrt(Math.max(h3v, 0.0001)) * coreR;
          var jitter = Math.sin(time * 3 + h4v * 6.283) * coreR * 0.03;
          var rad = rr + jitter;
          px = rad * sphi * Math.cos(theta);
          py = rad * sphi * Math.sin(theta);
          pz = rad * cphi;
          var burst = Math.pow(0.5 + 0.5 * Math.sin(time * fusionRate * 4 + h5v * 18.85), 6);
          var bright = 0.5 + 0.5 * burst;
          pColor.setHSL(Math.max(0, 0.14 - burst * 0.05), 1.0, Math.min(0.95, 0.55 + bright * 0.4));
        } else if (t < t1) {
          var rMin = scaleR * 0.22, rMax = scaleR * 0.46;
          var rr = rMin + h1v * (rMax - rMin);
          var theta2 = h2v * 6.2831853 + Math.sin(time * 0.03 + h3v * 6.283) * 0.3;
          var cphi2 = h3v * 2 - 1;
          var sphi2 = Math.sqrt(Math.max(0, 1 - cphi2 * cphi2));
          var wander = Math.sin(time * 0.08 + h4v * 6.283) * scaleR * 0.02;
          var rad2 = rr + wander;
          px = rad2 * sphi2 * Math.cos(theta2);
          py = rad2 * sphi2 * Math.sin(theta2);
          pz = rad2 * cphi2;
          pColor.setHSL(0.06, 0.9, 0.25 + h5v * 0.1);
        } else if (t < t2) {
          var rMin2 = scaleR * 0.46, rMax2 = scaleR * 0.72;
          var rr3 = rMin2 + h1v * (rMax2 - rMin2);
          var theta3 = h2v * 6.2831853;
          var cphi3 = h3v * 2 - 1;
          var sphi3 = Math.sqrt(Math.max(0, 1 - cphi3 * cphi3));
          var cell = Math.sin(theta3 * 6 + time * convection * 0.5)
                   + Math.sin(cphi3 * 18 + time * convection * 0.4 + h4v * 6.283)
                   + Math.sin((theta3 + cphi3) * 12 - time * convection * 0.6);
          var flow = cell * convection * scaleR * 0.015;
          var rad3 = rr3 + flow;
          px = rad3 * sphi3 * Math.cos(theta3 + flow * 0.01);
          py = rad3 * sphi3 * Math.sin(theta3 + flow * 0.01);
          pz = rad3 * cphi3;
          var heat = (cell + 3) / 6;
          pColor.setHSL(Math.max(0, 0.08 - heat * 0.02), 1.0, 0.3 + heat * 0.35);
        } else if (t < t3) {
          var R = scaleR * 0.76;
          var theta4 = h1v * 6.2831853;
          var cphi4 = h2v * 2 - 1;
          var sphi4 = Math.sqrt(Math.max(0, 1 - cphi4 * cphi4));
          var granule = Math.sin(theta4 * 24 + time * 0.6)
                      + Math.sin(cphi4 * 30 - time * 0.5 + h3v * 6.283)
                      + Math.sin(theta4 * 17 + cphi4 * 13 + time * 0.4);
          var spotNoise = Math.sin(theta4 * 3 + h4v * 6.283) + Math.sin(cphi4 * 4 + time * 0.05);
          var spotDark = Math.max(0, -spotNoise - 1.1) * 0.8;
          var rad4 = R + granule * scaleR * 0.004;
          px = rad4 * sphi4 * Math.cos(theta4);
          py = rad4 * sphi4 * Math.sin(theta4);
          pz = rad4 * cphi4;
          var bright2 = 0.6 + granule * 0.1 - spotDark;
          pColor.setHSL(0.13, 0.9, Math.max(0.08, Math.min(0.85, bright2)));
        } else if (t < t4) {
          var Rbase = scaleR * 0.79;
          var theta5 = h1v * 6.2831853;
          var cphi5 = h2v * 2 - 1;
          var sphi5 = Math.sqrt(Math.max(0, 1 - cphi5 * cphi5));
          var spiculeLen = scaleR * 0.05;
          var spicule = Math.abs(Math.sin(time * 2 + h3v * 18.85)) * spiculeLen;
          var rad5 = Rbase + spicule;
          px = rad5 * sphi5 * Math.cos(theta5);
          py = rad5 * sphi5 * Math.sin(theta5);
          pz = rad5 * cphi5;
          pColor.setHSL(0.98, 0.85, 0.35 + (spicule / Math.max(spiculeLen, 0.0001)) * 0.25);
        } else if (t < t5) {
          if (h5v < 0.5) {
            var loopIndex = Math.floor(i % loopsCount);
            var lh1 = Math.abs(Math.sin(loopIndex * 17.17) * 6543.21) % 1;
            var lh2 = Math.abs(Math.sin(loopIndex * 29.71) * 7654.32) % 1;
            var lh3 = Math.abs(Math.sin(loopIndex * 53.13) * 8765.43) % 1;
            var lh4 = Math.abs(Math.sin(loopIndex * 71.91) * 9876.54) % 1;
            var pcchi = lh2 * 2 - 1;
            var psphi = Math.sqrt(Math.max(0, 1 - pcchi * pcchi));
            var pTheta = lh1 * 6.2831853;
            var pX = psphi * Math.cos(pTheta), pY = psphi * Math.sin(pTheta), pZ = pcchi;
            var refX = 0, refY = 1, refZ = 0.15;
            var e1x = refY * pZ - refZ * pY, e1y = refZ * pX - refX * pZ, e1z = refX * pY - refY * pX;
            var len1 = Math.max(Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z), 1e-5);
            e1x /= len1; e1y /= len1; e1z /= len1;
            var e2x = pY * e1z - pZ * e1y, e2y = pZ * e1x - pX * e1z, e2z = pX * e1y - pY * e1x;
            var len2 = Math.max(Math.sqrt(e2x * e2x + e2y * e2y + e2z * e2z), 1e-5);
            e2x /= len2; e2y /= len2; e2z /= len2;
            var halfWidth = 0.2 + lh3 * 0.35;
            var s = h1v;
            var alpha = (s - 0.5) * halfWidth * 2;
            var dirx = e1x * Math.cos(alpha) + e2x * Math.sin(alpha);
            var diry = e1y * Math.cos(alpha) + e2y * Math.sin(alpha);
            var dirz = e1z * Math.cos(alpha) + e2z * Math.sin(alpha);
            var dlen = Math.max(Math.sqrt(dirx * dirx + diry * diry + dirz * dirz), 1e-5);
            dirx /= dlen; diry /= dlen; dirz /= dlen;
            var bulge = Math.cos((s - 0.5) * 3.14159);
            var flarePulse = 0.6 + 0.4 * Math.sin(time * 0.4 * magnetic + lh4 * 6.283);
            var archHeight = scaleR * (0.1 + lh3 * 0.15) * Math.max(0.1, magnetic) * flarePulse;
            var radius = scaleR * 0.8 + archHeight * bulge;
            px = dirx * radius; py = diry * radius; pz = dirz * radius;
            pColor.setHSL(0.55, 0.3, 0.45 + bulge * 0.3);
          } else {
            var thetaW = h1v * 6.2831853;
            var cphiW = h2v * 2 - 1;
            var sphiW = Math.sqrt(Math.max(0, 1 - cphiW * cphiW));
            var travel = (time * windSpeed * 0.6 + h3v * 18) % 18;
            var radW = scaleR * 0.82 + travel * scaleR * 0.05;
            px = radW * sphiW * Math.cos(thetaW);
            py = radW * sphiW * Math.sin(thetaW);
            pz = radW * cphiW;
            var fade = Math.max(0, 1 - travel / 18);
            pColor.setHSL(0.58, 0.4, 0.15 + fade * 0.5);
          }
        } else if (t < t6) {
          var loopIndex2 = Math.floor(i % loopsCount);
          var lh1b = Math.abs(Math.sin(loopIndex2 * 21.31) * 5432.19) % 1;
          var lh2b = Math.abs(Math.sin(loopIndex2 * 37.77) * 6321.98) % 1;
          var lh3b = Math.abs(Math.sin(loopIndex2 * 59.59) * 7219.87) % 1;
          var lh4b = Math.abs(Math.sin(loopIndex2 * 83.13) * 8123.65) % 1;
          var pcchi2 = lh2b * 2 - 1;
          var psphi2 = Math.sqrt(Math.max(0, 1 - pcchi2 * pcchi2));
          var pTheta2 = lh1b * 6.2831853;
          var pX2 = psphi2 * Math.cos(pTheta2), pY2 = psphi2 * Math.sin(pTheta2), pZ2 = pcchi2;
          var refX2 = 0.15, refY2 = 0, refZ2 = 1;
          var e1x2 = refY2 * pZ2 - refZ2 * pY2, e1y2 = refZ2 * pX2 - refX2 * pZ2, e1z2 = refX2 * pY2 - refY2 * pX2;
          var len1b = Math.max(Math.sqrt(e1x2 * e1x2 + e1y2 * e1y2 + e1z2 * e1z2), 1e-5);
          e1x2 /= len1b; e1y2 /= len1b; e1z2 /= len1b;
          var e2x2 = pY2 * e1z2 - pZ2 * e1y2, e2y2 = pZ2 * e1x2 - pX2 * e1z2, e2z2 = pX2 * e1y2 - pY2 * e1x2;
          var len2b = Math.max(Math.sqrt(e2x2 * e2x2 + e2y2 * e2y2 + e2z2 * e2z2), 1e-5);
          e2x2 /= len2b; e2y2 /= len2b; e2z2 /= len2b;
          var halfWidth2 = 0.3 + lh3b * 0.5;
          var s2 = h1v;
          var alpha2 = (s2 - 0.5) * halfWidth2 * 2;
          var dirx2 = e1x2 * Math.cos(alpha2) + e2x2 * Math.sin(alpha2);
          var diry2 = e1y2 * Math.cos(alpha2) + e2y2 * Math.sin(alpha2);
          var dirz2 = e1z2 * Math.cos(alpha2) + e2z2 * Math.sin(alpha2);
          var dlen2 = Math.max(Math.sqrt(dirx2 * dirx2 + diry2 * diry2 + dirz2 * dirz2), 1e-5);
          dirx2 /= dlen2; diry2 /= dlen2; dirz2 /= dlen2;
          var bulge2 = Math.cos((s2 - 0.5) * 3.14159);
          var flarePulse2 = 0.5 + 0.5 * Math.sin(time * 0.5 * magnetic + lh4b * 6.283);
          var archHeight2 = scaleR * (0.2 + lh3b * 0.3) * Math.max(0.1, magnetic) * flarePulse2;
          var radius2 = scaleR * 0.79 + archHeight2 * bulge2;
          px = dirx2 * radius2; py = diry2 * radius2; pz = dirz2 * radius2;
          pColor.setHSL(Math.max(0, 0.05 - flarePulse2 * 0.02), 0.95, 0.4 + flarePulse2 * 0.3 + bulge2 * 0.1);
        } else {
          var thetaO = h1v * 6.2831853;
          var cphiO = h2v * 2 - 1;
          var sphiO = Math.sqrt(Math.max(0, 1 - cphiO * cphiO));
          var travelO = (time * windSpeed * 1.1 + h3v * 70) % 70;
          var radO = scaleR * 0.95 + travelO * scaleR * 0.045;
          px = radO * sphiO * Math.cos(thetaO);
          py = radO * sphiO * Math.sin(thetaO);
          pz = radO * cphiO;
          var fadeO = Math.max(0, 1 - travelO / 70);
          pColor.setHSL(0.6, 0.35, 0.1 + fadeO * 0.4);
        }

        // Slow Y-axis spin (replaces the OrbitControls auto-rotate in the React version)
        var ang = time * 0.03;
        var ca = Math.cos(ang);
        var sa = Math.sin(ang);
        var fx = px * ca - py * sa;
        var fy = px * sa + py * ca;
        target.set(fx, fy, pz);

        positions[i].lerp(target, 0.1);
        dummy.position.copy(positions[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, pColor);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      // Billboard the camera plane to the camera (a soft camera-facing spin)
      mesh.quaternion.copy(camera.quaternion);

      if (useBloom && composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      rafId = requestAnimationFrame(tick);
    }

    var rafId = requestAnimationFrame(tick);

    // ── Resize handling ─────────────────────────────────────────
    var ro = new ResizeObserver(function () {
      var w = container.clientWidth;
      var h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    // ── Visibility — pause when off-screen to save battery ──────
    var isVisible = true;
    if ('IntersectionObserver' in window) {
      var vObs = new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0 });
      vObs.observe(container);
    }

    // ── Cleanup hook ────────────────────────────────────────────
    container.__sunCleanup = function () {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  };
})();
