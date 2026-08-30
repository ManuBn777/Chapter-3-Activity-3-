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
  step,
  uint,
  uv,
  vec3,
  vec4,
  sin,
  cos
} from 'three/tsl';

export function createSimulation({
  renderer,
  scene,
  params,
  count = 131072
}) {
  // =========================================================
  // BUFFERS GPU
  // =========================================================

  const positionBuffer = instancedArray(count, 'vec3');
  const velocityBuffer = instancedArray(count, 'vec3');

  // =========================================================
  // INICIALIZACIÓN
  // =========================================================

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

    // ---------------------------------------------------------
    // Distribución volumétrica inicial
    // ---------------------------------------------------------

    const dir = vec3(
      r1,
      r2,
      r3
    )
      .sub(0.5)
      .normalize();

    const radius = r7
      .pow(1.0 / 3.0)
      .mul(params.baseRadius);

    p.assign(
      dir.mul(radius)
    );

    // ---------------------------------------------------------
    // ESTADO INICIAL QUIETO
    // ---------------------------------------------------------
    //
    // initialSpeed = 0 al entrar.
    //
    // Por lo tanto:
    //
    // velocity = 0
    //
    // y las partículas permanecen completamente quietas
    // mientras no exista una fuerza activa.

    v.assign(
      vec3(
        r4,
        r5,
        r6
      )
        .sub(0.5)
        .mul(params.initialSpeed)
    );
  })()
    .compute(count)
    .setName('Initialize Particles');

  // =========================================================
  // ACTUALIZACIÓN DE PARTÍCULAS
  // =========================================================

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt.mul(params.timeScale);

    // Fuerza total acumulada.
    const force = vec3(0.0).toVar();

    const distFromCenter = p.length();

    // =======================================================
    // 1. ESFERA
    // =======================================================

    If(
      params.sphereBlend.greaterThan(0.01),
      () => {
        // ---------------------------------------------------
        // Flujo interno suave de la esfera
        // ---------------------------------------------------

        const waveFlow = vec3(
          sin(
            p.y
              .mul(2.0)
              .add(params.beat.mul(5.0))
          ),

          sin(
            p.z
              .mul(2.0)
              .add(params.beat.mul(5.0))
          ),

          sin(
            p.x
              .mul(2.0)
              .add(params.beat.mul(5.0))
          )
        )
          .mul(4.0);

        force.addAssign(
          waveFlow.mul(params.sphereBlend)
        );

        // ---------------------------------------------------
        // Giro heredado del sistema anterior
        // ---------------------------------------------------

        const rotationAxis = vec3(
          0.0,
          1.0,
          0.0
        );

        const tangentDir =
          rotationAxis.cross(p);

        const spinForce =
          tangentDir
            .mul(params.spinDirection)
            .mul(params.spinSpeed);

        force.addAssign(
          spinForce.mul(params.sphereBlend)
        );

        // ---------------------------------------------------
        // Contención esférica
        // ---------------------------------------------------

        const targetRadius =
          params.baseRadius.add(
            params.beat.mul(params.beatExpansion)
          );

        const toCenterDir =
          p.normalize();

        const radiusDiff =
          distFromCenter.sub(targetRadius);

        const containmentForce =
          toCenterDir
            .negate()
            .mul(
              radiusDiff.mul(8.0)
            );

        force.addAssign(
          containmentForce.mul(params.sphereBlend)
        );

        // ---------------------------------------------------
        // Amortiguación
        // ---------------------------------------------------

        force.addAssign(
          v
            .mul(-0.2)
            .mul(params.sphereBlend)
        );
      }
    );

    // =======================================================
    // 2. ARENA
    // =======================================================

    If(
      params.sphereBlend.lessThan(0.99),
      () => {
        const effectiveAttractor =
          params.attractor;

        const toAttractor =
          effectiveAttractor.sub(p);

        const distance =
          max(
            toAttractor.length(),
            params.softening
          );

        const radialDirection =
          toAttractor.div(distance);

        // ---------------------------------------------------
        // Atracción / repulsión
        // ---------------------------------------------------

        const radialForce =
          radialDirection
            .mul(params.radialStrength)
            .div(distance.pow(2))
            .mul(params.radialEnabled)
            .mul(3.0);

        force.addAssign(
          radialForce.mul(
            params.sphereBlend.oneMinus()
          )
        );

        // ---------------------------------------------------
        // VIENTO
        //
        // El vector params.wind ya contiene:
        //
        // dirección × velocidad
        //
        // Q/W controlan la dirección.
        // A/S controlan la velocidad.
        // ---------------------------------------------------

        force.addAssign(
          params.wind
            .mul(params.windEnabled)
            .mul(12.0)
            .mul(params.sphereBlend.oneMinus())
        );

        // ---------------------------------------------------
        // VÓRTICE
        // ---------------------------------------------------

        const zAxis =
          vec3(0.0, 0.0, 1.0);

        const tangent =
          zAxis.cross(radialDirection);

        force.addAssign(
          tangent
            .mul(params.vortexStrength)
            .mul(params.vortexEnabled)
            .mul(3.0)
            .mul(params.sphereBlend.oneMinus())
        );

        // ---------------------------------------------------
        // DRAG
        // ---------------------------------------------------

        force.addAssign(
          v
            .mul(params.dragCoefficient)
            .mul(params.dragEnabled)
            .mul(-1.0)
            .mul(params.sphereBlend.oneMinus())
        );
      }
    );

    // =======================================================
    // 3. KICK / SHOCKWAVE
    // =======================================================

    If(
      params.beat.greaterThan(0.01),
      () => {
        If(
          params.sphereBlend.lessThan(0.5),
          () => {
            const centerDir =
              p.normalize();

            const waveRadius =
              params.beat.mul(25.0);

            const waveBand =
              distFromCenter
                .sub(waveRadius)
                .abs();

            const arenaShockwave =
              centerDir
                .mul(params.beatStrength)
                .mul(params.beat)
                .mul(50.0)
                .div(
                  waveBand.add(0.1)
                );

            force.addAssign(
              arenaShockwave.mul(
                params.sphereBlend.oneMinus()
              )
            );
          }
        );
      }
    );

    // =======================================================
    // 4. ESTÁTICA
    // =======================================================

    If(
      params.staticTrigger.greaterThan(0.01),
      () => {
        const randomScatter = vec3(
          hash(instanceIndex.add(uint(13))),
          hash(instanceIndex.add(uint(23))),
          hash(instanceIndex.add(uint(37)))
        )
          .sub(0.5)
          .mul(3.0);

        const staticEffect =
          randomScatter
            .mul(params.staticStrength)
            .mul(params.staticTrigger);

        force.addAssign(
          staticEffect
        );
      }
    );

    // =======================================================
    // 5. INTEGRACIÓN
    // =======================================================

    // F = ma
    //
    // Como estamos trabajando con masa = 1:
    //
    // aceleración = fuerza

    v.addAssign(
      force.mul(dt)
    );

    // =======================================================
    // 6. LÍMITE DE VELOCIDAD
    // =======================================================

    const speed =
      v.length();

    If(
      speed.greaterThan(params.maxSpeed),
      () => {
        v.assign(
          v
            .normalize()
            .mul(params.maxSpeed)
        );
      }
    );

    // =======================================================
    // 7. ACTUALIZAR POSICIÓN
    // =======================================================

    p.addAssign(
      v.mul(dt)
    );

    // =======================================================
    // 8. LÍMITES DE ARENA
    // =======================================================

    const half =
      params.boundsSize.mul(0.5);

    const wrappedPos =
      p
        .add(half)
        .mod(params.boundsSize)
        .sub(half);

    p.assign(
      mix(
        wrappedPos,
        p,
        params.sphereBlend
      )
    );
  })()
    .compute(count)
    .setName('Update Particles');

  // =========================================================
  // MATERIAL
  // =========================================================

  const material =
    new THREE.SpriteNodeMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });

  material.positionNode =
    positionBuffer.toAttribute();

  material.scaleNode =
    params.particleSize;

  // ---------------------------------------------------------
  // COLOR SEGÚN VELOCIDAD
  // ---------------------------------------------------------

  material.colorNode =
    Fn(() => {
      const speed =
        velocityBuffer
          .toAttribute()
          .length();

      const t =
        speed
          .div(params.maxSpeed)
          .clamp(0.0, 1.0);

      const slow =
        color('#46a6ff');

      const fast =
        color('#ffb35a');

      return vec4(
        mix(
          slow,
          fast,
          t
        ),
        1.0
      );
    })();

  // ---------------------------------------------------------
  // FORMA DE LA PARTÍCULA
  // ---------------------------------------------------------

  material.opacityNode =
    step(
      uv()
        .xy
        .sub(0.5)
        .length(),
      0.5
    );

  // =========================================================
  // MESH
  // =========================================================

  const geometry =
    new THREE.PlaneGeometry(
      1,
      1
    );

  const mesh =
    new THREE.InstancedMesh(
      geometry,
      material,
      count
    );

  mesh.frustumCulled = false;

  scene.add(mesh);

  // =========================================================
  // API
  // =========================================================

  function reset() {
    renderer.compute(
      initParticles
    );
  }

  function stepSimulation() {
    renderer.compute(
      updateParticles
    );
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
