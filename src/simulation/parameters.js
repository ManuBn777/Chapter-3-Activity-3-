import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

export function createParameters() {
  return {
    dt: uniform(1 / 60),
    timeScale: uniform(1.0),
    initialSpeed: uniform(0.35),
    maxSpeed: uniform(5.0),
    boundsSize: uniform(10.0),
    particleSize: uniform(0.035),

    windEnabled: uniform(0.0),
    wind: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),

    radialEnabled: uniform(1.0),
    attractor: uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
    radialStrength: uniform(2.2),
    softening: uniform(0.35),

    // Transición de estado (0.0 = Arena fluida, 1.0 = Esfera)
    sphereBlend: uniform(1.0),
    baseRadius: uniform(2.0),

    // B: Kick / Bounce masivo en la esfera (de 2 a 8) y onda en arena
    beat: uniform(0.0),
    beatExpansion: uniform(6.0), // 2.0 base + 6.0 = 8.0 de radio máximo en el golpe
    beatStrength: uniform(25.0),

    // N: Estática
    staticTrigger: uniform(0.0),
    staticStrength: uniform(6.0),

    vortexEnabled: uniform(1.0),
    vortexStrength: uniform(1.4),

    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.12)
  };
}
