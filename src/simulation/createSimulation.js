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

    // Distribución esférica volumétrica 3D inicial
    const dir = vec3(r1, r2, r3).sub(0.5).normalize();
    const radius = r7.pow(1.0 / 3.0).mul(params.baseRadius);

    p.assign(dir.mul(radius));
    v.assign(vec3(r4, r5, r6).sub(0.5).mul(params.initialSpeed));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();
    const distFromCenter = p.length();

    // ==========================================
    // 1) MODO ESFERA (Inercia sutil y volumen 3D)
    // ==========================================
    If(params.sphereBlend.greaterThan(0.01), () => {
      const sphereFlow = vec3(
        sin(p.y.mul(1.5)),
        sin(p.z.mul(1.5)),
        sin(p.x.mul(1.5))
      ).mul(1.2);
      force.addAssign(sphereFlow.mul(params.sphereBlend));

      // Amortiguación ligera en el modo esfera
      force.addAssign(v.mul(-0.4).mul(params.sphereBlend));
    });

    // ==========================================
    // 2) MODO ARENA (Comportamiento fluido original)
    // ==========================================
    If(params.sphereBlend.lessThan(0.99), () => {
      const effectiveAttractor = params.attractor;
      const toAttractor = effectiveAttractor.sub(p);
      const distance = max(toAttractor.length(), params.softening);
      const radialDirection = toAttractor.div(distance);
      
      const radialForce = radialDirection
        .mul(params.radialStrength)
        .div(distance.pow(2))
        .mul(params.radialEnabled);
        
      force.addAssign(radialForce.mul(params.sphereBlend.oneMinus()));

      force.addAssign(params.wind.mul(params.windEnabled).mul(params.sphereBlend.oneMinus()));

      const zAxis = vec3(0.0, 0.0, 1.0);
      const tangent = zAxis.cross(radialDirection);
      force.addAssign(tangent.mul(params.vortexStrength).mul(params.vortexEnabled).mul(params.sphereBlend.oneMinus()));

      force.addAssign(v.mul(params.dragCoefficient).mul(params.dragEnabled).mul(-1.0).mul(params.sphereBlend.oneMinus()));
    });

    // ==========================================
    // 3) BOTÓN B: KICK / SHOCKWAVE (Diferenciado por modo)
    // ==========================================
    If(params.beat.greaterThan(0.01), () => {
      const centerDir = p.normalize();

      // Kick exclusivo para MODO ESFERA: Expansión hacia fuera pura sin compresión posterior
      If(params.sphereBlend.greaterThan(0.5), () => {
        const sphereShockwave = centerDir
          .mul(params.beatStrength)
          .mul(params.beat)
          .mul(30.0)
          .div(distFromCenter.sub(params.beat.mul(15.0)).abs().add(0.2));
        
        force.addAssign(sphereShockwave.mul(params.sphereBlend));
        v.addAssign(centerDir.mul(params.beat.mul(params.beatStrength).mul(50.0)).mul(params.sphereBlend));
      });

      // Kick exclusivo para MODO ARENA: Onda de choque elástica original
      If(params.sphereBlend.lessThan(0.5), () => {
        const waveRadius = params.beat.mul(25.0);
        const waveBand = distFromCenter.sub(waveRadius).abs();
        const arenaShockwave = centerDir
          .mul(params.beatStrength)
          .mul(params.beat)
          .mul(20.0)
          .div(waveBand.add(0.1));
        
        force.addAssign(arenaShockwave.mul(params.sphereBlend.oneMinus()));
      });
    });

    // ==========================================
    // 4) BOTÓN N: ESTÁTICA / DISPERSIÓN
    // ==========================================
    If(params.staticTrigger.greaterThan(0.01), () => {
      const randomScatter = vec3(
        hash(instanceIndex.add(uint(13))),
        hash(instanceIndex.add(uint(23))),
        hash(instanceIndex.add(uint(37)))
      ).sub(0.5).mul(3.0);

      const staticEffect = randomScatter.mul(params.staticStrength).mul(params.staticTrigger);
      force.addAssign(staticEffect);
    });

    // ==========================================
    // INTEGRACIÓN Y LÍMITES
    // ==========================================
    v.addAssign(force.mul(dt));

    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

    p.addAssign(v.mul(dt));

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
