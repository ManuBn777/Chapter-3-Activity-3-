import * as THREE from 'three/webgpu';

export function createParameters() {
  return {
    // Control de tiempo y física general
    timeScale: new THREE.Uniform(1.0),
    dt: new THREE.Uniform(0.016),
    maxSpeed: new THREE.Uniform(8.0),
    initialSpeed: new THREE.Uniform(0.5),
    boundsSize: new THREE.Uniform(new THREE.Vector3(12, 12, 12)),
    
    // Configuración del Modo Esfera
    baseRadius: new THREE.Uniform(3.5),
    sphereBlend: new THREE.Uniform(1.0), // 1.0 = Esfera, 0.0 = Arena
    spinDirection: new THREE.Uniform(0.0), // Controlado por Q y W
    spinSpeed: new THREE.Uniform(1.0),     // Controlado por A y S

    // Configuración del Modo Arena / Fuerzas
    attractor: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
    softening: new THREE.Uniform(0.5),
    
    radialEnabled: new THREE.Uniform(0),
    radialStrength: new THREE.Uniform(0.0),
    
    windEnabled: new THREE.Uniform(0),
    wind: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
    
    vortexEnabled: new THREE.Uniform(0),
    vortexStrength: new THREE.Uniform(0.0),
    
    dragEnabled: new THREE.Uniform(0),
    dragCoefficient: new THREE.Uniform(0.05),

    // Efectos de botones (B y N)
    beat: new THREE.Uniform(0.0),
    beatExpansion: new THREE.Uniform(1.5),
    beatStrength: new THREE.Uniform(2.0),
    
    staticTrigger: new THREE.Uniform(0.0),
    staticStrength: new THREE.Uniform(1.0),

    // Apariencia visual
    particleSize: new THREE.Uniform(0.08)
  };
}
