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
    const r4 = hash(i.add(uint(53)));
    const r5 = hash(i.add(uint(71)));
    const r6 = hash(i.add(uint(89)));
    const r7 = hash(i.add(uint(107)));

    // Distribución esférica volumétrica inicial en 3D
    const dir = vec3(r1, r2, r3).sub(0.5).normalize();
    const radius = r7.pow(1.0 / 3.0).mul(params.baseRadius);

    p.assign(dir.mul(radius));
    // Velocidad inicial suave para que comiencen a moverse de inmediato
    v.assign(vec3(r4, r5, r6).sub(0.5).mul(params.initialSpeed));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();

    const distFromCenter = p.length();

    // MODO ESFERA CON MOVIMIENTO INTERNO FLUIDO
    If(params.sphereBlend.greaterThan(0.01), () => {
      
      // 1. FLUJO INTERNO TRIDIMENSIONAL (Movimiento orgánico tipo fluido dentro de la esfera)
      const internalFlow = vec3(
        sin(p.y.mul(2.0)),
        sin(p.z.mul(2.0)),
        sin(p.x.mul(2.0))
      ).mul(1.5);
      force.addAssign(internalFlow.mul(params.sphereBlend));

      // 2. IMPULSO DEL BEAT (Expansión dinámica cuando se activa)
      If(params.beat.greaterThan(0.01), () => {
        const beatImpulse = p.normalize().mul(params.beat.mul(params.beatExpansion));
        force.addAssign(beatImpulse.mul(params.sphereBlend));
      });

      // 3. CONTENCIÓN SUAVE (Fuerza elástica de rebote que evita que salgan de la esfera)
      If(distFromCenter.greaterThan(params.baseRadius), () => {
        const diff = distFromCenter.sub(params.baseRadius);
        // Empuja hacia el centro y frena la velocidad hacia afuera para crear un rebote suave
        force.addAssign(p.normalize().negate().mul(diff.mul(80.0)).mul(params.sphereBlend));
        v.assign(v.mul(0.85)); // Amortiguación en el borde
      });

      // 4. FRICCIÓN LEVE (Permite que floten con inercia sin acelerarse infinitamente)
      force.addAssign(v.mul(-0.8).mul(params.sphereBlend));
    });

    // MODO ARENA (Comportamiento alternativo cuando sphereBlend es 0)
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

    // Limitar la velocidad máxima para mantener estabilidad
    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

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
