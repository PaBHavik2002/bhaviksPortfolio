/* Scroll Pyramid concept: vanilla JS, no external runtime dependency.
 * Replaces the earlier SVG-character animation controller in this isolated demo.
 * 15 cubes: 5 / 4 / 3 / 2 / 1, assembled progressively during scroll.
 * No AWS calls, cookies, local storage or public API requests.
 */
(() => {
  'use strict';

  //! REVOLVING EFFECT ADDED

  const FLOAT_SETTINGS = {
    idleDelay: 4000,
    orbitSpeed: 0.00016,
    orbitRadiusX: 265,
    orbitRadiusZ: 145,
    verticalFloat: 20,
    settledMovement: 0.06,
    transitionTime: 1.25
  };

  let floatTarget = 1;
  let floatStrength = 1;
  let floatIdleTimer = null;


  const CUBE_SIZE = 72;
  const ROWS = [5, 4, 3, 2, 1];
  const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  const host = document.getElementById('cubes');
  const nav = [...document.querySelectorAll('.nav-step')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!host) return;

  // Fixed, intentional variation keeps the scattered positions consistent
  // across reloads, instead of changing them with Math.random().
  const origins = [
    [-288, -150, 22], [257, 156, -37], [-265, 185, -21], [301, -180, 13],
    [-314, 82, 28], [272, -110, -24], [-245, -197, 32], [317, 172, -18],
    [-294, 118, -34], [254, 204, 20], [-278, -144, -14], [313, -78, 29],
    [-255, 189, 0], [284, -179, 30], [327, 90, -22]
  ];
  const hues = [213, 218, 222, 208, 201, 267, 275, 257, 270, 187, 175, 182, 181, 173, 167];
  const cubes = [];
  let cubeNo = 0;

  ROWS.forEach((count, level) => {
    for (let column = 0; column < count; column++) {
      const el = document.createElement('div');
      el.className = 'cube';
      el.style.setProperty('--hue', String(hues[cubeNo]));
      el.setAttribute('data-layer', String(level));
      el.innerHTML = FACES.map(face => `<i class="cube__face cube__face--${face}"></i>`).join('');
      host.appendChild(el);
      const [sx, sz, turn] = origins[cubeNo];
      cubes.push({
        el, level, column, count,
        start: { x: sx, y: -CUBE_SIZE / 2, z: sz },
        target: { x: (column - (count - 1) / 2) * CUBE_SIZE, y: -(level + .5) * CUBE_SIZE, z: 0 },
        rx: turn * 2.9, ry: turn * 5.5, rz: turn * 1.8,
        delay: count > 1 ? column * .085 : 0
      });
      cubeNo++;
    }
  });

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const ease = t => 1 - Math.pow(1 - clamp(t), 3);
  const mix = (a, b, t) => a + (b - a) * t;
  const fromHex = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const mixHex = (a, b, t) => {
    const aa = fromHex(a), bb = fromHex(b);
    return '#' + aa.map((v, i) => Math.round(mix(v, bb[i], t)).toString(16).padStart(2, '0')).join('');
  };

  const themes = [
    { bg: '#f6f5f1', fg: '#1b2633', muted: '#6a7680', accent: '#3659b8', glow: '#d3dce7', panel: '#ffffff' },
    { bg: '#eeeae5', fg: '#1b2633', muted: '#6a7680', accent: '#3659b8', glow: '#d7d5e2', panel: '#ffffff' },
    { bg: '#0d0c15', fg: '#f8f5ff', muted: '#b9b4cb', accent: '#b8a3ff', glow: '#594678', panel: '#75668f' },
    { bg: '#081b1d', fg: '#edfAf6', muted: '#a8c8c6', accent: '#83e3ce', glow: '#306e66', panel: '#a1ddd0' },
    { bg: '#07191b', fg: '#edfaf6', muted: '#a8c8c6', accent: '#83e3ce', glow: '#286458', panel: '#a1ddd0' }
  ];

  //! ANIMATION SMOOTHER
  let smoothProgress = 0;
  let lastTime = 0;
  let animationFrame = null;

  function animate(time) {
    const viewport = Math.max(window.innerHeight, 1);
    const target = clamp(window.scrollY / viewport, 0, 4);

    const dt = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;

    const alpha = reducedMotion.matches
      ? 1
      : 1 - Math.exp(-dt / 0.12);

    smoothProgress += (target - smoothProgress) * alpha;

    if (Math.abs(target - smoothProgress) < 0.001) {
      smoothProgress = target;
    }

    update();

    if (Math.abs(target - smoothProgress) >= 0.001) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      animationFrame = null;
    }
  }

  function scheduleAnimation() {
    if (animationFrame !== null) return;
    lastTime = 0;
    animationFrame = requestAnimationFrame(animate);
  }

  window.addEventListener("scroll", scheduleAnimation, {
    passive: true
  });

  window.addEventListener("resize", scheduleAnimation);

  reducedMotion.addEventListener?.("change", scheduleAnimation);

  scheduleAnimation();

  let ticking = false;
  function update() {
    ticking = false;
    const current = smoothProgress;
    const left = Math.min(4, Math.floor(current));
    const right = Math.min(4, left + 1);
    const fraction = current - left;
    const root = document.documentElement;
    const a = themes[left], b = themes[right];
    ['bg', 'fg', 'muted', 'accent'].forEach(key => root.style.setProperty(`--${key}`, mixHex(a[key], b[key], fraction)));
    ['glow', 'panel'].forEach(key => {
      const x = fromHex(a[key]), y = fromHex(b[key]);
      root.style.setProperty(`--${key}-rgb`, x.map((v, i) => Math.round(mix(v, y[i], fraction))).join(' '));
    });

    // Layer one is already built; each new chapter brings a layer from the floor.
    const simplify = reducedMotion.matches;
    let settled = 0;
    cubes.forEach((cube) => {
      const rawProgress = cube.level === 0 ? 1 :
        clamp((current - (cube.level - 1) - cube.delay) / (1 - cube.delay));
      const t = simplify ? (rawProgress > .5 ? 1 : 0) : ease(rawProgress);
      if (t >= .997) settled++;
      const { start, target } = cube;
      const arc = simplify ? 0 : 160 * Math.sin(Math.PI * t) * (1 - .09 * cube.level);
      const x = mix(start.x, target.x, t);
      const y = mix(start.y, target.y, t) - arc;
      const z = mix(start.z, target.z, t);
      const spin = 1 - t;
      cube.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${(cube.rx * spin).toFixed(1)}deg) rotateY(${(cube.ry * spin).toFixed(1)}deg) rotateZ(${(cube.rz * spin).toFixed(1)}deg)`;
      cube.el.classList.toggle('is-in-place', t >= .997);
    });
    const active = Math.min(4, Math.round(current));
    nav.forEach((el, i) => {
      el.classList.toggle('active', i === active);
      if (i === active) el.setAttribute('aria-current', 'location');
      else el.removeAttribute('aria-current');
    });
  }

  function tick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  reducedMotion.addEventListener?.('change', tick);
  update();
})();


//! SCROLLING INTO HEADER

const header = document.querySelector(".header");
const chapterContents = document.querySelectorAll(
  ".chapter .chapter-copy"
);

let maskFrame = null;

function updateChapterMasks() {
  maskFrame = null;

  if (!header) return;
  console.log('This is executed here!')
  const headerBottom =
    header.getBoundingClientRect().bottom;

  chapterContents.forEach((element) => {
    const rect = element.getBoundingClientRect();

    const overlap = Math.max(
      0,
      Math.min(rect.height, headerBottom - rect.top)
    );

    if (overlap <= 0) {
      element.style.maskImage = "none";
      element.style.webkitMaskImage = "none";
      return;
    }

    // Invisible above the header boundary,
    // gently fading into view below it.
    const fade = 16;

    const gradient = `linear-gradient(
  to bottom,
  transparent 0px,
  transparent ${overlap}px,
  black ${overlap + fade}px
)`;

    element.style.maskImage = gradient;
    element.style.webkitMaskImage = gradient;
  });
}

function requestChapterMaskUpdate() {
  if (maskFrame !== null) return;

  maskFrame = requestAnimationFrame(
    updateChapterMasks
  );
}

window.addEventListener(
  "scroll",
  requestChapterMaskUpdate,
  { passive: true }
);

window.addEventListener(
  "resize",
  requestChapterMaskUpdate
);

requestChapterMaskUpdate();
