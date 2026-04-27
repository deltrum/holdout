import { TRAINING_CONFIG } from './trainingConfig.js';

class ReplayBuffer {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.pos = 0;
  }

  push(state, action, reward, nextState, done) {
    const exp = {
      state: new Float32Array(state),
      action,
      reward,
      nextState: new Float32Array(nextState),
      done,
    };
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(exp);
    } else {
      this.buffer[this.pos] = exp;
    }
    this.pos = (this.pos + 1) % this.maxSize;
  }

  sample(batchSize) {
    const results = [];
    const used = new Set();
    const len = this.buffer.length;
    while (results.length < batchSize) {
      const idx = Math.floor(Math.random() * len);
      if (!used.has(idx)) {
        used.add(idx);
        results.push(this.buffer[idx]);
      }
    }
    return results;
  }

  get size() { return this.buffer.length; }
}

export class DQNAgent {
  constructor() {
    this.replayBuffer = new ReplayBuffer(TRAINING_CONFIG.replayBufferSize);
    this.totalSteps = 0;
    this.onlineModel = null;
    this.targetModel = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    const tf = window.tf;
    this.onlineModel = this._buildModel(tf);
    this.targetModel = this._buildModel(tf);
    this._copyWeights();
    this._initialized = true;
  }

  _buildModel(tf) {
    const model = tf.sequential();
    model.add(tf.layers.dense({
      inputShape: [TRAINING_CONFIG.stateSize],
      units: 128,
      activation: 'relu',
    }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: TRAINING_CONFIG.numActions, activation: 'linear' }));
    model.compile({
      optimizer: tf.train.adam(TRAINING_CONFIG.learningRate),
      loss: 'meanSquaredError',
    });
    return model;
  }

  _copyWeights() {
    const weights = this.onlineModel.getWeights();
    this.targetModel.setWeights(weights);
  }

  getEpsilon(totalSteps) {
    const { epsilonStart, epsilonEnd, epsilonDecaySteps } = TRAINING_CONFIG;
    const frac = Math.min(1.0, totalSteps / epsilonDecaySteps);
    return epsilonStart + (epsilonEnd - epsilonStart) * frac;
  }

  selectAction(state, epsilon) {
    if (Math.random() < epsilon) {
      return Math.floor(Math.random() * TRAINING_CONFIG.numActions);
    }
    const tf = window.tf;
    return tf.tidy(() => {
      const input = tf.tensor2d([Array.from(state)]);
      const qValues = this.onlineModel.predict(input);
      return qValues.argMax(1).dataSync()[0];
    });
  }

  async trainStep() {
    if (this.replayBuffer.size < TRAINING_CONFIG.minReplaySize) return;
    const tf = window.tf;

    const batch = this.replayBuffer.sample(TRAINING_CONFIG.batchSize);

    const states = tf.tensor2d(batch.map(e => Array.from(e.state)));
    const nextStates = tf.tensor2d(batch.map(e => Array.from(e.nextState)));

    const qValues = this.onlineModel.predict(states);
    const nextQValues = this.targetModel.predict(nextStates);

    const qArray = await qValues.array();
    const nextQArray = await nextQValues.array();

    for (let i = 0; i < batch.length; i++) {
      const { action, reward, done } = batch[i];
      if (done) {
        qArray[i][action] = reward;
      } else {
        qArray[i][action] = reward + TRAINING_CONFIG.gamma * Math.max(...nextQArray[i]);
      }
    }

    const targetTensor = tf.tensor2d(qArray);

    await this.onlineModel.fit(states, targetTensor, {
      epochs: 1,
      batchSize: TRAINING_CONFIG.batchSize,
      verbose: 0,
    });

    tf.dispose([states, nextStates, qValues, nextQValues, targetTensor]);
  }

  softUpdateTarget() {
    const tf = window.tf;
    const tau = TRAINING_CONFIG.targetUpdateTau;

    const onlineWeights = this.onlineModel.getWeights();
    const targetWeights = this.targetModel.getWeights();

    const updated = [];
    for (let i = 0; i < onlineWeights.length; i++) {
      const u = tf.tidy(() =>
        tf.add(tf.mul(onlineWeights[i], tau), tf.mul(targetWeights[i], 1 - tau)),
      );
      updated.push(u);
    }

    this.targetModel.setWeights(updated);

    // Dispose the getWeights() returns (they are copies)
    onlineWeights.forEach(w => w.dispose());
    targetWeights.forEach(w => w.dispose());
  }

  async saveModel() {
    await this.onlineModel.save('localstorage://zombie-dqn-model');
    localStorage.setItem(TRAINING_CONFIG.configSaveKey, JSON.stringify({
      totalSteps: this.totalSteps,
    }));
  }

  async loadModel() {
    try {
      const tf = window.tf;
      this.onlineModel = await tf.loadLayersModel('localstorage://zombie-dqn-model');
      this.onlineModel.compile({
        optimizer: tf.train.adam(TRAINING_CONFIG.learningRate),
        loss: 'meanSquaredError',
      });
      this._copyWeights();
      this._initialized = true;

      const cfg = JSON.parse(localStorage.getItem(TRAINING_CONFIG.configSaveKey));
      if (cfg) this.totalSteps = cfg.totalSteps || 0;
      return true;
    } catch {
      return false;
    }
  }
}
