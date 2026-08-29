import { uniform, Vector3 } from 'three/tsl';

export function createParameters() {
  return {
    // =========================================================
    // TIEMPO
    // =========================================================

    // Paso fijo de simulación.
    dt: uniform(1.0 / 60.0),

    // Multiplicador general del tiempo.
    timeScale: uniform(1.0),

    // Velocidad máxima de una partícula.
    maxSpeed: uniform(4.0),

    // =========================================================
    // APARIENCIA
    // =========================================================

    particleSize: uniform(0.025),

    // =========================================================
    // POSICIÓN DEL ATRACTOR / PUNTERO
    // =========================================================

    attractor: uniform(new Vector3(0, 0, 0)),

    // =========================================================
    // GEOMETRÍA
    // =========================================================

    // 0 = Arena
    // 1 = Esfera
    sphereBlend: uniform(0.0),

    // Radio base utilizado por la esfera.
    baseRadius: uniform(3.0),

    // Expansión de la esfera durante el kick.
    beatExpansion: uniform(0.8),

    // =========================================================
    // FUERZA RADIAL
    // =========================================================

    radialEnabled: uniform(0.0),
    radialStrength: uniform(0.0),

    // Evita singularidades cuando una partícula está
    // demasiado cerca del atractor.
    softening: uniform(0.15),

    // =========================================================
    // VÓRTICE
    // =========================================================

    vortexEnabled: uniform(0.0),
    vortexStrength: uniform(0.0),

    // =========================================================
    // DRAG
    // =========================================================

    dragEnabled: uniform(0.0),
    dragCoefficient: uniform(0.08),

    // =========================================================
    // VIENTO
    // =========================================================

    windEnabled: uniform(0.0),

    // Vector real utilizado por la simulación.
    wind: uniform(new Vector3(0, 0, 0)),

    // Dirección conceptual del viento.
    // -1 = izquierda
    // +1 = derecha
    windDirection: uniform(1.0),

    // Intensidad discreta controlada por A/S.
    // 0, 1, 2, 3, 4, 5...
    windSpeed: uniform(0.0),

    // =========================================================
    // INERCIA
    // =========================================================

    initialSpeed: uniform(0.0),

    // =========================================================
    // KICK / BEAT
    // =========================================================

    beat: uniform(0.0),
    beatStrength: uniform(1.0),

    // =========================================================
    // ESTÁTICA
    // =========================================================

    staticTrigger: uniform(0.0),
    staticStrength: uniform(3.0),

    // =========================================================
    // LÍMITES DE ARENA
    // =========================================================

    boundsSize: uniform(new Vector3(8.0, 5.0, 6.0)),

    // =========================================================
    // COMPATIBILIDAD CON LA INTERFAZ ACTUAL
    // =========================================================
    //
    // Estos dos parámetros todavía existen porque el panel actual
    // los utiliza. Más adelante los eliminaremos/reutilizaremos
    // cuando reconstruyamos la interfaz.

    spinDirection: uniform(0.0),
    spinSpeed: uniform(0.0),

    // =========================================================
    // MODOS
    // =========================================================

    // 0 = Idle / Arena base
    // 1 = Esfera
    // 2 = Círculo
    // 3 = Puntero
    mode: uniform(0.0),

    // =========================================================
    // EFECTOS FUTUROS
    // =========================================================

    crazyEnabled: uniform(0.0),

    // 0 = sin compresión
    // 1 = compresión completa
    compression: uniform(0.0),

    // =========================================================
    // COLOR
    // =========================================================

    // Índice de color dentro de la rueda cromática.
    colorIndex: uniform(0.0),

    // Progreso de transición.
    colorTransition: uniform(1.0),

    // =========================================================
    // CÁMARA LENTA
    // =========================================================

    slowMotion: uniform(0.0)
  };
}
