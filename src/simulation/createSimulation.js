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
  sin
} from 'three/tsl';

export function createSimulation({
  renderer,
  scene,
  params,
  count = 131072
}) {

  // ============================================================
  // BUFFERS (Storage Buffers en GPU)
  // ============================================================

  const positionBuffer = instancedArray(count, 'vec3');
  const velocityBuffer = instancedArray(count, 'vec3');

  // ============================================================
  // INITIALIZE COMPUTATION
  // ============================================================

  const initParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);

    const r1 = hash(i.add(11));
    const r2 = hash(i.add(23));
    const r3 = hash(i.add(37));
    const r4 = hash(i.add(53));
    const r5 = hash(i.add(71));
    const r6 = hash(i.add(89));
    const r7 = hash(i.add(107));

    const direction = vec3(r1, r2, r3).sub(0.5).normalize();
    const radius = r7.pow(1.0 / 3.0).mul(params.baseRadius.mul(0.95));

    p.assign(direction.mul(radius));
    v.assign(vec3(r4, r5, r6).sub(0.5).mul(params.initialSpeed));

  })().compute(count).setName('Initialize Particles');

  // ============================================================
  // UPDATE COMPUTATION
  // ============================================================

  const updateParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);

    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();

    const dist = max(p.length(), 0.001);
    const normal = p.div(dist);

    // 1. Movimiento interno (esfera)
    const internalFlow = vec3(
      p.y.negate(),
      p.x,
      sin(p.z.mul(2.7))
    ).mul(0.18);

    force.addAssign(internalFlow.mul(params.sphereBlend));

    // 2. Flujo de profundidad
    const depthFlow = vec3(
      sin(p.y.mul(2.1)),
      sin(p.z.mul(1.7)),
      sin(p.x.mul(2.4))
    ).mul(0.10);

    force.addAssign(depthFlow.mul(params.sphereBlend));

    // 3. B — Thump / Pulso
    If(params.beat.greaterThan(0.001), () => {
      const kickScale = vec3(1.0).add(params.beat.mul(params.kickAmount));
      p.assign(p.mul(mix(vec3(1.0), kickScale, params.sphereBlend)));
    });

    // 4. Contención suave
    const maxRadius = params.baseRadius.mul(1.15);
    If(dist.greaterThan(maxRadius), () => {
      const excess = dist.sub(maxRadius);
      force.subAssign(normal.mul(excess.mul(4.0)));
    });

    // 5. Integración
    v.addAssign(force.mul(dt));
    v.assign(v.mul(0.98)); // Drag

    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

    p.addAssign(v.mul(dt));

  })().compute(count).setName('Update Particles');

  // ============================================================
  // RENDER MESH SETUP
  // ============================================================

  const particleMaterial = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // Vincular directamente el buffer de posición de la GPU al material
  particleMaterial.positionNode = positionBuffer.element(instanceIndex);
  particleMaterial.scaleNode = params.particleSize;

  particleMaterial.colorNode = mix(
    color('#4fc3f7'),
    color('#ff8a80'),
    velocityBuffer.element(instanceIndex).length().div(params.maxSpeed)
  );

  const particleMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    particleMaterial,
    count
  );

  scene.add(particleMesh);

  // Ejecutar la inicialización inmediatamente en la GPU
  renderer.compute(initParticles);

  // ============================================================
  // API PUBLIC
  // ============================================================

  return {
    reset() {
      renderer.compute(initParticles);
    },
    stepSimulation() {
      renderer.compute(updateParticles);
    }
  };
}
