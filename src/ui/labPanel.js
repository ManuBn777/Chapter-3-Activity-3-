import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

export function setupLab({ params, simulation, scene, camera, renderer }) {
  const gui = new GUI({ title: 'Control Panel - Particle Simulation' });

  // Carpeta de Simulación General
  const simFolder = gui.addFolder('General');
  simFolder.add(params, 'timeScale', 0.0, 3.0, 0.01).name('Time Scale');
  simFolder.add(params, 'maxSpeed', 1.0, 30.0, 0.1).name('Max Speed');
  simFolder.add(params, 'particleSize', 0.01, 0.5, 0.01).name('Particle Size');
  simFolder.add({ reset: () => simulation.reset() }, 'reset').name('Reset Particles');

  // Carpeta de Modo Esfera
  const sphereFolder = gui.addFolder('Sphere Mode');
  sphereFolder.add(params, 'sphereBlend', 0.0, 1.0, 0.01).name('Sphere Blend');
  sphereFolder.add(params, 'baseRadius', 1.0, 8.0, 0.1).name('Base Radius');
  sphereFolder.add(params, 'beatExpansion', 0.5, 5.0, 0.1).name('Beat Expansion');

  // Carpeta de Modo Arena / Fuerzas
  const arenaFolder = gui.addFolder('Arena Forces');
  arenaFolder.add(params, 'radialStrength', -20.0, 20.0, 0.1).name('Radial Strength');
  arenaFolder.add(params, 'vortexStrength', 0.0, 10.0, 0.1).name('Vortex Strength');
  arenaFolder.add(params, 'dragCoefficient', 0.0, 2.0, 0.01).name('Drag');

  gui.open();

  // Control de eventos de teclado para B (Beat/Kick) y N (Estática)
  let beatInterval = null;

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b') {
      // Simula un impulso rápido al pulsar B
      params.beat = 1.0;
    }
    if (e.key.toLowerCase() === 'n') {
      params.staticTrigger = 1.0;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'b') {
      params.beat = 0.0;
    }
    if (e.key.toLowerCase() === 'n') {
      params.staticTrigger = 0.0;
    }
  });

  return {
    dispose: () => {
      gui.destroy();
    }
  };
}
