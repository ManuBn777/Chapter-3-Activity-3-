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

    const angle = r1.mul(6.28318530718);

    const arena = vec3(
      r1.sub(0.5).mul(8.0),
      r2.sub(0.5).mul(5.0),
      r3.sub(0.5).mul(6.0)
    );

    const sphereDir =
      vec3(r1, r2, r3)
        .sub(0.5)
        .normalize();

    const sphere =
      sphereDir.mul(params.baseRadius);

    const circle = vec3(
      cos(angle).mul(params.baseRadius),
      sin(angle).mul(params.baseRadius),
      0.0
    );

    p.assign(arena);

    If(params.mode.greaterThan(0.5).and(params.mode.lessThan(1.5)), () => {
      p.assign(sphere);
    });

    If(params.mode.greaterThan(1.5).and(params.mode.lessThan(2.5)), () => {
      p.assign(circle);
    });

    If(params.mode.greaterThan(2.5).and(params.mode.lessThan(3.5)), () => {
      p.assign(sphere.mul(0.8));
    });

    If(params.mode.greaterThan(3.5), () => {
      p.assign(sphere.mul(0.9));
    });

    // Estado idle: todas las partículas nacen completamente quietas.
    // No se mueve nada hasta la primera interacción (params.activated).
    v.assign(vec3(0.0, 0.0, 0.0));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt
      .mul(params.timeScale)
      .mul(
        params.slowMotion
          .mul(0.25)
          .oneMinus()
          .add(0.25)
      );

    // =======================================================
    // ESTADO IDLE
    // =======================================================
    If(params.activated.greaterThan(0.5), () => {

      // =====================================================
      // ARENA
      // =====================================================
      If(params.mode.lessThan(0.5), () => {
        const flow = vec3(
          sin(p.y.mul(1.2).add(p.z.mul(0.7))).mul(3.5),
          cos(p.x.mul(1.1).add(p.z.mul(0.8))).mul(2.5),
          sin(p.x.mul(0.8).sub(p.y.mul(1.0))).mul(3.0)
        );

        const wind = vec3(
          params.windDirection
            .mul(params.windSpeed)
            .mul(2.5),
          0.0,
          0.0
        );

        v.assign(
          mix(
            v,
            flow.add(wind),
            0.18
          )
        );
      });

      // =====================================================
      // ESFERA
      // =====================================================
      If(params.mode.greaterThan(0.5).and(params.mode.lessThan(1.5)), () => {
        const radius = max(p.length(), 0.001);
        const normal = p.div(radius);
        const radiusError = radius.sub(params.baseRadius);

        const radialCorrection =
          normal
            .mul(radiusError.negate())
            .mul(12.0);

        const tangent =
          vec3(0.0, 1.0, 0.0)
            .cross(normal)
            .mul(5.0);

        const surfaceFlow = vec3(
          sin(p.y.mul(2.0)).mul(0.8),
          cos(p.z.mul(2.0)).mul(0.8),
          sin(p.x.mul(2.0)).mul(0.8)
        );

        v.assign(
          mix(
            v,
            radialCorrection
              .add(tangent)
              .add(surfaceFlow),
            0.22
          )
        );

        v.addAssign(
          normal
            .mul(params.beat)
            .mul(params.beatStrength)
            .mul(18.0)
            .mul(dt)
        );
      });

      // =====================================================
      // CÍRCULO
      // =====================================================
      If(params.mode.greaterThan(1.5).and(params.mode.lessThan(2.5)), () => {
        const xy = vec3(p.x, p.y, 0.0);
        const radius = max(xy.length(), 0.001);
        const radial = xy.div(radius);

        // FIX: -radial.y (operador JS) daba NaN en el shader.
        // Los nodos TSL necesitan .negate(), no el "-" nativo de JS.
        const tangent = vec3(radial.y.negate(), radial.x, 0.0);

        const radiusCorrection =
          radial
            .mul(params.baseRadius.sub(radius))
            .mul(18.0);

        const circleVelocity =
          tangent.mul(5.5);

        v.assign(
          mix(
            v,
            radiusCorrection.add(circleVelocity),
            0.25
          )
        );

        const spikes =
          sin(
            p.x.mul(8.0)
              .add(p.y.mul(7.0))
          )
            .abs();

        v.addAssign(
          radial
            .mul(spikes)
            .mul(params.beat)
            .mul(params.beatStrength)
            .mul(25.0)
            .mul(dt)
        );

        v.z.assign(v.z.mul(0.05));
      });

      // =====================================================
      // PUNTERO
      // =====================================================
      If(params.mode.greaterThan(2.5).and(params.mode.lessThan(3.5)), () => {
        const toPointer =
          params.attractor.sub(p);

        const distance =
          max(toPointer.length(), 0.05);

        const direction =
          toPointer.div(distance);

        const orbit =
          vec3(0.0, 0.0, 1.0)
            .cross(direction);

        const pointerFlow =
          direction
            .mul(distance.mul(3.5).clamp(0.0, 10.0))
            .add(orbit.mul(7.0));

        v.assign(
          mix(
            v,
            pointerFlow,
            0.18
          )
        );
      });

      // =====================================================
      // LOCAS
      // =====================================================
      If(params.mode.greaterThan(3.5), () => {
        const chaos = vec3(
          sin(p.y.mul(6.0).add(p.z.mul(2.0))),
          cos(p.z.mul(7.0).add(p.x.mul(1.5))),
          sin(p.x.mul(8.0).add(p.y.mul(1.3)))
        );

        // FIX: mismo problema, -p.y (operador JS) daba NaN.
        const swirl =
          vec3(p.y.negate(), p.x, sin(p.z.mul(3.0)))
            .mul(1.5);

        v.assign(
          mix(
            v,
            chaos.mul(8.0).add(swirl),
            0.15
          )
        );
      });

      // =====================================================
      // KICK
      // =====================================================
      If(params.beat.greaterThan(0.01), () => {
        const direction = p.normalize();

        v.addAssign(
          direction
            .mul(params.beat)
            .mul(params.beatStrength)
            .mul(14.0)
            .mul(dt)
        );
      });

      // =====================================================
      // STATIC
      // =====================================================
      If(params.staticTrigger.greaterThan(0.01), () => {
        const random = vec3(
          hash(instanceIndex.add(uint(13))),
          hash(instanceIndex.add(uint(23))),
          hash(instanceIndex.add(uint(37)))
        )
          .sub(0.5);

        v.addAssign(
          random
            .mul(params.staticStrength)
            .mul(params.staticTrigger)
            .mul(dt)
        );
      });

      // =====================================================
      // COMPRESIÓN
      // =====================================================
      const compressionTarget =
        p.mul(
          mix(
            1.0,
            0.18,
            params.compression
          )
        );

      v.addAssign(
        compressionTarget
          .sub(p)
          .mul(12.0)
          .mul(params.compression)
          .mul(dt)
      );

      // =====================================================
      // SPEED LIMIT
      // =====================================================
      const speed = v.length();

      If(speed.greaterThan(params.maxSpeed), () => {
        v.assign(
          v.normalize().mul(params.maxSpeed)
        );
      });

      // =====================================================
      // POSITION
      // =====================================================
      p.addAssign(v.mul(dt));

      // =====================================================
      // ARENA WRAP
      // =====================================================
      If(params.mode.lessThan(0.5), () => {
        const half = params.boundsSize.mul(0.5);

        p.assign(
          p
            .add(half)
            .mod(params.boundsSize)
            .sub(half)
        );
      });
    });
  })().compute(count).setName('Update Particles');

  // =========================================================
  // MATERIAL
  // =========================================================

  const material = new THREE.SpriteNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  material.positionNode =
    positionBuffer.toAttribute();

  material.scaleNode =
    params.particleSize;

  material.colorNode = Fn(() => {
    const index = params.colorIndex;

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

    return vec4(
      mix(c67, color('#ffffff'), params.flash),
      1.0
    );
  })();

  material.opacityNode =
    step(
      uv().xy.sub(0.5).length(),
      0.5
    );

  const geometry =
    new THREE.PlaneGeometry(1, 1);

  const mesh =
    new THREE.InstancedMesh(
      geometry,
      material,
      count
    );

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
