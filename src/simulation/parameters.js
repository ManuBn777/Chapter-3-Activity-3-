import { Vector3 } from 'three';
import { uniform } from 'three/tsl';

export function createParameters() {
  return {
    // TIEMPO
    dt: uniform(1.0 / 60.0),
    timeScale: uniform(1.0),
    maxSpeed: uniform(60.0),

    // ESTADO
    activated: uniform(0.0),

    // APARIENCIA
    particleSize: uniform(0.025),

    // ATRACTOR / PUNTERO
    attractor: uniform(new Vector3(0, 0, 0)),
    pointerOrbitRadius: uniform(1.0),
    pointerOrbitVariance: uniform(0.6),
    // 0 = modo normal (arrastre rápido), 1 = mantenido con click:
    // nube pesada tipo humo/tinta. Se suaviza en JS, no es un salto.
    pointerDragAmount: uniform(0.0),

    // MODOS
    mode: uniform(0.0),
    sphereBlend: uniform(0.0),
    baseRadius: uniform(3.0),
    circleRadius: uniform(4.0),
    circleExpansion: uniform(0.0),
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

    // KICK (B)
    beat: uniform(0.0),
    beatStrength: uniform(1.0),

    // ONDAS (click izquierdo)
    ripple0Pos: uniform(new Vector3(0, 0, 0)),
    ripple0Life: uniform(0.0),
    ripple1Pos: uniform(new Vector3(0, 0, 0)),
    ripple1Life: uniform(0.0),
    ripple2Pos: uniform(new Vector3(0, 0, 0)),
    ripple2Life: uniform(0.0),
    ripple3Pos: uniform(new Vector3(0, 0, 0)),
    ripple3Life: uniform(0.0),

    // ESTÁTICA (N)
    staticTrigger: uniform(0.0),
    staticStrength: uniform(3.0),

    // LOCURA (L)
    crazyTrigger: uniform(0.0),

    // COMPRESIÓN (click derecho)
    releaseBurst: uniform(0.0),

    // ARENA / NEUTRO
    boundsSize: uniform(new Vector3(13.0, 13.0, 7.0)),

    // CONTENCIÓN
    containmentRadius: uniform(18.0),

    // COMPATIBILIDAD
    spinDirection: uniform(0.0),
    spinSpeed: uniform(0.0),

    // EFECTOS
    crazyEnabled: uniform(0.0),
    compression: uniform(0.0),
    flash: uniform(0.0),
    slowMotion: uniform(0.0),

    // COLOR
    colorIndex: uniform(0.0),
    prevColorIndex: uniform(0.0),
    colorTransition: uniform(1.0)
  };
}
