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

    // MODOS
    // 0 Arena, 1 Esfera, 2 Círculo, 3 Puntero, 4 Locas
    mode: uniform(0.0),
    sphereBlend: uniform(0.0),
    baseRadius: uniform(3.0),
    circleRadius: uniform(4.5),
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
    // windDirection empieza en 1 (derecha) para que A/S solos ya
    // muevan algo. Q pone -1 (izquierda), W pone 1 (derecha).
    windEnabled: uniform(0.0),
    wind: uniform(new Vector3(0, 0, 0)),
    windDirection: uniform(1.0),
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
    colorTransition: uniform(1.0)
  };
}
