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
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  performanceGuide.visible = false;
  scene.add(performanceGuide);

  const axes = new THREE.AxesHelper(1.5);
  scene.add(axes);

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

  let paused = false;
  let mode = 'LAB';
  let targetSphereBlend = 1.0;
  const clock = new THREE.Clock();

  const triggerBeat = () => {
    params.beat.value = 1.0;
  };

  const triggerStatic = () => {
    params.staticTrigger.value = Math.min(2.0, params.staticTrigger.value + 1.0);
  };

  const toggleStateMode = () => {
    targetSphereBlend = targetSphereBlend === 1.0 ? 0.0 : 1.0;
  };

  const applyPreset = (id) => {
    params.windEnabled.value = 0;
    params.radialEnabled.value = 0;
    params.vortexEnabled.value = 0;
    params.dragEnabled.value = 0;
    params.wind.value.set(0, 0, 0);
    params.initialSpeed.value = 0;

    if (id === 'inertia') params.initialSpeed.value = 0.8;
    else if (id === 'wind') { params.windEnabled.value = 1; params.wind.value.set(1.5, 0, 0); }
    else if (id === 'attract') { params.radialEnabled.value = 1; params.radialStrength.value = 3.0; }
    else if (id === 'repel') { params.radialEnabled.value = 1; params.radialStrength.value = -3.0; }
    else if (id === 'vortex') { params.radialEnabled.value = 1; params.radialStrength.value = 1.0; params.vortexEnabled.value = 1; params.vortexStrength.value = 3.0; params.dragEnabled.value = 1; params.dragCoefficient.value = 0.08; }
    
    simulation.reset();
  };

  const setMode = (next) => {
    mode = next;
    const lab = mode === 'LAB';
    document.body.classList.toggle('performance-mode', !lab);
    panel.setVisible(lab);
    axes.visible = lab;
    attractorHelper.visible = lab;
    performanceGuide.visible = !lab;
  };

  const panel = createLabPanel({
    params,
    onReset: () => simulation.reset(),
    onPreset: applyPreset,
    onBeat: triggerBeat,
    onModeChange: () => setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB'),
    onPauseChange: () => paused = !paused
  });

  setMode('LAB');

  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'KeyP') setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB');
    if (event.code === 'KeyR') simulation.reset();
    if (event.code === 'KeyB') triggerBeat();
    if (event.code === 'KeyN') triggerStatic();
    if (event.code === 'KeyE') toggleStateMode();

    if (event.code === 'KeyQ') {
      params.spinDirection.value = -1.0;
    }
    if (event.code === 'KeyW') {
      params.spinDirection.value = 1.0;
    }
    if (event.code === 'KeyA') {
      params.spinSpeed.value = Math.max(0.0, params.spinSpeed.value - 0.5);
    }
    if (event.code === 'KeyS') {
      params.spinSpeed.value = Math.min(5.0, params.spinSpeed.value + 0.5);
    }
  });

  addEventListener('keyup', (event) => {
    if (event.code === 'KeyQ' || event.code === 'KeyW') {
      params.spinDirection.value = 0.0;
    }
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  simulation.reset();

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    
    params.sphereBlend.value += (targetSphereBlend - params.sphereBlend.value) * Math.min(1.0, delta * 4.0);
    params.beat.value = Math.max(0, params.beat.value - delta * 8.0);
    params.staticTrigger.value = Math.max(0, params.staticTrigger.value - delta * 3.5);

    if (!paused) simulation.stepSimulation();
    orbit.update();
    renderer.render(scene, camera);
  });
}

main().catch(console.error);
