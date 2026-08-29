import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

import './styles.css';

import { createParameters } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { createLabPanel } from './ui/labPanel.js';

const PARTICLE_COUNT = 131072;

async function main() {
  const mount =
    document.querySelector('#app');

  // =========================================================
  // WEBGPU
  // =========================================================

  if (!WebGPU.isAvailable()) {
    mount.appendChild(
      WebGPU.getErrorMessage()
    );

    throw new Error(
      'Este proyecto requiere WebGPU para ejecutar compute shaders.'
    );
  }

  // =========================================================
  // SCENE
  // =========================================================

  const scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color('#050607');

  // =========================================================
  // CAMERA
  // =========================================================

  const camera =
    new THREE.PerspectiveCamera(
      50,
      innerWidth / innerHeight,
      0.05,
      100
    );

  camera.position.set(
    0,
    0,
    11
  );

  // =========================================================
  // RENDERER
  // =========================================================

  const renderer =
    new THREE.WebGPURenderer({
      antialias: true
    });

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      2
    )
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  mount.appendChild(
    renderer.domElement
  );

  await renderer.init();

  // =========================================================
  // ORBIT CONTROLS
  // =========================================================

  const orbit =
    new OrbitControls(
      camera,
      renderer.domElement
    );

  orbit.enableDamping =
    true;

  orbit.target.set(
    0,
    0,
    0
  );

  // =========================================================
  // PARAMETERS + SIMULATION
  // =========================================================

  const params =
    createParameters();

  const simulation =
    createSimulation({
      renderer,
      scene,
      params,
      count: PARTICLE_COUNT
    });

  // =========================================================
  // ATRACTOR
  // =========================================================

  const attractorHelper =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.12,
        16,
        12
      ),

      new THREE.MeshBasicMaterial({
        color: '#ffffff'
      })
    );

  scene.add(
    attractorHelper
  );

  // =========================================================
  // PERFORMANCE GUIDE
  // =========================================================

  const performanceGuide =
    new THREE.Mesh(
      new THREE.RingGeometry(
        0.13,
        0.15,
        48
      ),

      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

  performanceGuide.visible =
    false;

  scene.add(
    performanceGuide
  );

  // =========================================================
  // AXES
  // =========================================================

  const axes =
    new THREE.AxesHelper(
      1.5
    );

  scene.add(
    axes
  );

  // =========================================================
  // POINTER
  // =========================================================

  const pointerNdc =
    new THREE.Vector2();

  const raycaster =
    new THREE.Raycaster();

  const interactionPlane =
    new THREE.Plane(
      new THREE.Vector3(
        0,
        0,
        1
      ),
      0
    );

  const hit =
    new THREE.Vector3();

  addEventListener(
    'pointermove',
    (event) => {
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
        params.attractor.value.copy(
          hit
        );

        attractorHelper.position.copy(
          hit
        );

        performanceGuide.position.copy(
          hit
        );
      }
    }
  );

  // =========================================================
  // ESTADO
  // =========================================================

  let paused =
    false;

  let mode =
    'LAB';

  let targetSphereBlend =
    0.0;

  // =========================================================
  // ESTADO INICIAL
  // =========================================================
  //
  // Todo comienza completamente quieto.
  //
  // Dirección = 0
  // Velocidad = 0
  //
  // Por tanto no hay viento.
  // =========================================================

  params.sphereBlend.value =
    0.0;

  params.initialSpeed.value =
    0.0;

  params.windEnabled.value =
    0.0;

  params.windDirection.value =
    0.0;

  params.windSpeed.value =
    0.0;

  params.wind.value.set(
    0,
    0,
    0
  );

  params.radialEnabled.value =
    0.0;

  params.vortexEnabled.value =
    0.0;

  params.dragEnabled.value =
    0.0;

  params.beat.value =
    0.0;

  params.staticTrigger.value =
    0.0;

  // =========================================================
  // KICK
  // =========================================================

  const triggerBeat =
    () => {
      params.beat.value =
        1.0;
    };

  // =========================================================
  // ESTÁTICA
  // =========================================================

  const triggerStatic =
    () => {
      params.staticTrigger.value =
        Math.min(
          2.0,
          params.staticTrigger.value + 1.0
        );
    };

  // =========================================================
  // PRESETS
  // =========================================================

  const applyPreset =
    (id) => {
      params.windEnabled.value =
        0.0;

      params.radialEnabled.value =
        0.0;

      params.vortexEnabled.value =
        0.0;

      params.dragEnabled.value =
        0.0;

      params.wind.value.set(
        0,
        0,
        0
      );

      params.windSpeed.value =
        0.0;

      if (
        id === 'inertia'
      ) {
        params.initialSpeed.value =
          0.8;
      }

      else if (
        id === 'wind'
      ) {
        params.windDirection.value =
          1.0;

        params.windSpeed.value =
          1.0;

        updateWind();
      }

      else if (
        id === 'attract'
      ) {
        params.radialEnabled.value =
          1.0;

        params.radialStrength.value =
          3.0;
      }

      else if (
        id === 'repel'
      ) {
        params.radialEnabled.value =
          1.0;

        params.radialStrength.value =
          -3.0;
      }

      else if (
        id === 'vortex'
      ) {
        params.radialEnabled.value =
          1.0;

        params.radialStrength.value =
          1.0;

        params.vortexEnabled.value =
          1.0;

        params.vortexStrength.value =
          3.0;

        params.dragEnabled.value =
          1.0;

        params.dragCoefficient.value =
          0.08;
      }

      simulation.reset();
    };

  // =========================================================
  // LAB / PERFORMANCE
  // =========================================================

  const setMode =
    (next) => {
      mode =
        next;

      const lab =
        mode === 'LAB';

      document.body.classList.toggle(
        'performance-mode',
        !lab
      );

      panel.setVisible(
        lab
      );

      axes.visible =
        lab;

      attractorHelper.visible =
        lab;

      performanceGuide.visible =
        !lab;
    };

  // =========================================================
  // PANEL
  // =========================================================

  const panel =
    createLabPanel({
      params,

      onReset:
        () => {
          params.initialSpeed.value =
            0.0;

          params.windEnabled.value =
            0.0;

          // Centro del slider.
          params.windDirection.value =
            0.0;

          // Inicio del slider.
          params.windSpeed.value =
            0.0;

          params.wind.value.set(
            0,
            0,
            0
          );

          params.radialEnabled.value =
            0.0;

          params.vortexEnabled.value =
            0.0;

          params.dragEnabled.value =
            0.0;

          params.beat.value =
            0.0;

          params.staticTrigger.value =
            0.0;

          params.sphereBlend.value =
            0.0;

          targetSphereBlend =
            0.0;

          simulation.reset();
        },

      onPreset:
        applyPreset,

      onBeat:
        triggerBeat,

      onModeChange:
        () => {
          setMode(
            mode === 'LAB'
              ? 'PERFORMANCE'
              : 'LAB'
          );
        },

      onPauseChange:
        () => {
          paused =
            !paused;
        }
    });

  // =========================================================
  // INICIO
  // =========================================================

  setMode(
    'LAB'
  );

  // =========================================================
  // TECLADO
  // =========================================================

  addEventListener(
    'keydown',
    (event) => {
      if (
        event.repeat
      ) {
        return;
      }

      // -----------------------------------------------------
      // P = LAB / PERFORMANCE
      // -----------------------------------------------------

      if (
        event.code === 'KeyP'
      ) {
        setMode(
          mode === 'LAB'
            ? 'PERFORMANCE'
            : 'LAB'
        );

        return;
      }

      // -----------------------------------------------------
      // R = RESET
      // -----------------------------------------------------

      if (
        event.code === 'KeyR'
      ) {
        params.initialSpeed.value =
          0.0;

        params.windEnabled.value =
          0.0;

        params.windDirection.value =
          0.0;

        params.windSpeed.value =
          0.0;

        params.wind.value.set(
          0,
          0,
          0
        );

        params.radialEnabled.value =
          0.0;

        params.vortexEnabled.value =
          0.0;

        params.dragEnabled.value =
          0.0;

        params.beat.value =
          0.0;

        params.staticTrigger.value =
          0.0;

        params.sphereBlend.value =
          0.0;

        targetSphereBlend =
          0.0;

        simulation.reset();

        return;
      }

      // -----------------------------------------------------
      // B = KICK
      // -----------------------------------------------------

      if (
        event.code === 'KeyB'
      ) {
        triggerBeat();

        return;
      }

      // -----------------------------------------------------
      // N = ESTÁTICA
      // -----------------------------------------------------

      if (
        event.code === 'KeyN'
      ) {
        triggerStatic();

        return;
      }

      // -----------------------------------------------------
      // Q = DIRECCIÓN -1
      // -----------------------------------------------------

      if (
        event.code === 'KeyQ'
      ) {
        params.windDirection.value =
          -1.0;

        updateWind();

        return;
      }

      // -----------------------------------------------------
      // W = DIRECCIÓN +1
      // -----------------------------------------------------

      if (
        event.code === 'KeyW'
      ) {
        params.windDirection.value =
          1.0;

        updateWind();

        return;
      }

      // -----------------------------------------------------
      // A = VELOCIDAD -1
      //
      // Mínimo = 0
      // -----------------------------------------------------

      if (
        event.code === 'KeyA'
      ) {
        params.windSpeed.value =
          Math.max(
            0.0,
            params.windSpeed.value - 1.0
          );

        updateWind();

        return;
      }

      // -----------------------------------------------------
      // S = VELOCIDAD +1
      //
      // Máximo = 10
      // -----------------------------------------------------

      if (
        event.code === 'KeyS'
      ) {
        params.windSpeed.value =
          Math.min(
            10.0,
            params.windSpeed.value + 1.0
          );

        updateWind();

        return;
      }
    }
  );

  // =========================================================
  // ACTUALIZAR VIENTO
  // =========================================================

  function updateWind() {
    const speed =
      params.windSpeed.value;

    const direction =
      params.windDirection.value;

    // -------------------------------------------------------
    // Sin velocidad
    // -------------------------------------------------------

    if (
      speed <= 0
    ) {
      params.wind.value.set(
        0,
        0,
        0
      );

      params.windEnabled.value =
        0.0;

      return;
    }

    // -------------------------------------------------------
    // Sin dirección
    // -------------------------------------------------------

    if (
      direction === 0
    ) {
      params.wind.value.set(
        0,
        0,
        0
      );

      params.windEnabled.value =
        0.0;

      return;
    }

    // -------------------------------------------------------
    // Dirección × velocidad
    //
    // Q = -1
    // W = +1
    //
    // -------------------------------------------------------

    params.wind.value.set(
      direction * speed,
      0,
      0
    );

    params.windEnabled.value =
      1.0;
  }

  // =========================================================
  // RESIZE
  // =========================================================

  addEventListener(
    'resize',
    () => {
      camera.aspect =
        innerWidth / innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        innerWidth,
        innerHeight
      );
    }
  );

  // =========================================================
  // RESET INICIAL
  // =========================================================

  simulation.reset();

  // =========================================================
  // CLOCK
  // =========================================================

  const clock =
    new THREE.Clock();

  // =========================================================
  // LOOP
  // =========================================================

  renderer.setAnimationLoop(
    () => {
      const delta =
        Math.min(
          clock.getDelta(),
          0.05
        );

      // -----------------------------------------------------
      // Transición de esfera
      // -----------------------------------------------------

      params.sphereBlend.value +=
        (
          targetSphereBlend -
          params.sphereBlend.value
        ) *
        Math.min(
          1.0,
          delta * 4.0
        );

      // -----------------------------------------------------
      // Decaimiento Kick
      // -----------------------------------------------------

      params.beat.value =
        Math.max(
          0,
          params.beat.value -
            delta * 8.0
        );

      // -----------------------------------------------------
      // Decaimiento estática
      // -----------------------------------------------------

      params.staticTrigger.value =
        Math.max(
          0,
          params.staticTrigger.value -
            delta * 3.5
        );

      // -----------------------------------------------------
      // Simulación
      // -----------------------------------------------------

      if (
        !paused
      ) {
        simulation.stepSimulation();
      }

      // -----------------------------------------------------
      // Cámara
      // -----------------------------------------------------

      orbit.update();

      // -----------------------------------------------------
      // Render
      // -----------------------------------------------------

      renderer.render(
        scene,
        camera
      );
    }
  );
}

// ===========================================================
// START
// ===========================================================

main().catch(
  console.error
);
