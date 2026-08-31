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

    const smallPoint = vec3(
      r1.sub(0.5),
      r2.sub(0.5),
      r3.sub(0.5)
    ).mul(0.35);

    const sphereDir =
      vec3(r1, r2, r3)
        .sub(0.5)
        .normalize();

    const sphere =
      sphereDir.mul(params.baseRadius);

    const circle = vec3(
      cos(angle).mul(params.circleRadius),
      sin(angle).mul(params.circleRadius),
      0.0
    );

    const scattered = vec3(
      r1.sub(0.5),
      r2.sub(0.5),
      r3.sub(0.5)
    ).mul(params.boundsSize);

    p.assign(smallPoint);

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
      p.assign(scattered);
    });

    v.assign(vec3(0.0, 0.0, 0.0));
  })().compute(count).setName('Initialize Particles');

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt
      .mul(params.timeScale)
      .mul(
        params.slowMotion
          .oneMinus()
          .mul(0.82)
          .add(0.18)
      );

    If(params.activated.greaterThan(0.5), () => {

      // =====================================================
      // ARENA — flujo ambiental (remolinos naturales)
      // =====================================================
      If(params.mode.lessThan(0.5), () => {
        const ambientFlow = vec3(
          sin(p.y.mul(1.2).add(p.z.mul(0.7))).mul(2.2),
          cos(p.x.mul(1.1).add(p.z.mul(0.8))).mul(1.8),
          sin(p.x.mul(0.8).sub(p.y.mul(1.0))).mul(2.0)
        );

        v.assign(
          mix(v, ambientFlow, 0.12)
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
        const tangent = vec3(radial.y.negate(), radial.x, 0.0);

        const radiusCorrection =
          radial
            .mul(params.circleRadius.sub(radius))
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

        const radiusError =
          distance.sub(params.pointerOrbitRadius);

        const radial =
          direction.mul(radiusError.mul(6.0));

        const orbit =
          vec3(0.0, 0.0, 1.0)
            .cross(direction)
            .mul(8.0);

        v.assign(
          mix(
            v,
            radial.add(orbit),
            0.16
          )
        );
      });

      // =====================================================
      // NEUTRO — agua calmada, sin viento, fluye muy suave
      // =====================================================
      If(params.mode.greaterThan(3.5), () => {
        const calmFlow = vec3(
          sin(p.y.mul(0.5).add(p.z.mul(0.3))).mul(0.4),
          cos(p.x.mul(0.4).add(p.z.mul(0.3))).mul(0.3),
          sin(p.x.mul(0.3).sub(p.y.mul(0.4))).mul(0.35)
        );

        v.assign(
          mix(v, calmFlow, 0.05)
        );
      });

      // =====================================================
      // KICK (B)
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
      // ONDAS (click izquierdo) — gotas en agua, hasta 4 a la vez
      // =====================================================
      const rippleForce = (origin, life) => {
        const toParticle = p.sub(origin);
        const dist = max(toParticle.length(), 0.001);
        const dir = toParticle.div(dist);

        // El anillo empieza con un radio pequeño ya visible (0.3)
        // y crece hasta ~5.8 conforme la onda se apaga.
        const ringRadius = life.oneMinus().mul(5.5).add(0.3);
        const ringWidth = 1.6;

        const diff = dist.sub(ringRadius).abs();
        const falloff = max(diff.div(ringWidth).oneMinus(), 0.0);

        return dir.mul(falloff).mul(life).mul(14.0);
      };

      v.addAssign(
        rippleForce(params.ripple0Pos, params.ripple0Life)
          .add(rippleForce(params.ripple1Pos, params.ripple1Life))
          .add(rippleForce(params.ripple2Pos, params.ripple2Life))
          .add(rippleForce(params.ripple3Pos, params.ripple3Life))
          .mul(dt)
      );

      // =====================================================
      // STATIC (N)
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
      // LOCURA (L)
      // =====================================================
      If(params.crazyTrigger.greaterThan(0.01), () => {
        const shake = vec3(
          sin(p.y.mul(9.0).add(p.z.mul(5.0))),
          cos(p.z.mul(11.0).add(p.x.mul(6.0))),
          sin(p.x.mul(10.0).add(p.y.mul(4.0)))
        );

        const pull = p.negate().mul(0.8);

        v.addAssign(
          shake.mul(9.0).add(pull)
            .mul(params.crazyTrigger)
            .mul(dt)
        );
      });

      // =====================================================
      // GRANO (jitter permanente por partícula)
      // Más suave en Neutro para que se sienta realmente calmado.
      // =====================================================
      const grainPhase = hash(instanceIndex.add(uint(101)));

      const grain = vec3(
        sin(grainPhase.mul(37.0).add(p.x.mul(3.0))),
        cos(grainPhase.mul(53.0).add(p.y.mul(3.0))),
        sin(grainPhase.mul(71.0).add(p.z.mul(3.0)))
      );

      If(params.mode.lessThan(3.5), () => {
        v.addAssign(grain.mul(0.7).mul(dt));
      });

      If(params.mode.greaterThan(3.5), () => {
        v.addAssign(grain.mul(0.12).mul(dt));
      });

      // =====================================================
      // VIENTO — todos los modos EXCEPTO Neutro
      // =====================================================
      If(params.mode.lessThan(3.5), () => {
        const windDir = vec3(
          cos(params.windAngle),
          sin(params.windAngle),
          0.0
        );

        const wind = windDir.mul(params.windSpeed).mul(3.0);

        v.addAssign(wind.mul(dt));
      });

      // =====================================================
      // COMPRESIÓN (click derecho) — hacia el punto (0,0,0)
      // =====================================================
      const compressionTarget =
        mix(p, vec3(0.0, 0.0, 0.0), params.compression);

      v.addAssign(
        compressionTarget
          .sub(p)
          .mul(14.0)
          .mul(params.compression)
          .mul(dt)
      );

      // =====================================================
      // LIBERACIÓN (al soltar click derecho) — vuelve a expandirse
      // =====================================================
      If(params.releaseBurst.greaterThan(0.01), () => {
        const dist = max(p.length(), 0.05);
        const direction = p.div(dist);

        v.addAssign(
          direction
            .mul(params.releaseBurst)
            .mul(16.0)
            .mul(dt)
        );
      });

      // =====================================================
      // CONTENCIÓN
      // =====================================================
      const distFromCenter = max(p.length(), 0.001);
      const centerNormal = p.div(distFromCenter);
      const excess = max(distFromCenter.sub(params.containmentRadius), 0.0);

      v.addAssign(
        centerNormal
          .negate()
          .mul(excess)
          .mul(3.0)
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
      // ARENA / NEUTRO WRAP
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

      If(params.mode.greaterThan(3.5), () => {
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

  const paletteColor = (index) => {
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

    return c67;
  };

  material.colorNode = Fn(() => {
    const previous = paletteColor(params.prevColorIndex);
    const current = paletteColor(params.colorIndex);

    const blended = mix(previous, current, params.colorTransition);

    return vec4(
      mix(blended, color('#ffffff'), params.flash),
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
