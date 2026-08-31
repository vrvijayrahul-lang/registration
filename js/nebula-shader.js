/**
 * ThreeUI StructureFlowCollection (Nebula Variant) Engine
 * Exact WebGL FBM Nebula Shader implementation from Julian Vance Nebula source
 * Source revision: SHA-256 40eb5bac81e3
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.ThreeUI = root.ThreeUI || {};
    const lib = factory();
    root.ThreeUI.initNebulaShader = lib.initNebulaShader;
    root.initNebulaShader = lib.initNebulaShader;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  function initNebulaShader(containerElement, userOptions = {}) {
    if (!containerElement) return null;

    const options = {
      hue: 0,
      saturation: 1.0,
      brightness: 1.0,
      ...userOptions
    };

    containerElement.classList.add('nebula-canvas-container');

    // Create Canvas if not already existing
    let canvas = containerElement.querySelector('#nebula-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'nebula-canvas';
      containerElement.appendChild(canvas);
    }

    // Create Grain overlay if not present
    if (!containerElement.querySelector('.nebula-grain')) {
      const grain = document.createElement('div');
      grain.className = 'nebula-grain';
      containerElement.appendChild(grain);
    }

    // Create Vignette overlay if not present
    if (!containerElement.querySelector('.nebula-vignette')) {
      const vignette = document.createElement('div');
      vignette.className = 'nebula-vignette';
      containerElement.appendChild(vignette);
    }

    if (options.hue !== 0 || options.saturation !== 1 || options.brightness !== 1) {
      canvas.style.filter = `hue-rotate(${options.hue}deg) saturate(${options.saturation}) brightness(${options.brightness})`;
    }

    // Ensure THREE is loaded
    if (typeof THREE === 'undefined') {
      console.error('Three.js library is required for Nebula Shader.');
      return null;
    }

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    
    const bounds = containerElement.getBoundingClientRect();
    renderer.setSize(bounds.width || window.innerWidth, bounds.height || window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(bounds.width || window.innerWidth, bounds.height || window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
    };

    const fragmentShader = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
      vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
      vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.55;
        for(int i=0;i<4;i++){ v += a*snoise(p); p *= 2.05; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.05;
        vec2 drift = (u_mouse - 0.5) * 0.12;

        // warp coordinates for fluid motion
        vec2 st = p * 0.85 + drift;
        st += vec2(fbm(st + t), fbm(st - t)) * 0.35;

        vec3 col = vec3(0.005, 0.005, 0.012); // deep zinc base

        // main indigo mass, weighted to the right / upper-right
        vec2 c1 = vec2(u_resolution.x / u_resolution.y * 0.62, 0.85) + drift;
        float d1 = length(p - c1);
        float n1 = fbm(st * 1.4 + t * 2.0);
        float mass = smoothstep(1.15, 0.05, d1 + n1 * 0.32);

        // vertical sweeping tongue of light
        float tongue = smoothstep(0.55, 0.02, abs(p.x - (u_resolution.x/u_resolution.y*0.58) - n1*0.22)) * smoothstep(1.2, 0.1, abs(uv.y - 0.55));

        // secondary far-right glow
        vec2 c2 = vec2(u_resolution.x / u_resolution.y * 1.05, 0.5);
        float d2 = length(p - c2);
        float mass2 = smoothstep(0.9, 0.0, d2 + fbm(st*1.1 - t)*0.25);

        vec3 deepIndigo = vec3(0.05, 0.02, 0.15);
        vec3 purple = vec3(0.2, 0.1, 0.6);
        vec3 hotViolet = vec3(0.5, 0.3, 1.0);

        col = mix(col, deepIndigo, clamp(mass*0.9 + mass2*0.7, 0.0, 1.0));
        col = mix(col, purple, clamp(mass*mass*1.1 + mass2*0.55, 0.0, 1.0));
        col += hotViolet * tongue * mass * 0.85;

        // breathing pulse
        float pulse = 0.92 + 0.08 * sin(u_time * 0.4);
        col *= pulse;

        // vignette
        float vig = smoothstep(1.6, 0.35, length(uv - vec2(0.45, 0.5)));
        col *= mix(0.55, 1.0, vig);

        // keep left side dark
        col *= mix(0.35, 1.0, smoothstep(0.0, 0.55, uv.x));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: 'void main(){ gl_Position = vec4(position, 1.0); }',
      fragmentShader: fragmentShader
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    const mouseTarget = { x: 0.5, y: 0.5 };
    const pointerHandler = function (e) {
      mouseTarget.x = e.clientX / window.innerWidth;
      mouseTarget.y = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', pointerHandler);

    const resizeHandler = function () {
      const b = containerElement.getBoundingClientRect();
      const w = b.width || window.innerWidth;
      const h = b.height || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };
    window.addEventListener('resize', resizeHandler);

    const clock = new THREE.Clock();
    let animFrame = 0;

    function animate() {
      animFrame = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_mouse.value.x += (mouseTarget.x - uniforms.u_mouse.value.x) * 0.03;
      uniforms.u_mouse.value.y += (mouseTarget.y - uniforms.u_mouse.value.y) * 0.03;
      renderer.render(scene, camera);
    }
    animate();

    return function cleanup() {
      if (animFrame) cancelAnimationFrame(animFrame);
      window.removeEventListener('pointermove', pointerHandler);
      window.removeEventListener('resize', resizeHandler);
      renderer.dispose();
    };
  }

  return { initNebulaShader };
}));
