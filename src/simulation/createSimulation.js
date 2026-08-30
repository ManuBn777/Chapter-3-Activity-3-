import * as THREE from 'three/webgpu';
import { Fn, If, color, hash, instanceIndex, instancedArray, max, mix, step, uint, uv, vec3, vec4, sin, cos } from 'three/tsl';

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
    const dir = vec3(r1, r2, r3).sub(0.5).normalize();
    const radius = r7.pow(1.0 / 3.0).mul(params.baseRadius);
    p.assign(dir.mul(radius));
    v.assign(vec3(r4, r5, r6).sub(0.5).mul(params.initialSpeed));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);
    const dt = params.dt.mul(params.timeScale).mul(params.slowMotion.oneMinus().mul(0.75).add(0.25));
    const force = vec3(0.0).toVar();
    const dist = max(p.length(), 0.001);

    // ARENA: centered particle field and direct wind control.
    If(params.mode.lessThan(0.5), () => {
      force.addAssign(p.negate().mul(0.7));
      const speed = params.windSpeed.clamp(0.0, 10.0);
      const targetX = params.windDirection.mul(speed.mul(3.0));
      const targetVelocity = vec3(targetX, 0.0, 0.0);
      force.addAssign(targetVelocity.sub(v).mul(30.0).mul(params.windEnabled));
      force.addAssign(vec3(v.x.mul(-30.0), 0.0, 0.0).mul(step(0.001, speed).oneMinus()));
      force.addAssign(v.mul(-0.05));
    });

    // ESFERA: centered spherical shell.
    If(params.mode.greaterThan(0.5).and(params.mode.lessThan(1.5)), () => {
      const targetRadius = params.baseRadius.add(params.beat.mul(params.beatExpansion));
      const normal = p.normalize();
      const radialError = dist.sub(targetRadius);
      force.addAssign(normal.mul(radialError.negate()).mul(14.0));
      force.addAssign(vec3(0.0, 1.0, 0.0).cross(p).mul(1.8));
      force.addAssign(normal.mul(sin(p.y.mul(3.0)).mul(1.2)));
      force.addAssign(v.mul(-0.8));
    });

    // CIRCULO: centered ring on XY plane.
    If(params.mode.greaterThan(1.5).and(params.mode.lessThan(2.5)), () => {
      const radius2D = max(vec3(p.x, p.y, 0.0).length(), 0.001);
      const radial = vec3(p.x, p.y, 0.0).div(radius2D);
      const circleRadius = params.baseRadius.add(params.beat.mul(0.7));
      const radialError = radius2D.sub(circleRadius);
      force.addAssign(radial.mul(radialError.negate()).mul(18.0));
      force.addAssign(vec3(0.0, 0.0, p.z.negate()).mul(12.0));
      force.addAssign(vec3(-radial.y, radial.x, 0.0).mul(3.0));
      const spikes = sin(p.x.mul(7.0).add(p.y.mul(5.0))).abs();
      force.addAssign(radial.mul(spikes).mul(params.beat).mul(28.0));
      force.addAssign(v.mul(-1.0));
    });

    // PUNTERO: follow pointer and orbit around it.
    If(params.mode.greaterThan(2.5).and(params.mode.lessThan(3.5)), () => {
      const toPointer = params.attractor.sub(p);
      const d = max(toPointer.length(), 0.12);
      const dir = toPointer.div(d);
      const orbitDir = vec3(0.0, 0.0, 1.0).cross(dir);
      force.addAssign(dir.mul(12.0));
      force.addAssign(orbitDir.mul(8.0));
      force.addAssign(v.mul(-0.55));
    });

    // LOCAS: chaotic movement.
    If(params.mode.greaterThan(3.5), () => {
      const t = params.beat.mul(8.0);
      const chaos = vec3(
        sin(p.y.mul(8.0).add(t)),
        cos(p.z.mul(9.0).add(t.mul(1.3))),
        sin(p.x.mul(7.0).sub(t))
      );
      force.addAssign(chaos.mul(12.0));
      force.addAssign(p.negate().mul(0.45));
      force.addAssign(v.mul(-0.12));
    });

    // KICK: radial shockwave. In circle mode this deforms the ring.
    If(params.beat.greaterThan(0.01), () => {
      const centerDir = p.normalize();
      const waveRadius = params.beat.mul(7.0);
      const waveBand = dist.sub(waveRadius).abs();
      force.addAssign(centerDir.mul(params.beatStrength).mul(params.beat).div(waveBand.add(0.2)).mul(6.0));
    });

    // STATIC.
    If(params.staticTrigger.greaterThan(0.01), () => {
      const randomScatter = vec3(
        hash(instanceIndex.add(uint(13))),
        hash(instanceIndex.add(uint(23))),
        hash(instanceIndex.add(uint(37)))
      ).sub(0.5).mul(3.0);
      force.addAssign(randomScatter.mul(params.staticStrength).mul(params.staticTrigger));
    });

    // CRAZY effect can also be toggled independently.
    If(params.crazyEnabled.greaterThan(0.5), () => {
      const crazy = vec3(sin(p.y.mul(8.0)), cos(p.z.mul(9.0)), sin(p.x.mul(7.0)));
      force.addAssign(crazy.mul(14.0));
    });

    // Compression is handled as a temporary radial scale.
    const compressionScale = mix(1.0, 0.18, params.compression);
    p.mulAssign(compressionScale);

    v.addAssign(force.mul(dt));

    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

    p.addAssign(v.mul(dt));

    // Arena wraps. Other modes remain centered around the origin/pointer.
    const half = params.boundsSize.mul(0.5);
    const wrapped = p.add(half).mod(params.boundsSize).sub(half);
    If(params.mode.lessThan(0.5), () => {
      p.assign(wrapped);
    });
  })().compute(count).setName('Update Particles');

  const material = new THREE.SpriteNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  material.positionNode = positionBuffer.toAttribute();
  material.scaleNode = params.particleSize;

  material.colorNode = Fn(() => {
    const index = params.colorIndex;
    const t = params.colorTransition;
    const c0 = color('#ff365e');
    const c1 = color('#ff8a32');
    const c2 = color('#ffe14a');
    const c3 = color('#45e06f');
    const c4 = color('#36d9ff');
    const c5 = color('#4f75ff');
    const c6 = color('#9b5cff');
    const c7 = color('#ff4fd8');
    const c01 = mix(c0, c1, step(0.5, index));
    const c12 = mix(c01, c2, step(1.5, index));
    const c23 = mix(c12, c3, step(2.5, index));
    const c34 = mix(c23, c4, step(3.5, index));
    const c45 = mix(c34, c5, step(4.5, index));
    const c56 = mix(c45, c6, step(5.5, index));
    const c67 = mix(c56, c7, step(6.5, index));
    const flashColor = mix(c67, color('#ffffff'), params.flash);
    return vec4(mix(c67, flashColor, t), 1.0);
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

  return { count, positionBuffer, velocityBuffer, reset, stepSimulation, dispose };
}
