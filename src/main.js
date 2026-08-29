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

  orbit.enableDamping = true;

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
  // ESTADO DE LA APLICACIÓN
  // =========================================================

  let paused = false;

  let mode =
    'LAB';

  // =========================================================
  // ESTADO FÍSICO INICIAL
  // =========================================================
  //
  // MUY IMPORTANTE:
  //
  // Al entrar:
  //
  // sphereBlend = 0
  // initialSpeed = 0
  // wind = 0
  // radial = OFF
  // vortex = OFF
  // drag = OFF
  // beat = 0
  // static = 0
  //
  // Resultado:
  //
  // PARTÍCULAS COMPLETAMENTE QUIETAS.

  let targetSphereBlend =
    0.0;

  params.sphereBlend.value =
    0.0;

  params.initialSpeed.value =
    0.0;

  params.windEnabled.value =
    0.0;

  params.windDirection.value =
    1.0;

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

  const triggerBeat = () => {
    params.beat.value =
      1.0;
  };

  // =========================================================
  // ESTÁTICA / LOCURA TEMPORAL
  // =========================================================

  const triggerStatic = () => {
    params.staticTrigger.value =
      Math.min(
        2.0,
        params.staticTrigger.value + 1.0
      );
  };

  // =========================================================
  // MODO LEGACY
  // =========================================================
  //
  // E ya no cambia modos.
  //
  // Lo dejamos definido solamente para evitar perder
  // la posibilidad de utilizar esta transición internamente
  // mientras reconstruimos los modos.

  const toggleStateMode = () => {
    targetSphereBlend =
      targetSphereBlend === 1.0
        ? 0.0
        : 1.0;
  };

  // =========================================================
  // PRESETS DEL LAB
  // =========================================================

  const applyPreset = (id) => {
    // Apagar fuerzas anteriores.

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

    params.initialSpeed.value =
      0.0;

    // -------------------------------------------------------
    // Inercia
    // -------------------------------------------------------

    if (id === 'inertia') {
      params.initialSpeed.value =
        0.8;
    }

    // -------------------------------------------------------
    // Viento
    // -------------------------------------------------------

    else if (id === 'wind') {
      params.windEnabled.value =
        1.0;

      params.windDirection.value =
        1.0;

      params.windSpeed.value =
        1.0;

      params.wind.value.set(
        1.5,
        0,
        0
      );
    }

    // -------------------------------------------------------
    // Atracción
    // -------------------------------------------------------

    else if (id === 'attract') {
      params.radialEnabled.value =
        1.0;

      params.radialStrength.value =
        3.0;
    }

    // -------------------------------------------------------
    // Repulsión
    // -------------------------------------------------------

    else if (id === 'repel') {
      params.radialEnabled.value =
        1.0;

      params.radialStrength.value =
        -3.0;
    }

    // -------------------------------------------------------
    // Vórtice
    // -------------------------------------------------------

    else if (id === 'vortex') {
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

    // -------------------------------------------------------
    // Reset de partículas
    // -------------------------------------------------------

    simulation.reset();
  };

  // =========================================================
  // LAB / PERFORMANCE
  // =========================================================

  const setMode = (next) => {
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

      onReset: () => {
        // Reset vuelve al estado quieto.

        params.initialSpeed.value =
          0.0;

        params.windEnabled.value =
          0.0;

        params.windDirection.value =
          1.0;

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
  // ARRANQUE EN LAB
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
      // Ignorar repetición automática.
      if (event.repeat) {
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
          1.0;

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
      //
      // Por ahora mantenemos N funcionando como el efecto
      // anterior. Más adelante lo convertiremos oficialmente
      // en LOCURA.
      // -----------------------------------------------------

      if (
        event.code === 'KeyN'
      ) {
        triggerStatic();
        return;
      }

      // -----------------------------------------------------
      // Q = VIENTO IZQUIERDA
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
      // W = VIENTO DERECHA
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
      // A = VIENTO -1
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
      // S = VIENTO +1
      // -----------------------------------------------------

      if (
        event.code === 'KeyS'
      ) {
        params.windSpeed.value =
          Math.min(
            5.0,
            params.windSpeed.value + 1.0
          );

        updateWind();

        return;
      }
    }
  );

  // =========================================================
  // ACTUALIZAR VECTOR DEL VIENTO
  // =========================================================

  function updateWind() {
    const speed =
      params.windSpeed.value;

    const direction =
      params.windDirection.value;

    // -------------------------------------------------------
    // Si la velocidad es 0:
    //
    // no existe viento.
    // -------------------------------------------------------

    if (speed <= 0) {
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
    // Viento exclusivamente horizontal.
    //
    // Q = izquierda
    // W = derecha
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
      // Transición suave de esfera.
      //
      // Actualmente comienza en 0, así que no habrá ninguna
      // transición automática al entrar.
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
      // Decaimiento del kick.
      // -----------------------------------------------------

      params.beat.value =
        Math.max(
          0,
          params.beat.value -
            delta * 8.0
        );

      // -----------------------------------------------------
      // Decaimiento de estática.
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

      if (!paused) {
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
