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
    // 0 Arena, 1 Esfera, 2 Círculo, 3 Puntero, 4 Neutro
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

    // KICK (B) — empuje global desde el centro del mundo
    beat: uniform(0.0),
    beatStrength: uniform(1.0),

    // ONDAS (click izquierdo) — hasta 4 simultáneas, cada una con
    // su propio origen y "vida" (1 = recién creada, 0 = desaparecida)
    ripple0Pos: uniform(new Vector3(0, 0, 0)),
    ripple0Life: uniform(0.0),
    ripple1Pos: uniform(new Vector3(0, 0, 0)),
    ripple1Life: uniform(0.0),
    ripple2Pos: uniform(new Vector3(0, 0, 0)),
    ripple2Life: uniform(0.0),
    ripple3Pos: uniform(new Vector3(0, 0, 0)),
    ripple3Life: uniform(0.0),

    // ESTÁTICA (N) — sin cambios
    staticTrigger: uniform(0.0),
    staticStrength: uniform(3.0),

    // LOCURA (L) — agitación fuerte pero contenida cerca del centro
    crazyTrigger: uniform(0.0),

    // ARENA / NEUTRO — límite en caja 3D
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
    colorIndex: uniform(0.0),
    prevColorIndex: uniform(0.0),
    colorTransition: uniform(1.0)
  };
}
