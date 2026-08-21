import * as dat from 'lil-gui';

export function createLabPanel({ params, onReset, onPreset, onBeat, onModeChange, onPauseChange }) {
  const gui = new dat.GUI({ title: 'Laboratorio de Partículas' });

  // Controles de Estado y Modos
  const actionsFolder = gui.addFolder('Acciones y Modos');
  
  const stateObj = {
    toggleMode: onModeChange,
    triggerBeat: onBeat,
    resetSim: onReset,
    pauseSim: false
  };

  actionsFolder.add(stateObj, 'toggleMode').name('Alternar Modo (P)');
  actionsFolder.add(stateObj, 'triggerBeat').name('Impulso Beat (B)');
  actionsFolder.add(stateObj, 'resetSim').name('Reiniciar (R)');
  
  const pauseController = actionsFolder.add(stateObj, 'pauseSim').name('Pausar Simulación');
  pauseController.onChange((val) => {
    if (onPauseChange) onPauseChange(val);
  });

  // Presets de Física
  const presetObj = {
    preset: 'inertia',
    apply: () => onPreset(presetObj.preset)
  };
  
  const presetsFolder = gui.addFolder('Presets de Comportamiento');
  presetsFolder.add(presetObj, 'preset', ['inertia', 'wind', 'attract', 'repel', 'vortex']).name('Preset');
  presetsFolder.add(presetObj, 'apply').name('Aplicar Preset');

  // Parámetros de Esfera y Giro
  const sphereFolder = gui.addFolder('Configuración Esfera');
  sphereFolder.add(params.baseRadius, 'value', 1.0, 8.0, 0.1).name('Radio Base');
  sphereFolder.add(params.beatExpansion, 'value', 0.0, 4.0, 0.1).name('Expansión Beat');
  sphereFolder.add(params.spinSpeed, 'value', 0.0, 5.0, 0.1).name('Velocidad Giro (A/S)');

  // Parámetros Generales
  const physicsFolder = gui.addFolder('Física General');
  physicsFolder.add(params.timeScale, 'value', 0.0, 2.0, 0.05).name('Escala de Tiempo');
  physicsFolder.add(params.maxSpeed, 'value', 1.0, 20.0, 0.5).name('Velocidad Máxima');
  physicsFolder.add(params.particleSize, 'value', 0.01, 0.3, 0.01).name('Tamaño Partícula');

  gui.open();

  return {
    setVisible: (visible) => {
      if (visible) gui.show();
      else gui.hide();
    },
    destroy: () => gui.destroy()
  };
}
