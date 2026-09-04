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
      // ESFERA — con selector de forma (sphereShape) y rotación
      // (sphereRotation, J/K). Se rota el punto de muestreo antes
      // de evaluar la forma, así el mundo ve la figura girada.
      // =====================================================
      If(params.mode.greaterThan(0.5).and(params.mode.lessThan(1.5)), () => {
        const euclidLen = max(p.length(), 0.001);
        const normal = p.div(euclidLen);

        const rc = cos(params.sphereRotation);
        const rs = sin(params.sphereRotation);
        const rx = p.x.mul(rc).sub(p.z.mul(rs));
        const rz = p.x.mul(rs).add(p.z.mul(rc));
        const ry = p.y;

        const cubeDist = max(max(rx.abs(), ry.abs()), rz.abs());
        const diamondDist = rx.abs().add(ry.abs()).add(rz.abs());

        // Pirámide: punta hacia +Y (arriba en pantalla), base hacia
        // -Y. Antes usaba Z (hacia la cámara) — por eso no se veía
        // como pirámide, la punta apuntaba directo a ti.
        const widthScale =
          params.baseRadius.sub(ry).div(params.baseRadius.mul(2.0));

        const squareXZ = max(rx.abs(), rz.abs());

        const pyramidDist = max(
          squareXZ.div(max(widthScale, 0.04)),
          ry.abs()
        );

        const s = params.sphereShape;
        const d01 = mix(euclidLen, diamondDist, step(0.5, s));
        const d12 = mix(d01, cubeDist, step(1.5, s));
        const shapeDist = mix(d12, pyramidDist, step(2.5, s));

        const radiusError = shapeDist.sub(params.baseRadius);

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
      });
      // =====================================================
      // CÍRCULO — anillo liso, respira con el Kick (resorte)
      // =====================================================
      If(params.mode.greaterThan(1.5).and(params.mode.lessThan(2.5)), () => {
        const xy = vec3(p.x, p.y, 0.0);
        const radius = max(xy.length(), 0.001);
        const radial = xy.div(radius);
        const tangent = vec3(radial.y.negate(), radial.x, 0.0);

        const organicWobble = sin(p.x.mul(3.0).add(p.y.mul(2.0)))
          .add(sin(p.x.mul(5.3).sub(p.y.mul(4.1))).mul(0.25));

        const effectiveRadius = params.circleRadius
          .add(params.circleExpansion.mul(2.0))
          .add(organicWobble.mul(params.circleExpansion).mul(0.55));

        const radiusCorrection =
          radial
            .mul(effectiveRadius.sub(radius))
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

        const personalPhase =
          hash(instanceIndex.add(uint(613)));

        const radiusVariance =
          hash(instanceIndex.add(uint(509)))
            .sub(0.5)
            .mul(params.pointerOrbitVariance);

        const targetRadius =
          params.pointerOrbitRadius.add(radiusVariance);

        const radiusError =
          distance.sub(targetRadius);

        const normalRadial =
          direction.mul(radiusError.mul(20.0));

        const normalOrbit =
          vec3(0.0, 0.0, 1.0)
            .cross(direction)
            .mul(6.0);

        const normalFollow =
          mix(0.85, 0.45, personalPhase);

 // --- Comportamiento ARRASTRADO (manteniendo click) ---
        // Dirección aleatoria normalizada (esfera, no cubo) + radio
        // con caída hacia el centro (más denso ahí, como una gota
        // real de tinta/humo).
        const dragDir = vec3(
          hash(instanceIndex.add(uint(701))).sub(0.5),
          hash(instanceIndex.add(uint(811))).sub(0.5),
          hash(instanceIndex.add(uint(919))).sub(0.5)
        ).normalize();

        const dragRadiusSeed = hash(instanceIndex.add(uint(1013)));
        const dragRadius = dragRadiusSeed.mul(2.6);

        // Oscilación suave y continua, distinta por partícula — usa
        // la posición actual (siempre cambiando) como "reloj"
        // implícito, así nunca se congela ni necesita un uniform de
        // tiempo aparte.
        const wobblePhase =
          personalPhase.mul(37.0).add(p.length().mul(1.4));

        const wobble = vec3(
          sin(wobblePhase),
          cos(wobblePhase.mul(1.3)),
          sin(wobblePhase.mul(0.7))
        ).mul(0.55);

        const personalOffset =
          dragDir.mul(dragRadius).add(wobble);

        const dragTargetPos =
          params.attractor.add(personalOffset);

        const toDragTarget =
          dragTargetPos.sub(p);

        const dragDist =
          max(toDragTarget.length(), 0.05);

        const dragDir =
          toDragTarget.div(dragDist);

        const dragPull =
          dragDir.mul(dragDist.mul(7.0));

        const dragOrbit =
          vec3(0.0, 0.0, 1.0)
            .cross(dragDir)
            .mul(5.5);

        const dragFollow =
          mix(0.6, 0.3, personalPhase);

        const kickOutward =
          direction
            .negate()
            .mul(params.beat)
            .mul(params.beatStrength)
            .mul(35.0);

        const blendedVelocity = mix(
          normalRadial.add(normalOrbit).add(kickOutward),
          dragPull.add(dragOrbit).add(kickOutward),
          params.pointerDragAmount
        );

        const blendedFollow = mix(
          normalFollow,
          dragFollow,
          params.pointerDragAmount
        );

        v.assign(
          mix(
            v,
            blendedVelocity,
            blendedFollow
          )
        );
      });

      // =====================================================
      // NEUTRO — agua calmada, sin viento
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
      // KICK (B) — universal excepto Puntero
      // =====================================================
      If(params.mode.lessThan(2.5).or(params.mode.greaterThan(3.5)), () => {
        If(params.beat.greaterThan(0.01), () => {
          const direction = p.normalize();

          v.addAssign(
            direction
              .mul(params.beat)
              .mul(params.beatStrength)
              .mul(40.0)
              .mul(dt)
          );
        });
      });

      // =====================================================
      // ONDAS (click izquierdo)
      // =====================================================
      const isArenaMode = step(0.5, params.mode).oneMinus();
      const rippleStrength = mix(35.0, 70.0, isArenaMode);

      const rippleForce = (origin, life) => {
        const toParticle = p.sub(origin);
        const dist = max(toParticle.length(), 0.001);
        const dir = toParticle.div(dist);

        const ringRadius = life.oneMinus().mul(6.0);
        const ringWidth = 1.8;

        const diff = dist.sub(ringRadius).abs();
        const falloff = max(diff.div(ringWidth).oneMinus(), 0.0);

        return dir.mul(falloff).mul(life).mul(rippleStrength);
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
      // =====================================================
      const grainPhase = hash(instanceIndex.add(uint(101)));
      const radialPhase = p.length().mul(3.0);

      const grain = vec3(
        sin(grainPhase.mul(37.0).add(radialPhase)),
        cos(grainPhase.mul(53.0).add(radialPhase)),
        sin(grainPhase.mul(71.0).add(radialPhase))
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
      // COMPRESIÓN (click derecho)
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
      // LIBERACIÓN / EXPANDIR
      // =====================================================
      If(params.releaseBurst.greaterThan(0.01), () => {
        const randomDir = vec3(
          hash(instanceIndex.add(uint(211))),
          hash(instanceIndex.add(uint(307))),
          hash(instanceIndex.add(uint(401)))
        )
          .sub(0.5)
          .normalize();

        v.addAssign(
          randomDir
            .mul(params.releaseBurst)
            .mul(18.0)
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

      // =====================================================
      // PUNTERO WRAP
      // =====================================================
      If(params.mode.greaterThan(2.5).and(params.mode.lessThan(3.5)), () => {
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
