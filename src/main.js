import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import './styles.css';
import { createParameters } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { createLabPanel } from './ui/labPanel.js';

const PARTICLE_COUNT = 131072;
const WIND_ROTATE_SPEED = 2.4;
const WIND_SPEED_MIN = 0;
const WIND_SPEED_MAX = 25;

async function main() {
  const mount = document.querySelector('#app');

  if (!WebGPU.isAvailable()) {
    mount.appendChild(WebGPU.getErrorMessage());
    throw new Error('Este proyecto requiere WebGPU para ejecutar compute shaders.');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050607');

  const camera = new THREE.PerspectiveCamera(
    50,
    innerWidth / innerHeight,
    0.05,
    100
  );
  camera.position.set(0, 0, 11);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  mount.appendChild(renderer.domElement);
  await renderer.init();

  const orbit = new OrbitControls(
    camera,
    renderer.domElement
  );

  orbit.target.set(0, 0, 0);
  orbit.enableRotate = false;
  orbit.enablePan = false;
  orbit.enableDamping = false;
  orbit.enableZoom = true;
  orbit.minDistance = 4;
  orbit.maxDistance = 30;

  const params = createParameters();

  const simulation = createSimulation({
    renderer,
    scene,
    params,
    count: PARTICLE_COUNT
  });

  const flashOverlay = document.createElement('div');
  flashOverlay.className = 'flash-overlay';
  document.body.appendChild(flashOverlay);

  let flashAmount = 0;

  const triggerFlash = () => {
    flashAmount = 1;
    params.flash.value = 1;
  };

  const attractorHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  scene.add(attractorHelper);

  const performanceGuide = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.15, 48),
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  scene.add(performanceGuide);
  performanceGuide.visible = false;

  const axes = new THREE.AxesHelper(1.5);
  scene.add(axes);

  let paused = false;
  let uiMode = 'LAB';
  let compressionHeld = false;
  let windSpeedTarget = 0;
  let slowMotionTarget = 0;
  let hasSpread = false;

  const heldKeys = new Set();

  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, 1),
    0
  );
  const hit = new THREE.Vector3();

  const activate = () => {
    if (!hasSpread) {
      hasSpread = true;
      params.staticTrigger.value = 2.5;
    }

    params.activated.value = 1;
  };

  addEventListener('pointermove', (event) => {
    pointerNdc.x = (event.clientX / innerWidth) * 2 - 1;
    pointerNdc.y = -(event.clientY / innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointerNdc, camera);

    if (raycaster.ray.intersectPlane(interactionPlane, hit)) {
      params.attractor.value.copy(hit);
      attractorHelper.position.copy(hit);
      performanceGuide.position.copy(hit);
    }
  });

  addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  addEventListener('pointerdown', (event) => {
    if (params.mode.value !== 0) {
      activate();
    }

    if (event.button === 0) {
      params.beat.value = 1.0;
    }

    if (event.button === 2) {
      compressionHeld = true;
      params.compression.value = 1.0;
    }
  });

  addEventListener('pointerup', (event) => {
    if (event.button === 2) {
      compressionHeld = false;
      params.compression.value = 0.0;
    }
  });

  addEventListener('pointercancel', () => {
    compressionHeld = false;
    params.compression.value = 0.0;
  });

  const setUiMode = (next) => {
    uiMode = next;
    const lab = uiMode === 'LAB';

    document.body.classList.toggle('performance-mode', !lab);
    panel.setVisible(lab);
    axes.visible = lab;

    attractorHelper.visible = lab && params.mode.value === 3;
    performanceGuide.visible = !lab && params.mode.value === 3;
  };

  // Cambiar de modo YA NO resetea posiciones: cada modo tiene su
  // propia fuerza de atracción hacia su forma, así que las partículas
  // fluyen suavemente desde donde estén hacia la nueva forma.
  const setParticleMode = (next) => {
    params.mode.value = next;
    params.sphereBlend.value = next === 1 ? 1.0 : 0.0;
    params.radialEnabled.value = 0.0;
    params.vortexEnabled.value = next === 3 ? 1.0 : 0.0;

    attractorHelper.visible = uiMode === 'LAB' && next === 3;
    performanceGuide.visible = uiMode === 'PERFORMANCE' && next === 3;
  };

  const triggerBeat = () => {
    params.beat.value = 1.0;
  };

  const triggerStatic = () => {
    params.staticTrigger.value = Math.min(2.0, params.staticTrigger.value + 1.0);
  };

  const toggleSlow = () => {
    slowMotionTarget = slowMotionTarget > 0.5 ? 0 : 1;
  };

  const cycleColor = () => {
    params.prevColorIndex.value = params.colorIndex.value;
    params.colorIndex.value = (params.colorIndex.value + 1) % 8;
    params.colorTransition.value = 0.0;
  };

  const changeWindSpeed = (amount) => {
    activate();
    windSpeedTarget = Math.max(
      WIND_SPEED_MIN,
      Math.min(WIND_SPEED_MAX, windSpeedTarget + amount)
    );
  };

  const setWindSpeed = (value) => {
    activate();
    windSpeedTarget = Math.max(
      WIND_SPEED_MIN,
      Math.min(WIND_SPEED_MAX, value)
    );
  };

  const setWindAngle = (value) => {
    activate();
    params.windAngle.value = value;
  };

  const rotateWindBy = (radians) => {
    activate();
    params.windAngle.value += radians;
  };

  const reset = () => {
    params.timeScale.value = 1.0;
    params.maxSpeed.value = 30.0;

    windSpeedTarget = 0;
    params.windSpeed.value = 0.0;
    params.windAngle.value = 0.0;

    slowMotionTarget = 0;
    params.slowMotion.value = 0.0;

    params.radialEnabled.value = 0.0;
    params.vortexEnabled.value = 0.0;
    params.crazyEnabled.value = 0.0;
    params.compression.value = 0.0;
    params.flash.value = 0.0;
    params.beat.value = 0.0;
    params.staticTrigger.value = 0.0;

    params.colorIndex.value = 0.0;
    params.prevColorIndex.value = 0.0;
    params.colorTransition.value = 1.0;

    flashAmount = 0;
    params.activated.value = 0;
    hasSpread = false;

    setParticleMode(0);
    simulation.reset();
  };

  const panel = createLabPanel({
    params,
    onReset: reset,
    onModeSelect: setParticleMode,
    onBeat: triggerBeat,
    onFlash: triggerFlash,
    onColor: cycleColor,
    onSlow: toggleSlow,
    onStatic: triggerStatic,
    onWindSpeed: setWindSpeed,
    onWindAngle: setWindAngle,
    onWindFlip180: () => rotateWindBy(Math.PI),
    onWindTurn90: () => rotateWindBy(Math.PI / 2),
    onWindTurnMinus90: () => rotateWindBy(-Math.PI / 2),
    onModeChange: () => {
      setUiMode(uiMode === 'LAB' ? 'PERFORMANCE' : 'LAB');
    },
    onPauseChange: () => {
      paused = !paused;
    }
  });

  setUiMode('LAB');
  setParticleMode(0);

  addEventListener('keydown', (event) => {
    heldKeys.add(event.code);

    if (event.repeat) return;

    switch (event.code) {
      case 'KeyP':
        setUiMode(uiMode === 'LAB' ? 'PERFORMANCE' : 'LAB');
        break;

      case 'KeyR':
        reset();
        break;

      case 'KeyB':
        triggerBeat();
        break;

      case 'KeyN':
        triggerStatic();
        break;

      case 'KeyC':
        cycleColor();
        break;

      case 'KeyF':
        triggerFlash();
        break;

      case 'KeyT':
        toggleSlow();
        break;

      case 'Digit1':
        setParticleMode(0);
        break;

      case 'Digit2':
        setParticleMode(1);
        break;

      case 'Digit3':
        setParticleMode(2);
        break;

      case 'Digit4':
        setParticleMode(3);
        break;

      case 'KeyA':
        changeWindSpeed(-1);
        break;

      case 'KeyS':
        changeWindSpeed(1);
        break;

      case 'KeyE':
        rotateWindBy(Math.PI);
        break;

      case 'KeyX':
        rotateWindBy(Math.PI / 2);
        break;

      case 'KeyZ':
        rotateWindBy(-Math.PI / 2);
        break;
    }
  });

  addEventListener('keyup', (event) => {
    heldKeys.delete(event.code);
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  simulation.reset();

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);

    if (heldKeys.has('KeyQ')) {
      activate();
      params.windAngle.value -= WIND_ROTATE_SPEED * delta;
    }

    if (heldKeys.has('KeyW')) {
      activate();
      params.windAngle.value += WIND_ROTATE_SPEED * delta;
    }

    const windDiff = windSpeedTarget - params.windSpeed.value;

    if (Math.abs(windDiff) < 0.02) {
      params.windSpeed.value = windSpeedTarget;
    } else {
      params.windSpeed.value += windDiff * Math.min(1, delta * 4);
    }

    // Rampa suave de entrada/salida a slow motion (~0.3-0.4s), usando
    // delta en tiempo real (no afectada por el propio slow motion).
    const slowDiff = slowMotionTarget - params.slowMotion.value;

    if (Math.abs(slowDiff) < 0.01) {
      params.slowMotion.value = slowMotionTarget;
    } else {
      params.slowMotion.value += slowDiff * Math.min(1, delta * 6);
    }

    params.colorTransition.value = Math.min(1, params.colorTransition.value + delta * 2.5);
    params.beat.value = Math.max(0, params.beat.value - delta * 5.0);
    params.staticTrigger.value = Math.max(0, params.staticTrigger.value - delta * 4.0);
    params.flash.value = Math.max(0, params.flash.value - delta * 5.0);

    if (!compressionHeld) {
      params.compression.value = Math.max(0, params.compression.value - delta * 8.0);
    }

    if (flashAmount > 0) {
      flashAmount = Math.max(0, flashAmount - delta * 1.8);
      flashOverlay.style.opacity = String(flashAmount);
    } else {
      flashOverlay.style.opacity = '0';
    }

    if (!paused) {
      simulation.stepSimulation();
    }

    orbit.update();
    renderer.render(scene, camera);
  });
}

main().catch(console.error);
