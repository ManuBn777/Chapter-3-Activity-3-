const updateParticles = Fn(() => {
    const p = positionBuffer.element(instanceIndex);
    const v = velocityBuffer.element(instanceIndex);

    const dt = params.dt.mul(params.timeScale);
    const force = vec3(0.0).toVar();

    // 1) CONSTANT / WIND FORCE
    force.addAssign(params.wind.mul(params.windEnabled));

    // 2) RADIAL FORCE: Se anula progresivamente al entrar en modo esfera (sphereBlend 1.0)
    const toAttractor = params.attractor.sub(p);
    const distance = max(toAttractor.length(), params.softening);
    const radialDirection = toAttractor.div(distance);
    
    // Multiplicamos por (1.0 - sphereBlend) para que el mouse no afecte la esfera
    const radialForce = radialDirection
      .mul(params.radialStrength)
      .div(distance.pow(2))
      .mul(params.radialEnabled)
      .mul(params.sphereBlend.oneMinus()); // <--- CORRECCIÓN: Si blend es 1, fuerza es 0
      
    force.addAssign(radialForce);

    const distFromCenter = p.length();

    // 3) MODO ESFERA: Contenedor elástico firme + Inercia suave
    const effectiveRadius = params.baseRadius.add(params.beat.mul(params.beatExpansion));
    If(params.sphereBlend.greaterThan(0.01), () => {
      // Inercia interna sutil
      const inertiaForce = p.normalize().cross(vec3(0.0, 0.0, 1.0)).mul(0.35);
      force.addAssign(inertiaForce.mul(params.sphereBlend));

      // Pared contenedora que reacciona al Kick (B)
      If(distFromCenter.greaterThan(effectiveRadius), () => {
        const pushIn = p.normalize().negate().mul(distFromCenter.sub(effectiveRadius)).mul(180.0).mul(params.sphereBlend);
        force.addAssign(pushIn);
      });
    });

    // 4) MODO ARENA: Kick clásico desde el centro (independiente del mouse)
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

    // 5) ESTÁTICA / ARENA (N)
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

    // 6) VORTEX FORCE
    const zAxis = vec3(0.0, 0.0, 1.0);
    const tangent = zAxis.cross(radialDirection);
    force.addAssign(tangent.mul(params.vortexStrength).mul(params.vortexEnabled));

    // 7) LINEAR DRAG (Mantiene la esfera limpia)
    const effectiveDrag = mix(params.dragCoefficient, params.dragCoefficient.mul(4.5), params.sphereBlend);
    force.addAssign(v.mul(effectiveDrag).mul(params.dragEnabled).mul(-1.0));

    // INTEGRATION
    v.addAssign(force.mul(dt));

    const speed = v.length();
    If(speed.greaterThan(params.maxSpeed), () => {
      v.assign(v.normalize().mul(params.maxSpeed));
    });

    p.addAssign(v.mul(dt));

    // 8) LÍMITES PERIÓDICOS (Arena fluida)
    const half = params.boundsSize.mul(0.5);
    const wrappedPos = mod(p.add(half), params.boundsSize).sub(half);
    p.assign(mix(wrappedPos, p, params.sphereBlend));
  })();
