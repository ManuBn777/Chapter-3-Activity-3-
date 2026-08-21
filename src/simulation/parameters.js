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
    // Transición de estado (0.0 = Arena, 1.0 = Esfera)
    sphereBlend: uniform(1.0),
    baseRadius: uniform(2.0),
    // B: Kick / Bounce
    beat: uniform(0.0),
    beatExpansion: uniform(6.0),
    beatStrength: uniform(25.0),
    beatDecay: uniform(1.2),
    // N: Estática
    staticTrigger: uniform(0.0),
    staticStrength: uniform(6.0),
    // Controles de Órbita y Giro (Q/W y A/S)
    spinDirection: uniform(1.0), // 1.0 (Derecha/W) o -1.0 (Izquierda/Q)
    spinSpeed: uniform(1.5),     // Velocidad orbital ajustable (A/S)
    vortexEnabled: uniform(1.0),
    vortexStrength: uniform(1.4),
    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.12)
  };
}
