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

  // Cámara fija al centro del sistema.
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

  // =========================================================
  // CÁMARA
  // =========================================================
  //
  // La cámara NO rota con click izquierdo/derecho.
  // Tampoco hace pan.
  // La rueda puede seguir haciendo zoom.
  // =========================================================

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

  // =========================================================
  // FLASH DE PANTALLA
  // =========================================================

  const flashOverlay = document.createElement('div');
  flashOverlay.className = 'flash-overlay';
  document.body.appendChild(flashOverlay);

  let flashAmount = 0;

  const triggerFlash = () => {
    flashAmount = 1;
    params.flash.value = 1;
  };

  // =========================================================
  // HELPERS VISUALES
  // =========================================================

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

  // =========================================================
  // ESTADO
  // =========================================================

  let paused = false;
  let uiMode = 'LAB';
  let compressionHeld = false;

  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, 1),
    0
  );
  const hit = new THREE.Vector3();

  // =========================================================
  // PUNTERO
  // =========================================================

  addEventListener('pointermove', (event) => {
    pointerNdc.x =
      (event.clientX / innerWidth) * 2 - 1;

    pointerNdc.y =
      -(event.clientY / innerHeight) * 2 + 1;

    raycaster.setFromCamera(
      pointerNdc,
      camera
    );

    if (
      raycaster.ray.intersectPlane(
        interactionPlane,
        hit
      )
    ) {
      params.attractor.value.copy(hit);
      attractorHelper.position.copy(hit);
      performanceGuide.position.copy(hit);
    }
  });

  // Nunca abrir menú contextual.
  addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // =========================================================
  // MOUSE
  // =========================================================

  addEventListener('pointerdown', (event) => {
    // Click izquierdo = onda / kick.
    // OrbitControls tiene rotate desactivado, por lo que esto
    // ya no mueve la cámara.
    if (event.button === 0) {
      params.beat.value = 1.0;
    }

    // Click derecho mantenido = compresión.
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

  // =========================================================
  // MODOS
  // =========================================================

  const setUiMode = (next) => {
    uiMode = next;

    const lab = uiMode === 'LAB';

    document.body.classList.toggle(
      'performance-mode',
      !lab
    );

    panel.setVisible(lab);

    axes.visible = lab;

    attractorHelper.visible =
      lab && params.mode.value === 3;

    performanceGuide.visible =
      !lab && params.mode.value === 3;
  };

  const setParticleMode = (next) => {
    params.mode.value = next;

    // Mantener compatibilidad con el parámetro antiguo.
    params.sphereBlend.value =
      next === 1 ? 1.0 : 0.0;

    params.radialEnabled.value = 0.0;

    params.vortexEnabled.value =
      next === 3 ? 1.0 : 0.0;

    params.crazyEnabled.value =
      next === 4 ? 1.0 : 0.0;

    attractorHelper.visible =
      uiMode === 'LAB' && next === 3;

    performanceGuide.visible =
      uiMode === 'PERFORMANCE' && next === 3;

    // Cada cambio de modo empieza desde una configuración limpia.
    simulation.reset();
  };

  // =========================================================
  // EFECTOS
  // =========================================================

  const triggerBeat = () => {
    params.beat.value = 1.0;
  };

  const triggerStatic = () => {
    params.staticTrigger.value = Math.min(
      2.0,
      params.staticTrigger.value + 1.0
    );
  };

  const toggleSlow = () => {
    params.slowMotion.value =
      params.slowMotion.value > 0.5
        ? 0.0
        : 1.0;
  };

  const cycleColor = () => {
    params.colorIndex.value =
      (params.colorIndex.value + 1) % 8;

    params.colorTransition.value = 0.0;
  };

  // =========================================================
  // VIENTO
  // =========================================================

  const updateWind = () => {
    const speed =
      params.windSpeed.value;

    const direction =
      params.windDirection.value;

    if (
      speed <= 0 ||
      direction === 0
    ) {
      params.wind.value.set(0, 0, 0);
      params.windEnabled.value = 0;
      return;
    }

    params.wind.value.set(
      direction * speed,
      0,
      0
    );

    params.windEnabled.value = 1;
  };

  // Teclado: cambia de 1 en 1.
  const changeWindSpeed = (amount) => {
    params.windSpeed.value = Math.max(
      0,
      Math.min(
        10,
        params.windSpeed.value + amount
      )
    );

    updateWind();
  };

  // Slider: establece el valor directamente.
  const setWindSpeed = (value) => {
    params.windSpeed.value = Math.max(
      0,
      Math.min(10, value)
    );

    updateWind();
  };

  // Q/W siempre establecen la dirección completa.
  const changeWindDirection = (direction) => {
    params.windDirection.value =
      direction;

    updateWind();
  };

  const setWindDirection = (direction) => {
    params.windDirection.value =
      direction;

    updateWind();
  };

  // =========================================================
  // RESET
  // =========================================================

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

    flashAmount = 0;

    setParticleMode(0);
  };

  // =========================================================
  // PANEL
  // =========================================================

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
    onWindDirection: setWindDirection,
    onModeChange: () => {
      setUiMode(
        uiMode === 'LAB'
          ? 'PERFORMANCE'
          : 'LAB'
      );
    },
    onPauseChange: () => {
      paused = !paused;
    }
  });

  setUiMode('LAB');
  setParticleMode(0);

  // =========================================================
  // TECLADO
  // =========================================================

  addEventListener('keydown', (event) => {
    if (event.repeat) return;

    switch (event.code) {
      case 'KeyP':
        setUiMode(
          uiMode === 'LAB'
            ? 'PERFORMANCE'
            : 'LAB'
        );
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

      case 'Digit5':
        setParticleMode(4);
        break;

      case 'KeyQ':
        changeWindDirection(-1);
        break;

      case 'KeyW':
        changeWindDirection(1);
        break;

      case 'KeyA':
        changeWindSpeed(-1);
        break;

      case 'KeyS':
        changeWindSpeed(1);
        break;
    }
  });

  // =========================================================
  // RESIZE
  // =========================================================

  addEventListener('resize', () => {
    camera.aspect =
      innerWidth / innerHeight;

    camera.updateProjectionMatrix();
    renderer.setSize(
      innerWidth,
      innerHeight
    );
  });

  simulation.reset();

  const clock = new THREE.Clock();

  // =========================================================
  // LOOP
  // =========================================================

  renderer.setAnimationLoop(() => {
    const delta = Math.min(
      clock.getDelta(),
      0.05
    );

    params.colorTransition.value =
      Math.min(
        1,
        params.colorTransition.value + delta * 5
      );

    params.beat.value = Math.max(
      0,
      params.beat.value - delta * 5.0
    );

    params.staticTrigger.value = Math.max(
      0,
      params.staticTrigger.value - delta * 4.0
    );

    params.flash.value = Math.max(
      0,
      params.flash.value - delta * 5.0
    );

    if (!compressionHeld) {
      params.compression.value = Math.max(
        0,
        params.compression.value - delta * 8.0
      );
    }

    // Flash físico de pantalla: blanco y fade rápido.
    if (flashAmount > 0) {
      flashAmount = Math.max(
        0,
        flashAmount - delta * 1.8
      );

      flashOverlay.style.opacity =
        String(flashAmount);
    } else {
      flashOverlay.style.opacity = '0';
    }

    if (!paused) {
      simulation.stepSimulation();
    }

    orbit.update();
    renderer.render(
      scene,
      camera
    );
  });
}

main().catch(console.error);
