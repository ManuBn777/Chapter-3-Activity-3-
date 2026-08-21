import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  color,
  hash,
  instanceIndex,
  instancedArray,
  max,
  mix,
  mod,
  step,
  uint,
  uv,
  vec3,
  vec4,
  sin
} from 'three/tsl';

export function createSimulation({ renderer, scene, params, count = 131072 }) {
  const positionBuffer = instancedArray(count, 'vec3');
  const velocityBuffer = instancedArray(count, 'vec3');

  const initParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);

    const r1 = hash(i.add(uint(11)));
    const r2 = hash(i.add(uint(23)));
    const r3 = hash(i.add(uint(37)));
    const r7 = hash(i.add(uint(107)));

    // Distribución esférica volumétrica real en 3D (rellena todo el volumen interior)
    const dir = vec3(r1, r2, r3).sub(0.5).normalize();
    const radius = r7.pow(1.0 / 3.0).mul(params.baseRadius);

    p.assign(dir.mul(radius));
    v.assign(vec3(0.0)); // Velocidad inicial absolutamente en cero (quieta)
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();

    const distFromCenter = p.length();

    // MODO ESFERA QUIETA Y ESTÁTICA
    If(params.sphereBlend.greaterThan(0.01), () => {
      
      // 1. Si se pulsa el beat, da un pequeño impulso de expansión hacia afuera y regresa
      If(params.beat.greaterThan(0.01), () => {
        const beatImpulse = p.normalize().mul(params.beat.mul(params.beatExpansion));
        force.addAssign(beatImpulse.mul(params.sphereBlend));
      });

      // 2. Mantener la estructura esférica firme sin dejar que las partículas se dispersen
      If(distFromCenter.greaterThan(params.baseRadius), () => {
        const diff = distFromCenter.sub(params.baseRadius);
        force.addAssign(p.normalize().negate().mul(diff.mul(100.0)).mul(params.sphereBlend));
      });

      // 3. Fricción total altísima para anular cualquier inercia residual (mantiene la esfera totalmente quieta)
      force.addAssign(v.mul(-25.0).mul(params.sphereBlend));
    });

    // MODO ARENA (Comportamiento dinámico alternativo cuando sphereBlend es 0)
    If(params.sphereBlend.lessThan(0.99), () => {
      const centerDir = p.normalize();
      const waveRadius = params.beat.mul(6.0);
      const waveBand = distFromCenter.sub(waveRadius).abs();
      const arenaShockwave = centerDir
        .mul(params.beatStrength)
        .mul(params.beat)
        .div(waveBand.add(0.2));
      force.addAssign(arenaShockwave.mul(params.sphereBlend.oneMinus()));

      force.addAssign(params.wind.mul(params.windEnabled));
      force.addAssign(v.mul(params.dragCoefficient).mul(-1.0));
    });

    // Integración de movimiento
    v.addAssign(force.mul(dt));
    p.addAssign(v.mul(dt));

    // Límites periódicos solo en modo arena
    const half = params.boundsSize.mul(0.5);
    const wrappedPos = mod(p.add(half), params.boundsSize).sub(half);
    p.assign(mix(wrappedPos, p, params.sphereBlend));

  })().compute(count).setName('Update Particles');

  const material = new THREE.SpriteNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  material.positionNode = positionBuffer.toAttribute();
  material.scaleNode = params.particleSize;

  material.colorNode = Fn(() => {
    const speed = velocityBuffer.toAttribute().length();
    const t = speed.div(params.maxSpeed).clamp(0.0, 1.0);
    const slow = color('#46a6ff');
    const fast = color('#ffb35a');
    return vec4(mix(slow, fast, t), 1.0);
  })();

  material.opacityNode = step(uv().xy.sub(0.5).length(), 0.5);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  scene.add(mesh);

  function reset() {
    renderer.compute(initParticles);
  }

  function stepSimulation() {
    renderer.compute(updateParticles);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    scene.remove(mesh);
  }

  return {
    count,
    positionBuffer,
    velocityBuffer,
    reset,
    stepSimulation,
    dispose
  };
}
