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

    const spawnDirection = vec3(r1, r2, r3).sub(0.5).normalize();
    const spawnRadius = r7.pow(1.0 / 3.0).mul(params.boundsSize.mul(0.45));

    p.assign(spawnDirection.mul(spawnRadius));
    v.assign(vec3(r4, r5, r6).sub(0.5).mul(params.initialSpeed));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();

    // 1) FUERZA RADIAL (CONTROLADA POR MOUSE) - Aislada para que no afecte el modo esfera
    const effectiveAttractor = mix(params.attractor, vec3(0.0), params.sphereBlend);
    const toAttractor = effectiveAttractor.sub(p);
    const distance = max(toAttractor.length(), params.softening);
    const radialDirection = toAttractor.div(distance);
    
    const radialForce = radialDirection
      .mul(params.radialStrength)
      .div(distance.pow(2))
      .mul(params.radialEnabled)
      .mul(params.sphereBlend.oneMinus()); 
      
    force.addAssign(radialForce);

    const distFromCenter = p.length();

// 2) MODO ESFERA: Bounce masivo, elástico y de largo recorrido
    const effectiveRadius = params.baseRadius.add(params.beat.mul(params.beatExpansion));
    
    If(params.sphereBlend.greaterThan(0.01), () => {
      // A. ROTATION: Inercia circular fluida
      const rotation = p.normalize().cross(vec3(0.0, 0.0, 1.0)).mul(0.6);
      force.addAssign(rotation.mul(params.sphereBlend));

      // B. KICK / EXPANSION: Impulso masivo hacia afuera al pulsar B
      const beatImpulse = p.normalize().mul(params.beat.mul(650.0));
      force.addAssign(beatImpulse.mul(params.sphereBlend));

      // C. RESORTE ELÁSTICO LARGO (Adiós al freno seco)
      // En lugar de una pared rígida, usamos una fuerza tipo Hooke muy elástica.
      // Cuanto más se alejan del radio efectivo, más fuerte es el tirón de regreso, 
      // pero con suficiente inercia para que "se pasen de largo" y respiren.
      const distanceDiff = distFromCenter.sub(effectiveRadius);
      
      // Si la distancia es mayor al radio, un resorte suave pero potente las atrae de vuelta
      If(distFromCenter.greaterThan(effectiveRadius), () => {
        const elasticPull = p.normalize().negate().mul(distanceDiff.pow(1.2).mul(350.0));
        force.addAssign(elasticPull.mul(params.sphereBlend));
      });

      // D. COMPRESIÓN ORGÁNICA: Mantiene la esfera unida pero con juego elástico
      const organicPull = p.negate().mul(distFromCenter.mul(1.5));
      force.addAssign(organicPull.mul(params.sphereBlend.oneMinus().or(params.beat.oneMinus())));
    });
    
    // 3) MODO ARENA: Onda de choque clásica independiente del mouse
    If(params.sphereBlend.lessThan(0.99), () => {
      const centerDir = p.normalize();
      const waveRadius = params.beat.mul(6.0);
      const waveBand = distFromCenter.sub(waveRadius).abs();
      const arenaShockwave = centerDir
        .mul(params.beatStrength)
        .mul(params.beat)
        .div(waveBand.add(0.2));
      force.addAssign(arenaShockwave.mul(params.sphereBlend.oneMinus()));
    });

    // 4) ESTÁTICA / ARENA (Tecla N)
    const randomScatter = vec3(
      hash(instanceIndex.add(uint(13))),
      hash(instanceIndex.add(uint(23))),
      hash(instanceIndex.add(uint(37)))
    ).sub(0.5);

    const rippleFreq = distFromCenter.mul(25.0);
    const staticEffect = randomScatter
      .mul(params.staticStrength)
      .add(radialDirection.mul(sin(rippleFreq)).mul(2.0))
      .mul(params.staticTrigger);
      
    force.addAssign(staticEffect);

    // 5) CONSTANT / WIND FORCE & VORTEX
    force.addAssign(params.wind.mul(params.windEnabled));

    const zAxis = vec3(0.0, 0.0, 1.0);
    const tangent = zAxis.cross(radialDirection);
    force.addAssign(tangent.mul(params.vortexStrength).mul(params.vortexEnabled));

    // 6) LINEAR DRAG (Mantiene la esfera limpia)
    const effectiveDrag = mix(params.dragCoefficient, params.dragCoefficient.mul(4.5), params.sphereBlend);
    force.addAssign(v.mul(effectiveDrag).mul(params.dragEnabled).mul(-1.0));

    // INTEGRATION
    v.addAssign(force.mul(dt));

    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

    p.addAssign(v.mul(dt));

    // 7) LÍMITES PERIÓDICOS (Activos en modo arena)
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
