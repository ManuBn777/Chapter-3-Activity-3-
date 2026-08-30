function button(parent, label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.append(b);
  return b;
}

function rangeRow(parent, label, value, min, max, step, onInput) {
  const wrap = document.createElement('div');
  wrap.className = 'row';

  const lab = document.createElement('label');
  const name = document.createElement('span');
  const display = document.createElement('span');
  display.className = 'value';
  name.textContent = label;
  display.textContent = Number(value()).toFixed(step < 0.01 ? 3 : 2);
  lab.append(name, display);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value());

  input.addEventListener('input', () => {
    const v = Number(input.value);
    onInput(v);
    display.textContent = v.toFixed(step < 0.01 ? 3 : 2);
  });

  wrap.append(lab, input);
  parent.append(wrap);
  return input;
}

function section(panel, title) {
  const group = document.createElement('div');
  group.className = 'group';
  const h = document.createElement('h2');
  h.textContent = title;
  group.append(h);
  panel.append(group);
  return group;
}

export function createLabPanel({
  params,
  onReset,
  onModeSelect,
  onBeat,
  onRipple,
  onFlash,
  onColor,
  onSlow,
  onStatic,
  onCrazy,
  onWindSpeed,
  onWindAngle,
  onWindFlip180,
  onWindTurn90,
  onWindTurnMinus90,
  onModeChange,
  onPauseChange
}) {
  const panel = document.createElement('aside');
  panel.className = 'panel';
  panel.innerHTML = `
    <h1>U3 · Forces Instrument</h1>
    <p>LAB: prueba modos y fuerzas. <strong>P</strong> cambia a PERFORMANCE.</p>
  `;

  const modes = section(panel, 'Modos');
  [
    [0, '1 · Arena'],
    [1, '2 · Esfera'],
    [2, '3 · Círculo'],
    [3, '4 · Puntero'],
    [4, '5 · Neutro']
  ].forEach(([id, label]) => button(modes, label, () => onModeSelect(id)));

  const effects = section(panel, 'Efectos');
  button(effects, 'Kick / Bounce (B)', onBeat);
  button(effects, 'Onda / Click izquierdo', onRipple);
  button(effects, 'Color (C)', onColor);
  button(effects, 'Flash (F)', onFlash);
  button(effects, 'Slow motion (T)', onSlow);
  button(effects, 'Estática (N)', onStatic);
  button(effects, 'Locura (L)', onCrazy);

  const wind = section(panel, 'Viento · A/S vel. + Q/W rotación');
  rangeRow(wind, 'Velocidad A/S (0-25)', () => params.windSpeed.value, 0, 25, 1, onWindSpeed);
  rangeRow(
    wind,
    'Ángulo (rad) Q/W',
    () => params.windAngle.value,
    -Math.PI, Math.PI, 0.01,
    onWindAngle
  );
  button(wind, '180° (E)', onWindFlip180);
  button(wind, '+90° (X)', onWindTurn90);
  button(wind, '-90° (Z)', onWindTurnMinus90);

  const sim = section(panel, 'Simulación');
  rangeRow(sim, 'timeScale', () => params.timeScale.value, 0, 2, 0.01, (v) => { params.timeScale.value = v; });
  rangeRow(sim, 'maxSpeed', () => params.maxSpeed.value, 1, 30, 0.5, (v) => { params.maxSpeed.value = v; });
  rangeRow(sim, 'particleSize', () => params.particleSize.value, 0.005, 0.1, 0.001, (v) => { params.particleSize.value = v; });

  const forces = section(panel, 'Fuerzas');
  rangeRow(forces, 'Radial', () => params.radialStrength.value, -8, 8, 0.05, (v) => {
    params.radialStrength.value = v;
    params.radialEnabled.value = Math.abs(v) > 0 ? 1 : 0;
  });
  rangeRow(forces, 'Vórtice', () => params.vortexStrength.value, -8, 8, 0.05, (v) => {
    params.vortexStrength.value = v;
    params.vortexEnabled.value = Math.abs(v) > 0 ? 1 : 0;
  });
  rangeRow(forces, 'Drag', () => params.dragCoefficient.value, 0, 1, 0.01, (v) => {
    params.dragCoefficient.value = v;
    params.dragEnabled.value = v > 0 ? 1 : 0;
  });

  const actions = section(panel, 'Acciones');
  button(actions, 'Reset (R)', onReset);
  button(actions, 'Pausar / continuar', onPauseChange);
  button(actions, 'LAB / PERFORMANCE (P)', onModeChange);

  document.body.append(panel);

  return {
    element: panel,
    setVisible(visible) {
      panel.classList.toggle('hidden', !visible);
    },
    refresh() {},
    dispose() {
      panel.remove();
    }
  };
}
