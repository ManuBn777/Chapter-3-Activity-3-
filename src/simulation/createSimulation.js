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

export function createSimulation({
  renderer,
  scene,
  params,
  count = 131072
}) {

  // ============================================================
  // BUFFERS
  // ============================================================

  const positionBuffer =
    instancedArray(count, 'vec3');

  const velocityBuffer =
    instancedArray(count, 'vec3');

  // ============================================================
  // INITIALIZE
  // ============================================================

  const initParticles = Fn(() => {

    const i = instanceIndex;

    const p =
      positionBuffer.element(i);

    const v =
      velocityBuffer.element(i);

    // ----------------------------------------------------------
    // RANDOM VALUES
    // ----------------------------------------------------------

    const r1 = hash(i.add(uint(11)));
    const r2 = hash(i.add(uint(23)));
    const r3 = hash(i.add(uint(37)));

    const r4 = hash(i.add(uint(53)));
    const r5 = hash(i.add(uint(71)));
    const r6 = hash(i.add(uint(89)));

    const r7 = hash(i.add(uint(107)));

    // ----------------------------------------------------------
    // DISTRIBUCIÓN VOLUMÉTRICA
    // ----------------------------------------------------------

    /*
     * Dirección aleatoria.
     */
    const direction =
      vec3(r1, r2, r3)
        .sub(0.5)
        .normalize();

    /*
     * IMPORTANTE:
     *
     * r^(1/3) produce una distribución uniforme
     * dentro del volumen de una esfera.
     *
     * Las partículas NO se colocan sobre la superficie.
     */

    const radius =
      r7
        .pow(1.0 / 3.0)
        .mul(params.baseRadius.mul(0.95));

    p.assign(
      direction.mul(radius)
    );

    // ----------------------------------------------------------
    // VELOCIDAD INICIAL
    // ----------------------------------------------------------

    /*
     * Movimiento inicial pequeño y aleatorio.
     *
     * No queremos que salgan disparadas.
     */
    v.assign(
      vec3(r4, r5, r6)
        .sub(0.5)
        .mul(params.initialSpeed)
    );

  })()
    .compute(count)
    .setName('Initialize Particles');


  // ============================================================
  // UPDATE
  // ============================================================

  const updateParticles = Fn(() => {

    const i = instanceIndex;

    const p =
      positionBuffer.element(i);

    const v =
      velocityBuffer.element(i);

    const dt =
      params.dt.mul(params.timeScale);

    const force =
      vec3(0.0).toVar();

    // ==========================================================
    // INFORMACIÓN DE POSICIÓN
    // ==========================================================

    const dist =
      max(
        p.length(),
        0.001
      );

    const normal =
      p.div(dist);

    // ==========================================================
    // 1. MOVIMIENTO INTERNO
    // ==========================================================

    /*
     * En lugar de una fuerza radial, usamos un campo
     * tridimensional de movimiento.
     *
     * Esto hace que las partículas circulen dentro
     * de la esfera sin ser empujadas hacia la superficie.
     *
     * MUY IMPORTANTE:
     *
     * No modifica el radio directamente.
     */

    const internalFlow =
      vec3(
        p.y.negate(),
        p.x,
        sin(p.z.mul(2.7))
      )
      .mul(0.18);

    force.addAssign(
      internalFlow
        .mul(params.sphereBlend)
    );

    // ==========================================================
    // 2. PEQUEÑO MOVIMIENTO VERTICAL / PROFUNDIDAD
    // ==========================================================

    const depthFlow =
      vec3(
        sin(p.y.mul(2.1)),
        sin(p.z.mul(1.7)),
        sin(p.x.mul(2.4))
      )
      .mul(0.10);

    force.addAssign(
      depthFlow
        .mul(params.sphereBlend)
    );

    // ==========================================================
    // 3. B — THUMP
    // ==========================================================

    /*
     * NO HAY:
     *
     * - bounce
     * - spring
     * - elastic force
     * - secondary bounce
     * - impulso radial acumulativo
     *
     * El B simplemente expande temporalmente las posiciones.
     *
     * El valor beat viene de main.js y dura muy poco.
     */

    If(
      params.beat.greaterThan(0.001),
      () => {

        /*
         * Expansión corta.
         *
         * beat = 0
         *      ↓
         * escala = 1
         *
         * beat = 1
         *      ↓
         * escala = 1 + kickAmount
         */

        const kickScale =
          vec3(1.0).add(
            params.beat.mul(
              params.kickAmount
            )
          );

        /*
         * Expandimos cada partícula desde el centro.
         *
         * Esto mantiene la forma esférica.
         *
         * NO crea una onda que empuje las partículas
         * hacia la superficie.
         */

        p.assign(
          p.mul(
            mix(
              vec3(1.0),
              kickScale,
              params.sphereBlend
            )
          )
        );

      }
    );

    // ==========================================================
    // 4. CONTENCIÓN SUAVE
    // ==========================================================

    /*
     * Solamente evitamos que una partícula se vaya
     * completamente fuera de la esfera.
     *
     * NO existe una fuerza que atraiga todas las partículas
     * hacia el borde.
     */

    const maxRadius =
      params.baseRadius
        .mul(1.15);

    If(
      dist.greaterThan(maxRadius),
      () => {

        const excess =
          dist.sub(maxRadius);

        const correction =
          normal
            .negate()
            .mul(excess)
            .mul(4.0);

        force.addAssign(
          correction
            .mul(params.sphereBlend)
        );

      }
    );

    // ==========================================================
    // 5. ESTÁTICA / N
    // ==========================================================

    const randomScatter =
      vec3(
        hash(i.add(uint(13))),
        hash(i.add(uint(23))),
        hash(i.add(uint(37)))
      )
      .sub(0.5);

    const ripple =
      sin(
        dist.mul(25.0)
      );

    const staticEffect =
      randomScatter
        .mul(params.staticStrength)
        .add(
          normal
            .mul(ripple)
            .mul(2.0)
        )
        .mul(params.staticTrigger);

    force.addAssign(
      staticEffect
    );

    // ==========================================================
    // 6. ARENA
    // ==========================================================

    If(
      params.sphereBlend.lessThan(0.99),
      () => {

        // ------------------------------------------------------
        // RADIAL MOUSE
        // ------------------------------------------------------

        const effectiveAttractor =
          params.attractor;

        const toAttractor =
          effectiveAttractor.sub(p);

        const distance =
          max(
            toAttractor.length(),
            params.softening
          );

        const attractDirection =
          toAttractor.div(distance);

        const radialForce =
          attractDirection
            .mul(params.radialStrength)
            .div(distance.pow(2))
            .mul(params.radialEnabled);

        force.addAssign(
          radialForce
            .mul(params.sphereBlend.oneMinus())
        );

        // ------------------------------------------------------
        // VORTEX
        // ------------------------------------------------------

        const zAxis =
          vec3(0.0, 0.0, 1.0);

        const tangent =
          zAxis.cross(
            attractDirection
          );

        force.addAssign(
          tangent
            .mul(params.vortexStrength)
            .mul(params.vortexEnabled)
            .mul(params.sphereBlend.oneMinus())
        );

        // ------------------------------------------------------
        // WIND
        // ------------------------------------------------------

        force.addAssign(
          params.wind
            .mul(params.windEnabled)
            .mul(params.sphereBlend.oneMinus())
        );

      }
    );

    // ==========================================================
    // 7. DRAG
    // ==========================================================

    force.addAssign(
      v
        .mul(params.dragCoefficient)
        .mul(params.dragEnabled)
        .mul(-1.0)
    );

    // ==========================================================
    // 8. INTEGRATION
    // ==========================================================

    v.addAssign(
      force.mul(dt)
    );

    // ==========================================================
    // VELOCIDAD MÁXIMA
    // ==========================================================

    const speed =
      v.length();

    If(
      speed.greaterThan(
        params.maxSpeed
      ),
      () => {

        v.assign(
          v
            .normalize()
            .mul(params.maxSpeed)
        );

      }
    );

    // ==========================================================
    // POSICIÓN
    // ==========================================================

    p.addAssign(
      v.mul(dt)
    );

    // ==========================================================
    // ARENA — WRAP
    // ==========================================================

    const half =
      params.boundsSize.mul(0.5);

    const wrapped =
      mod(
        p.add(half),
        params.boundsSize
      )
      .sub(half);

    p.assign(
      mix(
        wrapped,
        p,
        params.sphereBlend
      )
    );

  })()
    .compute(count)
    .setName('Update Particles');


  // ============================================================
  // MATERIAL
  // ============================================================

  const material =
    new THREE.SpriteNodeMaterial({
      blending:
        THREE.AdditiveBlending,

      depthWrite: false,

      transparent: true
    });

  material.positionNode =
    positionBuffer.toAttribute();

  material.scaleNode =
    params.particleSize;

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

  material.opacityNode =
    step(
      uv()
        .xy
        .sub(0.5)
        .length(),
      0.5
    );


  // ============================================================
  // MESH
  // ============================================================

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


  // ============================================================
  // CONTROLS
  // ============================================================

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
