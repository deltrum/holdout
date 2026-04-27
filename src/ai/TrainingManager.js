import { TRAINING_CONFIG } from './trainingConfig.js';

export class TrainingManager {
  constructor(engine, agent, aiController, trainingUI) {
    this.engine = engine;
    this.agent = agent;
    this.ai = aiController;
    this.ui = trainingUI;

    this.episode = 0;
    this.totalSteps = agent.totalSteps || 0;
    this.episodeReward = 0;
    this.episodeStep = 0;
    this.rewardHistory = [];

    this.training = false;
    this._rafId = null;
    this._trainPromise = null;
  }

  start() {
    this.training = true;
    this.engine.controlMode = 'training';
    this.engine.stop();
    this.ui.show();
    this._startEpisode();

    // Use rAF with setInterval fallback (for headless/background tabs)
    this._rAFActive = false;
    this._rafId = requestAnimationFrame(() => {
      this._rAFActive = true;
      if (this._fallbackId) {
        clearInterval(this._fallbackId);
        this._fallbackId = null;
      }
      this._trainingFrame();
    });

    this._fallbackId = setTimeout(() => {
      if (!this._rAFActive && this.training) {
        this._fallbackId = setInterval(() => {
          if (this.training) this._trainingFrame();
        }, 1000 / 30);
      } else {
        this._fallbackId = null;
      }
    }, 150);
  }

  stop() {
    this.training = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._fallbackId) {
      clearInterval(this._fallbackId);
      clearTimeout(this._fallbackId);
      this._fallbackId = null;
    }
    this.agent.totalSteps = this.totalSteps;
    this.ui.hide();
  }

  _startEpisode() {
    this.episode++;
    this.episodeReward = 0;
    this.episodeStep = 0;
    this.engine.resetForTraining();
    this.ai.resetEpisode();
  }

  _trainingFrame() {
    if (!this.training) return;

    const startTime = performance.now();
    const stepsPerFrame = this.ui.stepsPerFrame;

    for (let i = 0; i < stepsPerFrame; i++) {
      if (performance.now() - startTime > 14) break;

      this._trainingStep();

      if (this.engine.gameState.gameOver ||
          this.episodeStep >= TRAINING_CONFIG.stepsPerEpisode) {

        // Store terminal transition
        if (this.ai.lastState) {
          const finalReward = this.ai.computeReward(
            this.engine.gameState,
            this.engine.entityManager,
            this.engine.waveSystem,
          );
          this.agent.replayBuffer.push(
            this.ai.lastState, this.ai.lastAction, finalReward, this.ai.lastState, true,
          );
          this.episodeReward += finalReward;
        }

        this.rewardHistory.push(this.episodeReward);
        if (this.rewardHistory.length > 100) this.rewardHistory.shift();

        const avgReward = this.rewardHistory.reduce((a, b) => a + b, 0) / this.rewardHistory.length;

        this.ui.updateStats({
          episode: this.episode,
          reward: this.episodeReward,
          avgReward,
          epsilon: this.agent.getEpsilon(this.totalSteps),
          totalSteps: this.totalSteps,
          bufferSize: this.agent.replayBuffer.size,
          wave: this.engine.waveSystem.currentWave,
          score: (this.engine.gameState.score[1] || 0) + (this.engine.gameState.score[2] || 0),
        });

        this._startEpisode();
        break;
      }
    }

    // Optional visualization render
    if (this.ui.showVisualization) {
      this.engine.particleSystem.update(0.016);
      this.engine.renderSystem.update(0.016, this.engine.entityManager);
    }

    // Async training step (runs between frames)
    if (this.totalSteps % TRAINING_CONFIG.trainFrequency === 0 && !this._trainPromise) {
      this._trainPromise = this.agent.trainStep().then(() => {
        this._trainPromise = null;
      });
    }

    // Re-schedule if using rAF (fallback interval handles itself)
    if (this._rAFActive) {
      this._rafId = requestAnimationFrame(() => this._trainingFrame());
    }
  }

  _trainingStep() {
    const fixedDt = TRAINING_CONFIG.fixedDt;

    // Encode state
    const state = this.ai.encodeState(
      this.engine.entityManager,
      this.engine.waveSystem,
      this.engine.gameState,
      this.engine.elapsed,
    );

    // Select action
    const epsilon = this.agent.getEpsilon(this.totalSteps);
    const action = this.agent.selectAction(state, epsilon);
    this.ai.applyAction(action);

    // Step game
    this.engine.stepHeadless(fixedDt);

    // Compute reward
    const reward = this.ai.computeReward(
      this.engine.gameState,
      this.engine.entityManager,
      this.engine.waveSystem,
    );

    // Encode next state
    const nextState = this.ai.encodeState(
      this.engine.entityManager,
      this.engine.waveSystem,
      this.engine.gameState,
      this.engine.elapsed,
    );

    const done = this.engine.gameState.gameOver;

    // Store experience
    this.agent.replayBuffer.push(
      new Float32Array(state), action, reward, new Float32Array(nextState), done,
    );

    this.ai.lastState = new Float32Array(state);
    this.ai.lastAction = action;
    this.episodeReward += reward;
    this.episodeStep++;
    this.totalSteps++;

    // Soft update target network
    if (this.totalSteps % TRAINING_CONFIG.targetUpdateFreq === 0) {
      this.agent.softUpdateTarget();
    }
  }
}
