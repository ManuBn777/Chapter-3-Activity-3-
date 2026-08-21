import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

export function createParameters() {
  return {
    dt: uniform(1 / 60),
    timeScale: uniform(1.0),

    // Movimiento inicial suave para mantener
    // las partículas siempre ligeramente activas.
    initialSpeed: uniform(0.35),

    maxSpeed: uniform(5.0),
    boundsSize: uniform(10.0),
    particleSize: uniform(0.035),

    // ============================================================
    // VIENTO
    // ============================================================

    windEnabled: uniform(0.0),
    wind: uniform(
      new THREE.Vector3(0.0, 0.0, 0.0)
    ),

    // ============================================================
    // FUERZA RADIAL
    // ============================================================

    radialEnabled: uniform(1.0),

    attractor: uniform(
      new THREE.Vector3(0.0, 0.0, 0.0)
    ),

    radialStrength: uniform(2.2),
    softening: uniform(0.35),

    // ============================================================
    // TRANSICIÓN ARENA / ESFERA
    // ============================================================

    // 0.0 = Arena
    // 1.0 = Esfera
    sphereBlend: uniform(1.0),

    // Radio normal de la esfera
    baseRadius: uniform(2.0),

    // ============================================================
    // B — KICK / BOUNCE
    // ============================================================

    // Intensidad temporal del beat
    beat: uniform(0.0),

    // 2 + 6 = 8
    // Por lo tanto:
    // radio normal = 2
    // radio máximo = 8
    beatExpansion: uniform(6.0),

    // Fuerza física del impulso.
    // Reducida para que el bounce sea suave.
    beatStrength: uniform(8.0),

    // ============================================================
    // N — ESTÁTICA
    // ============================================================

    staticTrigger: uniform(0.0),
    staticStrength: uniform(6.0),

    // ============================================================
    // GIRO / ÓRBITA
    // ============================================================

    // 1.0 = derecha
    // -1.0 = izquierda
    spinDirection: uniform(1.0),

    // Velocidad orbital
    spinSpeed: uniform(1.5),

    // ============================================================
    // VÓRTICE
    // ============================================================

    vortexEnabled: uniform(1.0),
    vortexStrength: uniform(1.4),

    // ============================================================
    // DRAG
    // ============================================================

    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.12)
  };
}
