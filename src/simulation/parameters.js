import * as THREE from 'three/webgpu';

export const params = {
  // Configuración general y de tiempo
  count: 131072,
  dt: 0.016,
  timeScale: 1.0,
  maxSpeed: 15.0,
  initialSpeed: 2.0,
  particleSize: 0.15,
  boundsSize: new THREE.Vector3(10.0, 10.0, 10.0),

  // Modos y Transiciones
  sphereBlend: 0.0, // 0 = Modo Arena, 1 = Modo Esfera

  // Parámetros específicos de la Esfera
  baseRadius: 3.5,
  beatExpansion: 2.5,

  // Controles de interacción (Beat / B y Estática / N)
  beat: 0.0,
  beatStrength: 1.0,
  staticTrigger: 0.0,
  staticStrength: 1.0,

  // Fuerzas del Modo Arena
  attractor: new THREE.Vector3(0, 0, 0),
  softening: 1.0,
  radialStrength: 5.0,
  radialEnabled: 1.0,
  wind: new THREE.Vector3(1.0, 0.0, 0.0),
  windEnabled: 0.0,
  vortexStrength: 2.0,
  vortexEnabled: 1.0,
  dragCoefficient: 0.5,
  dragEnabled: 1.0
};
