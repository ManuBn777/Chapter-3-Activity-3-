import { uniform, Vector3 } from 'three/tsl';

export function createParameters() {
  return {
    // Tiempo y límites
    timeScale: uniform(1.0),
    maxSpeed: uniform(4.0),

    // Apariencia
    particleSize: uniform(0.025),

    // Posición del atractor
    attractor: uniform(new Vector3(0, 0, 0)),

    // Forma principal
    // 0 = Arena
    // 1 = Esfera
    sphereBlend: uniform(0.0),

    // Fuerza radial
    radialEnabled: uniform(0.0),
    radialStrength: uniform(0.0),

    // Vórtice
    vortexEnabled: uniform(0.0),
    vortexStrength: uniform(0.0),

    // Drag
    dragEnabled: uniform(0.0),
    dragCoefficient: uniform(0.08),

    // Viento
    windEnabled: uniform(0.0),
    wind: uniform(new Vector3(0, 0, 0)),

    // Velocidad inicial usada por las pruebas de inercia
    initialSpeed: uniform(0.0),

    // Kick / Beat
    beat: uniform(0.0),
    beatStrength: uniform(1.0),

    // Estática / perturbación
    staticTrigger: uniform(0.0),

    // Dirección e intensidad del viento
    // Q = -1
    // W = +1
    windDirection: uniform(1.0),

    // A/S incrementa o reduce este valor de 1 en 1
    windSpeed: uniform(0.0),

    // Nuevos estados
    mode: uniform(0.0),
    // 0 = Arena
    // 1 = Esfera
    // 2 = Círculo
    // 3 = Puntero

    crazyEnabled: uniform(0.0),
    compression: uniform(0.0),

    // Color
    colorIndex: uniform(0.0),
    colorTransition: uniform(1.0),

    // Cámara lenta
    slowMotion: uniform(0.0)
  };
}
