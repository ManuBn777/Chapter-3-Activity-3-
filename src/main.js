import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import './styles.css';

import { createParameters } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { createLabPanel } from './ui/labPanel.js';

const PARTICLE_COUNT = 131072;

async function main() {
  const mount = document.querySelector('#app');

  if (!WebGPU.isAvailable()) {
    mount.appendChild(WebGPU.getErrorMessage());
    throw new Error('Este proyecto requiere WebGPU para ejecutar compute shaders.');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050607');

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 100);
  camera.position.set(0, 0, 11);

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  mount.appendChild(renderer.domElement);
  await renderer.init();

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, 0, 0);

  const params = createParameters();
  const simulation = createSimulation({ renderer, scene, params, count: PARTICLE_COUNT });

  const attractorHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  scene.add(attractorHelper);

  const performanceGuide = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.15, 48),
    new THREE.MeshBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  scene.add(performanceGuide);
  performanceGuide.visible = false;

  const axes = new THREE.AxesHelper(1.5);
  scene.add(axes);

  let paused = false;
  let mode = 'LAB';
  let compressionHeld = false;

  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

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

  addEventListener('contextmenu', (event) => event.preventDefault());

  addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      params.beat.value = Math.max(params.beat.value, 0.9);
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

  const setMode = (next) => {
    mode = next;
    const lab = mode === 'LAB';
    document.body.classList.toggle('performance-mode', !lab);
    panel.setVisible(lab);
    axes.visible = lab;
    attractorHelper.visible = lab && params.mode.value === 3;
    performanceGuide.visible = !lab && params.mode.value === 3;
  };

  const setParticleMode = (next) => {
    params.mode.value = next;
    params.sphereBlend.value = next === 1 ? 1.0 : 0.0;
    params.radialEnabled.value = 0.0;
    params.vortexEnabled.value = next === 3 ? 1.0 : 0.0;
    params.crazyEnabled.value = next === 4 ? 1.0 : 0.0;
    attractorHelper.visible = mode === 'LAB' && next === 3;
    performanceGuide.visible = mode === 'PERFORMANCE' && next === 3;
    simulation.reset();
  };

  const triggerBeat = () => {
    params.beat.value = 1.0;
  };

  const cycleColor = () => {
    params.colorIndex.value = (params.colorIndex.value + 1) % 8;
    params.colorTransition.value = 0.0;
  };

  const triggerFlash = () => {
    params.flash.value = 1.0;
  };

  const toggleSlow = () => {
    params.slowMotion.value = params.slowMotion.value > 0.5 ? 0.0 : 1.0;
  };

  const triggerStatic = () => {
    params.staticTrigger.value = Math.min(2.0, params.staticTrigger.value + 1.0);
  };

  const updateWind = () => {
    const speed = params.windSpeed.value;
    const direction = params.windDirection.value;

    if (speed <= 0 || direction === 0) {
      params.wind.value.set(0, 0, 0);
      params.windEnabled.value = 0;
      return;
    }

    params.wind.value.set(direction * speed, 0, 0);
    params.windEnabled.value = 1;
  };

  const changeWindSpeed = (amount) => {
    params.windSpeed.value = Math.max(0, Math.min(10, params.windSpeed.value + amount));
    updateWind();
  };

  const changeWindDirection = (direction) => {
    params.windDirection.value = direction;
    updateWind();
  };

  const reset = () => {
    params.timeScale.value = 1.0;
    params.maxSpeed.value = 30.0;
    params.windEnabled.value = 0.0;
    params.windDirection.value = 0.0;
    params.windSpeed.value = 0.0;
    params.wind.value.set(0, 0, 0);
    params.radialEnabled.value = 0.0;
    params.vortexEnabled.value = 0.0;
    params.crazyEnabled.value = 0.0;
    params.compression.value = 0.0;
    params.flash.value = 0.0;
    params.slowMotion.value = 0.0;
    params.beat.value = 0.0;
    params.staticTrigger.value = 0.0;
    params.colorIndex.value = 0.0;
    params.colorTransition.value = 1.0;
    setParticleMode(0);
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
    onWindSpeed: changeWindSpeed,
    onWindDirection: changeWindDirection,
    onModeChange: () => setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB'),
    onPauseChange: () => { paused = !paused; }
  });

  setMode('LAB');
  setParticleMode(0);

  addEventListener('keydown', (event) => {
    if (event.repeat) return;

    if (event.code === 'KeyP') setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB');
    else if (event.code === 'KeyR') reset();
    else if (event.code === 'KeyB') triggerBeat();
    else if (event.code === 'KeyN') triggerStatic();
    else if (event.code === 'KeyC') cycleColor();
    else if (event.code === 'KeyF') triggerFlash();
    else if (event.code === 'KeyT') toggleSlow();
    else if (event.code === 'Digit1') setParticleMode(0);
    else if (event.code === 'Digit2') setParticleMode(1);
    else if (event.code === 'Digit3') setParticleMode(2);
    else if (event.code === 'Digit4') setParticleMode(3);
    else if (event.code === 'Digit5') setParticleMode(4);
    else if (event.code === 'KeyQ') changeWindDirection(-1);
    else if (event.code === 'KeyW') changeWindDirection(1);
    else if (event.code === 'KeyA') changeWindSpeed(-1);
    else if (event.code === 'KeyS') changeWindSpeed(1);
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

    params.colorTransition.value = Math.min(1, params.colorTransition.value + delta * 5);
    params.beat.value = Math.max(0, params.beat.value - delta * 5.0);
    params.staticTrigger.value = Math.max(0, params.staticTrigger.value - delta * 4.0);
    params.flash.value = Math.max(0, params.flash.value - delta * 5.0);

    if (!compressionHeld) params.compression.value = Math.max(0, params.compression.value - delta * 8.0);

    if (!paused) simulation.stepSimulation();

    orbit.update();
    renderer.render(scene, camera);
  });
}

main().catch(console.error);
