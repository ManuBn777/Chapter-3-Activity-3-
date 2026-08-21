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

    // Estados estructurales: 0.0 = Arena (libre), 1.0 = Esfera (contenedora estática)
    stateMode: uniform(1.0), 
    containerRadius: uniform(3.5),

    // B: Kick / Bounce (Rebote elástico sobre la esfera)
    beat: uniform(0.0),
    beatStrength: uniform(14.0),

    // N: Estática (Dispersión / Temblor)
    staticTrigger: uniform(0.0),
    staticStrength: uniform(6.0),

    vortexEnabled: uniform(1.0),
    vortexStrength: uniform(1.4),

    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.12)
  };
}
