import * as THREE from 'three/webgpu';
import {
  Fn, If, color, hash, instanceIndex, instancedArray, max, mix, mod, step, uv, vec3, vec4, sin, normalize, cross
} from 'three/tsl';

export function createSimulation({ renderer, scene, params, count = 131072 }) {
  const positionBuffer = instancedArray(count, 'vec3');
  const velocityBuffer = instancedArray(count, 'vec3');

  const initParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);
    const r = hash(i);
    
    // Distribución esférica limpia
    const phi = hash(i.add(1)).mul(Math.PI * 2);
    const costheta = hash(i.add(2)).mul(2).sub(1);
    const theta = costheta.acos();
    const radius = hash(i.add(3)).pow(1/3).mul(params.baseRadius);
    
    p.assign(vec3(
      radius.mul(theta.sin()).mul(phi.cos()),
      radius.mul(theta.sin()).mul(phi.sin()),
      radius.mul(theta.cos())
    ));
    v.assign(vec3(0));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);
    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();

    const radialDir = p.normalize();
    const dist = p.length();

    // 1. MODO ESFERA (Corregido para rotación global)
    If(params.sphereBlend.greaterThan(0.01), () => {
      // Rotación real: normal del vector de posición cruzado con un vector "arriba" dinámico
      const tangentDir = radialDir.cross(vec3(0, 1, 0)).normalize();
      const orbitalForce = tangentDir.mul(params.spinSpeed).mul(params.spinDirection);
      
      force.addAssign(orbitalForce.mul(params.sphereBlend));

      // Bounce corregido: fuerza centrífuga suave
      const beatForce = radialDir.mul(params.beat.mul(params.beatStrength));
      force.addAssign(beatForce.mul(params.sphereBlend));

      // Contención elástica (Spring back)
      const targetR = params.baseRadius.add(params.beat.mul(params.beatExpansion));
      const distErr = dist.sub(targetR);
      force.addAssign(radialDir.negate().mul(distErr).mul(20.0).mul(params.sphereBlend));
    });

    // 2. DRAG
    force.addAssign(v.mul(params.dragCoefficient).negate());

    // INTEGRACIÓN
    v.addAssign(force.mul(dt));
    // Limitar velocidad
    const vLen = v.length();
    If(vLen.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });
    
    p.addAssign(v.mul(dt));
  })().compute(count).setName('Update Particles');

  const material = new THREE.SpriteNodeMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  material.positionNode = positionBuffer.toAttribute();
  material.scaleNode = params.particleSize;
  
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.1), material, count);
  mesh.frustumCulled = false;
  scene.add(mesh);

  return { reset: () => renderer.compute(initParticles), stepSimulation: () => renderer.compute(updateParticles) };
}
