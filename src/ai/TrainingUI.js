export class TrainingUI {
  constructor() {
    this.overlay = document.getElementById('training-overlay');
    this._episode = document.getElementById('train-episode');
    this._steps = document.getElementById('train-steps');
    this._epsilon = document.getElementById('train-epsilon');
    this._reward = document.getElementById('train-reward');
    this._avgReward = document.getElementById('train-avg-reward');
    this._wave = document.getElementById('train-wave');
    this._score = document.getElementById('train-score');
    this._buffer = document.getElementById('train-buffer');
    this._visToggle = document.getElementById('train-vis-toggle');
    this._speedSlider = document.getElementById('train-speed');

    this._onStop = null;
    this._onSave = null;

    document.getElementById('train-stop-btn').addEventListener('click', () => {
      if (this._onStop) this._onStop();
    });
    document.getElementById('train-save-btn').addEventListener('click', () => {
      if (this._onSave) this._onSave();
    });
  }

  show() {
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  get showVisualization() {
    return this._visToggle.checked;
  }

  get stepsPerFrame() {
    return parseInt(this._speedSlider.value, 10) || 20;
  }

  onStop(cb) { this._onStop = cb; }
  onSave(cb) { this._onSave = cb; }

  updateStats(stats) {
    this._episode.textContent = stats.episode;
    this._steps.textContent = stats.totalSteps;
    this._epsilon.textContent = stats.epsilon.toFixed(3);
    this._reward.textContent = stats.reward.toFixed(1);
    this._avgReward.textContent = stats.avgReward.toFixed(1);
    this._wave.textContent = stats.wave;
    this._score.textContent = stats.score;
    this._buffer.textContent = stats.bufferSize;
  }
}
