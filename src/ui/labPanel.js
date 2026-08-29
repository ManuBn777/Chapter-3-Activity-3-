function rangeRow(
  parent,
  label,
  object,
  key,
  min,
  max,
  step,
  onInput,
  getValue
) {
  const wrap =
    document.createElement('div');

  wrap.className =
    'row';

  const lab =
    document.createElement('label');

  const name =
    document.createElement('span');

  const value =
    document.createElement('span');

  value.className =
    'value';

  name.textContent =
    label;

  lab.append(
    name,
    value
  );

  const input =
    document.createElement('input');

  input.type =
    'range';

  input.min =
    String(min);

  input.max =
    String(max);

  input.step =
    String(step);

  input.value =
    String(
      object[key]
    );

  const refresh =
    () => {
      const next =
        Number(
          getValue
            ? getValue()
            : object[key]
        );

      object[key] =
        next;

      input.value =
        String(next);

      value.textContent =
        Number(next).toFixed(
          step < 0.01
            ? 3
            : 2
        );
    };

  const refreshFromInput =
    () => {
      const next =
        Number(
          input.value
        );

      object[key] =
        next;

      value.textContent =
        Number(next).toFixed(
          step < 0.01
            ? 3
            : 2
        );

      onInput?.(
        next
      );
    };

  input.addEventListener(
    'input',
    refreshFromInput
  );

  refresh();

  wrap.append(
    lab,
    input
  );

  parent.append(
    wrap
  );

  return {
    input,
    refresh
  };
}


function checkRow(
  parent,
  label,
  initial,
  onChange,
  getValue
) {
  const wrap =
    document.createElement(
      'div'
    );

  wrap.className =
    'row';

  const lab =
    document.createElement(
      'label'
    );

  const name =
    document.createElement(
      'span'
    );

  name.textContent =
    label;

  const input =
    document.createElement(
      'input'
    );

  input.type =
    'checkbox';

  input.checked =
    initial;

  input.addEventListener(
    'change',
    () => {
      onChange(
        input.checked
      );
    }
  );

  lab.append(
    name,
    input
  );

  wrap.append(
    lab
  );

  parent.append(
    wrap
  );

  return {
    input,

    refresh() {
      if (
        getValue
      ) {
        input.checked =
          Boolean(
            getValue()
          );
      }
    }
  };
}


function button(
  parent,
  label,
  onClick
) {
  const b =
    document.createElement(
      'button'
    );

  b.textContent =
    label;

  b.addEventListener(
    'click',
    onClick
  );

  parent.append(
    b
  );

  return b;
}


