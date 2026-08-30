import { Vector3 } from 'three';
import { uniform } from 'three/tsl';

export function createParameters() {
  return {
    // TIEMPO
    dt: uniform(1.0 / 60.0),
    timeScale: uniform(1.0),
    maxSpeed: uniform(30.0),

    // ESTADO
    activated: uniform(0.0),

    // APARIENCIA
    particleSize: uniform(0.025),

    // ATRACTOR / PUNTERO
    attractor: uniform(new Vector3(0, 0, 0)),
    pointerOrbitRadius: uniform(1.3),

    // MODOS
    mode: uniform(0.0),
    sphereBlend: uniform(0.0),
    baseRadius: uniform(3.0),
    circleRadius: uniform(5.5),
    beatExpansion: uniform(0.8),

    // FUERZA RADIAL
    radialEnabled: uniform(0.0),
    radialStrength: uniform(0.0),
    softening: uniform(0.15),

    // VÓRTICE
    vortexEnabled: uniform(0.0),
    vortexStrength: uniform(0.0),

    // DRAG
    dragEnabled: uniform(0.0),
    dragCoefficient: uniform(0.08),

    // VIENTO
    windAngle: uniform(0.0),
    windSpeed: uniform(0.0),

    // INERCIA
    initialSpeed: uniform(0.0),

    // KICK
    beat: uniform(0.0),
    beatStrength: uniform(1.0),

    // ESTÁTICA
    staticTrigger: uniform(0.0),
    staticStrength: uniform(3.0),

    // ARENA
    boundsSize: uniform(new Vector3(8.0, 5.0, 6.0)),

    // CONTENCIÓN
    containmentRadius: uniform(14.0),

    // COMPATIBILIDAD
    spinDirection: uniform(0.0),
    spinSpeed: uniform(0.0),

    // EFECTOS
    crazyEnabled: uniform(0.0),
    compression: uniform(0.0),
    flash: uniform(0.0),
    slowMotion: uniform(0.0),

    // COLOR
    // prevColorIndex guarda el color del que venimos, para poder
    // hacer un cross-fade real hacia colorIndex en vez de un salto.
    colorIndex: uniform(0.0),
    prevColorIndex: uniform(0.0),
    colorTransition: uniform(1.0)
  };
}
