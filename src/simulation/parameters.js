import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

export function createParameters() {
  return {

    // ============================================================
    // SIMULATION
    // ============================================================

    dt: uniform(1 / 60),
    timeScale: uniform(1.0),

    // Movimiento interno constante
    initialSpeed: uniform(0.22),

    maxSpeed: uniform(1.5),

    boundsSize: uniform(10.0),

    particleSize: uniform(0.035),


    // ============================================================
    // WIND
    // ============================================================

    windEnabled: uniform(0.0),

    wind: uniform(
      new THREE.Vector3(
        0.0,
        0.0,
        0.0
      )
    ),


    // ============================================================
    // RADIAL — SOLO ARENA
    // ============================================================

    radialEnabled: uniform(1.0),

    attractor: uniform(
      new THREE.Vector3(
        0.0,
        0.0,
        0.0
      )
    ),

    radialStrength: uniform(2.2),

    softening: uniform(0.35),


    // ============================================================
    // ESTADOS
    // ============================================================

    // 0 = Arena
    // 1 = Esfera

    sphereBlend: uniform(1.0),

    // Radio real de la esfera

    baseRadius: uniform(2.0),


    // ============================================================
    // B — THUMP
    // ============================================================

    /*
     * Este NO es un bounce.
     *
     * Es un pulso extremadamente corto.
     */

    beat: uniform(0.0),

    /*
     * Cuánto se expande la esfera durante el kick.
     *
     * 0.20 = +20%
     *
     * Radio 2 → aproximadamente 2.4
     *
     * Esto es intencionalmente pequeño.
     */

    kickAmount: uniform(0.20),

    /*
     * Se conserva para el modo Arena.
     */

    beatStrength: uniform(8.0),


    // ============================================================
    // N — ESTÁTICA
    // ============================================================

    staticTrigger: uniform(0.0),

    staticStrength: uniform(6.0),


    // ============================================================
    // VÓRTICE
    // ============================================================

    vortexEnabled: uniform(1.0),

    vortexStrength: uniform(1.4),


    // ============================================================
    // DRAG
    // ============================================================

    dragEnabled: uniform(1.0),

    dragCoefficient: uniform(0.035)

  };
}