export function createLabPanel({
  params,
  onReset,
  onPreset,
  onBeat,
  onModeChange,
  onPauseChange
}) {
  const refreshers =
    [];

  const panel =
    document.createElement(
      'aside'
    );

  panel.className =
    'panel';

  panel.innerHTML = `
    <h1>U3 · Forces Instrument</h1>

    <p>
      LAB: aísla fuerzas, predice y prueba.
      <strong>P</strong> cambia a PERFORMANCE.
    </p>
  `;


  // =========================================================
  // SIMULACIÓN
  // =========================================================

  const sim =
    document.createElement(
      'div'
    );

  sim.className =
    'group';

  sim.innerHTML =
    '<h2>Simulación</h2>';

  panel.append(
    sim
  );


  const state = {
    timeScale:
      params.timeScale.value,

    maxSpeed:
      params.maxSpeed.value,

    particleSize:
      params.particleSize.value,

    radialStrength:
      params.radialStrength.value,

    vortexStrength:
      params.vortexStrength.value,

    dragCoefficient:
      params.dragCoefficient.value,

    windX:
      params.wind.value.x,

    windY:
      params.wind.value.y,

    sphereBlend:
      params.sphereBlend.value,

    staticTrigger:
      params.staticTrigger.value,

    windDirection:
      params.windDirection.value,

    windSpeed:
      params.windSpeed.value
  };


  refreshers.push(
    rangeRow(
      sim,
      'timeScale',
      state,
      'timeScale',
      0,
      2,
      0.01,

      (v) => {
        params.timeScale.value =
          v;
      },

      () => {
        return params.timeScale.value;
      }
    )
  );


  refreshers.push(
    rangeRow(
      sim,
      'maxSpeed',
      state,
      'maxSpeed',
      0.2,
      12,
      0.1,

      (v) => {
        params.maxSpeed.value =
          v;
      },

      () => {
        return params.maxSpeed.value;
      }
    )
  );


  refreshers.push(
    rangeRow(
      sim,
      'particleSize',
      state,
      'particleSize',
      0.005,
      0.1,
      0.001,

      (v) => {
        params.particleSize.value =
          v;
      },

      () => {
        return params.particleSize.value;
      }
    )
  );


  // =========================================================
  // FORCES / INSTRUMENT
  // =========================================================

  const instruments =
    document.createElement(
      'div'
    );

  instruments.className =
    'group';

  instruments.innerHTML =
    '<h2>Forces / Instrument</h2>';

  panel.append(
    instruments
  );


  // =========================================================
  // ESFERA
  // =========================================================

  refreshers.push(
    rangeRow(
      instruments,
      'sphereBlend (E)',
      state,
      'sphereBlend',
      0,
      1,
      0.01,

      (v) => {
        params.sphereBlend.value =
          v;
      },

      () => {
        return params.sphereBlend.value;
      }
    )
  );


  // =========================================================
  // ESTÁTICA
  // =========================================================

  refreshers.push(
    rangeRow(
      instruments,
      'Estática (N)',
      state,
      'staticTrigger',
      0,
      2,
      0.01,

      (v) => {
        params.staticTrigger.value =
          v;
      },

      () => {
        return params.staticTrigger.value;
      }
    )
  );


  // =========================================================
  // DIRECCIÓN DEL VIENTO
  // =========================================================
  //
  // -1 = izquierda
  //  0 = centro
  // +1 = derecha
  //
  // Q = -1
  // W = +1
  //
  // =========================================================

  refreshers.push(
    rangeRow(
      instruments,
      'Dirección del viento (Q/W)',
      state,
      'windDirection',
      -1,
      1,
      0.01,

      (v) => {
        params.windDirection.value =
          v;

        updateWindFromPanel();
      },

      () => {
        return params.windDirection.value;
      }
    )
  );


  // =========================================================
  // VELOCIDAD DEL VIENTO
  // =========================================================
  //
  // 0 = sin velocidad
  // 10 = velocidad máxima
  //
  // A = -1
  // S = +1
  //
  // =========================================================

  refreshers.push(
    rangeRow(
      instruments,
      'Velocidad del viento (A/S)',
      state,
      'windSpeed',
      0,
      10,
      1,

      (v) => {
        params.windSpeed.value =
          v;

        updateWindFromPanel();
      },

      () => {
        return params.windSpeed.value;
      }
    )
  );


  // =========================================================
  // KICK
  // =========================================================

  button(
    instruments,
    'Kick / Bounce (B)',
    onBeat
  );


  // =========================================================
  // FUERZAS
  // =========================================================

  const force =
    document.createElement(
      'div'
    );

  force.className =
    'group';

  force.innerHTML =
    '<h2>Fuerzas</h2>';

  panel.append(
    force
  );


  refreshers.push(
    checkRow(
      force,
      'Radial',
      params.radialEnabled.value > 0,

      (v) => {
        params.radialEnabled.value =
          v ? 1 : 0;
      },

      () => {
        return (
          params.radialEnabled.value > 0
        );
      }
    )
  );


  refreshers.push(
    rangeRow(
      force,
      'radialStrength',
      state,
      'radialStrength',
      -8,
      8,
      0.05,

      (v) => {
        params.radialStrength.value =
          v;
      },

      () => {
        return params.radialStrength.value;
      }
    )
  );


  refreshers.push(
    checkRow(
      force,
      'Vórtice',
      params.vortexEnabled.value > 0,

      (v) => {
        params.vortexEnabled.value =
          v ? 1 : 0;
      },

      () => {
        return (
          params.vortexEnabled.value > 0
        );
      }
    )
  );


  refreshers.push(
    rangeRow(
      force,
      'vortexStrength',
      state,
      'vortexStrength',
      -8,
      8,
      0.05,

      (v) => {
        params.vortexStrength.value =
          v;
      },

      () => {
        return params.vortexStrength.value;
      }
    )
  );


  refreshers.push(
    checkRow(
      force,
      'Drag',
      params.dragEnabled.value > 0,

      (v) => {
        params.dragEnabled.value =
          v ? 1 : 0;
      },

      () => {
        return (
          params.dragEnabled.value > 0
        );
      }
    )
  );


  refreshers.push(
    rangeRow(
      force,
      'dragCoefficient',
      state,
      'dragCoefficient',
      0,
      1,
      0.01,

      (v) => {
        params.dragCoefficient.value =
          v;
      },

      () => {
        return params.dragCoefficient.value;
      }
    )
  );


  // =========================================================
  // VIENTO MANUAL DEL LAB
  // =========================================================

  refreshers.push(
    checkRow(
      force,
      'Viento',
      params.windEnabled.value > 0,

      (v) => {
        params.windEnabled.value =
          v ? 1 : 0;
      },

      () => {
        return (
          params.windEnabled.value > 0
        );
      }
    )
  );


  refreshers.push(
    rangeRow(
      force,
      'wind.x',
      state,
      'windX',
      -10,
      10,
      0.05,

      (v) => {
        params.wind.value.x =
          v;
      },

      () => {
        return params.wind.value.x;
      }
    )
  );


  refreshers.push(
    rangeRow(
      force,
      'wind.y',
      state,
      'windY',
      -4,
      4,
      0.05,

      (v) => {
        params.wind.value.y =
          v;
      },

      () => {
        return params.wind.value.y;
      }
    )
  );


  // =========================================================
  // PRUEBAS
  // =========================================================

  const tests =
    document.createElement(
      'div'
    );

  tests.className =
    'group';

  tests.innerHTML = `
    <h2>Pruebas de comportamiento</h2>

    <p>
      Antes de pulsar una prueba,
      predice qué debería ocurrir.
    </p>
  `;

  panel.append(
    tests
  );


  for (
    const [id, label]
    of [
      ['inertia', '1 · Inercia'],
      ['wind', '2 · Fuerza constante +X'],
      ['attract', '3 · Atracción'],
      ['repel', '4 · Repulsión'],
      ['vortex', '5 · Vórtice']
    ]
  ) {
    button(
      tests,
      label,
      () => {
        onPreset(
          id
        );
      }
    );
  }


  // =========================================================
  // ACCIONES
  // =========================================================

  const actions =
    document.createElement(
      'div'
    );

  actions.className =
    'group';

  actions.innerHTML =
    '<h2>Acciones</h2>';

  panel.append(
    actions
  );


  button(
    actions,
    'Reset',
    onReset
  );


  button(
    actions,
    'Pausar / continuar',
    () => {
      onPauseChange();
    }
  );


  button(
    actions,
    'LAB / PERFORMANCE',
    () => {
      onModeChange();
    }
  );


  // =========================================================
  // PANEL
  // =========================================================

  document.body.append(
    panel
  );


  // =========================================================
  // SINCRONIZACIÓN CON TECLADO
  // =========================================================

  const syncInterval =
    setInterval(
      () => {
        for (
          const item
          of refreshers
        ) {
          item.refresh();
        }
      },
      50
    );


  // =========================================================
  // ACTUALIZAR VIENTO DESDE EL PANEL
  // =========================================================

  function updateWindFromPanel() {
    const speed =
      params.windSpeed.value;

    const direction =
      params.windDirection.value;

    if (
      speed <= 0 ||
      direction === 0
    ) {
      params.wind.value.set(
        0,
        0,
        0
      );

      params.windEnabled.value =
        0;

      return;
    }

    params.wind.value.set(
      direction * speed,
      0,
      0
    );

    params.windEnabled.value =
      1;
  }


  // =========================================================
  // API
  // =========================================================

  return {
    element:
      panel,

    setVisible(
      visible
    ) {
      panel.classList.toggle(
        'hidden',
        !visible
      );
    },

    refresh() {
      for (
        const item
        of refreshers
      ) {
        item.refresh();
      }
    },

    dispose() {
      clearInterval(
        syncInterval
      );

      panel.remove();
    }
  };
}
