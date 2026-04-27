import { GameEngine } from './core/GameEngine.js';

const canvas = document.getElementById('game-canvas');
const engine = new GameEngine(canvas);

// Human play
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  engine.controlMode = 'human';
  engine.init();
  engine.start();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('game-over-screen').classList.add('hidden');
  engine.restart();
});

// Watch AI play
document.getElementById('ai-play-btn').addEventListener('click', async () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('ai-indicator').classList.remove('hidden');

  await loadTFJS();

  const { AIController } = await import('./ai/AIController.js');
  const { DQNAgent } = await import('./ai/DQNAgent.js');

  engine.controlMode = 'ai';
  engine.init();

  const agent = new DQNAgent();
  const loaded = await agent.loadModel();
  if (!loaded) {
    agent.init();
  }

  const ai = new AIController(engine);
  ai.setAgent(agent);
  engine.aiController = ai;

  engine.start();
});

// Train AI
document.getElementById('train-btn').addEventListener('click', async () => {
  document.getElementById('start-screen').classList.add('hidden');

  await loadTFJS();

  const { AIController } = await import('./ai/AIController.js');
  const { DQNAgent } = await import('./ai/DQNAgent.js');
  const { TrainingManager } = await import('./ai/TrainingManager.js');
  const { TrainingUI } = await import('./ai/TrainingUI.js');

  engine.controlMode = 'training';
  engine.init();

  const agent = new DQNAgent();
  const loaded = await agent.loadModel();
  if (!loaded) {
    agent.init();
  }

  const ai = new AIController(engine);
  ai.setAgent(agent);
  engine.aiController = ai;

  const trainingUI = new TrainingUI();
  const trainer = new TrainingManager(engine, agent, ai, trainingUI);

  trainingUI.onStop(() => {
    trainer.stop();
    document.getElementById('start-screen').classList.remove('hidden');
  });

  trainingUI.onSave(async () => {
    await agent.saveModel();
    console.log('Model saved to localStorage');
  });

  trainer.start();
});

async function loadTFJS() {
  if (window.tf) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
