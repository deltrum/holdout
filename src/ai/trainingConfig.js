export const TRAINING_CONFIG = {
  // State / Action
  stateSize: 55,
  numActions: 18, // 9 movement × 2 (shoot/don't)

  // Network
  learningRate: 0.001,

  // DQN
  gamma: 0.99,
  batchSize: 64,
  replayBufferSize: 50000,
  minReplaySize: 1000,
  targetUpdateFreq: 500,
  targetUpdateTau: 0.005,

  // Exploration
  epsilonStart: 1.0,
  epsilonEnd: 0.05,
  epsilonDecaySteps: 50000,

  // Training loop
  stepsPerEpisode: 3000,
  trainFrequency: 4,
  fixedDt: 1 / 30,

  // Persistence
  modelSaveKey: 'zombie-dqn-model',
  configSaveKey: 'zombie-dqn-config',
};
