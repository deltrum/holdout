export class AudioSystem {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._muted = false;
    this._volume = 0.4;
    this._noiseBuffer = null;
  }

  _ensureContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master compressor for punch
    this._compressor = this._ctx.createDynamicsCompressor();
    this._compressor.threshold.value = -12;
    this._compressor.knee.value = 6;
    this._compressor.ratio.value = 4;
    this._compressor.attack.value = 0.001;
    this._compressor.release.value = 0.1;

    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = this._volume;
    this._masterGain.connect(this._compressor);
    this._compressor.connect(this._ctx.destination);

    this._createNoiseBuffer();
    this._createWaveshaper();
  }

  _createNoiseBuffer() {
    const sampleRate = this._ctx.sampleRate;
    const length = sampleRate * 0.5;
    this._noiseBuffer = this._ctx.createBuffer(1, length, sampleRate);
    const data = this._noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  _createWaveshaper() {
    // Hard clipping distortion curve — makes sounds aggressive/explosive
    this._distortionCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 512) - 1;
      // Aggressive sigmoid clipping
      this._distortionCurve[i] = Math.tanh(x * 3);
    }
  }

  _makeDistortion() {
    const ws = this._ctx.createWaveShaper();
    ws.curve = this._distortionCurve;
    ws.oversample = '2x';
    return ws;
  }

  _noise(duration, filterFreq, filterQ, gain, detune) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = this._noiseBuffer;
    if (detune) source.detune.value = detune;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);
    filter.Q.value = filterQ || 1;

    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(env);
    env.connect(this._masterGain);
    source.start(now);
    source.stop(now + duration);
  }

  _tone(freq, duration, type, gain, freqEnd) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(env);
    env.connect(this._masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  toggleMute() {
    this._ensureContext();
    this._muted = !this._muted;
    this._masterGain.gain.value = this._muted ? 0 : this._volume;
    return this._muted;
  }

  get muted() {
    return this._muted;
  }

  playGunshot() {
    this._ensureContext();
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const out = this._masterGain;

    // Slight random pitch variation per shot for realism
    const pitchVar = 0.9 + Math.random() * 0.2; // 0.9 - 1.1

    // 1. Initial transient pop — near-zero attack, distorted
    //    The "crack" of the primer igniting. Sub-millisecond spike.
    const pop = ctx.createBufferSource();
    pop.buffer = this._noiseBuffer;
    pop.playbackRate.value = 1.5 * pitchVar;
    const popDist = this._makeDistortion();
    const popHP = ctx.createBiquadFilter();
    popHP.type = 'highpass';
    popHP.frequency.value = 1000;
    const popEnv = ctx.createGain();
    popEnv.gain.setValueAtTime(0.7, now);
    popEnv.gain.setValueAtTime(0.7, now + 0.001);
    popEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    pop.connect(popDist);
    popDist.connect(popHP);
    popHP.connect(popEnv);
    popEnv.connect(out);
    pop.start(now);
    pop.stop(now + 0.02);

    // 2. Muzzle blast — the main "bark", wide spectrum through distortion
    //    This is the expanding gas from the barrel. Short, aggressive.
    const blast = ctx.createBufferSource();
    blast.buffer = this._noiseBuffer;
    blast.playbackRate.value = 0.8 * pitchVar;
    const blastDist = this._makeDistortion();
    const blastBP = ctx.createBiquadFilter();
    blastBP.type = 'bandpass';
    blastBP.frequency.setValueAtTime(2500 * pitchVar, now);
    blastBP.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    blastBP.Q.value = 0.6;
    const blastEnv = ctx.createGain();
    blastEnv.gain.setValueAtTime(0.55, now);
    blastEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    blast.connect(blastDist);
    blastDist.connect(blastBP);
    blastBP.connect(blastEnv);
    blastEnv.connect(out);
    blast.start(now);
    blast.stop(now + 0.08);

    // 3. Low-end body — chest thump, sine with fast pitch drop
    //    The concussive pressure wave you feel in your body.
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(150 * pitchVar, now);
    body.frequency.exponentialRampToValueAtTime(20, now + 0.06);
    const bodyEnv = ctx.createGain();
    bodyEnv.gain.setValueAtTime(0.5, now);
    bodyEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    body.connect(bodyEnv);
    bodyEnv.connect(out);
    body.start(now);
    body.stop(now + 0.1);

    // 4. Mechanical action — bolt/slide cycling, delayed metallic click
    //    The weapon's action cycling after firing.
    const mech = ctx.createBufferSource();
    mech.buffer = this._noiseBuffer;
    mech.playbackRate.value = 2.0;
    const mechBP = ctx.createBiquadFilter();
    mechBP.type = 'bandpass';
    mechBP.frequency.value = 5000;
    mechBP.Q.value = 4;
    const mechEnv = ctx.createGain();
    mechEnv.gain.setValueAtTime(0.001, now);
    mechEnv.gain.setValueAtTime(0.15, now + 0.025); // delayed start
    mechEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    mech.connect(mechBP);
    mechBP.connect(mechEnv);
    mechEnv.connect(out);
    mech.start(now);
    mech.stop(now + 0.06);

    // 5. Supersonic snap — very short high-freq burst, slightly delayed
    //    The bullet breaking the sound barrier.
    const snap = ctx.createBufferSource();
    snap.buffer = this._noiseBuffer;
    snap.playbackRate.value = 3.0;
    const snapHP = ctx.createBiquadFilter();
    snapHP.type = 'highpass';
    snapHP.frequency.value = 6000;
    const snapEnv = ctx.createGain();
    snapEnv.gain.setValueAtTime(0.001, now);
    snapEnv.gain.setValueAtTime(0.2, now + 0.003);
    snapEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    snap.connect(snapHP);
    snapHP.connect(snapEnv);
    snapEnv.connect(out);
    snap.start(now);
    snap.stop(now + 0.02);

    // 6. Room reflection — low-pass delayed copy simulating environment bounce
    //    Early reflections off nearby walls/ground.
    const ref1 = ctx.createBufferSource();
    ref1.buffer = this._noiseBuffer;
    const ref1LP = ctx.createBiquadFilter();
    ref1LP.type = 'lowpass';
    ref1LP.frequency.setValueAtTime(600, now);
    ref1LP.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    const ref1Env = ctx.createGain();
    ref1Env.gain.setValueAtTime(0.001, now);
    ref1Env.gain.setValueAtTime(0.08, now + 0.03);
    ref1Env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    ref1.connect(ref1LP);
    ref1LP.connect(ref1Env);
    ref1Env.connect(out);
    ref1.start(now);
    ref1.stop(now + 0.2);

    // 7. Distant tail — very quiet, heavily filtered, long decay
    //    The shot echoing across the environment.
    const tail = ctx.createBufferSource();
    tail.buffer = this._noiseBuffer;
    const tailLP = ctx.createBiquadFilter();
    tailLP.type = 'lowpass';
    tailLP.frequency.setValueAtTime(400, now);
    tailLP.frequency.exponentialRampToValueAtTime(80, now + 0.3);
    const tailEnv = ctx.createGain();
    tailEnv.gain.setValueAtTime(0.001, now);
    tailEnv.gain.setValueAtTime(0.05, now + 0.05);
    tailEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    tail.connect(tailLP);
    tailLP.connect(tailEnv);
    tailEnv.connect(out);
    tail.start(now);
    tail.stop(now + 0.4);
  }

  playZombieHit() {
    this._ensureContext();
    // Meaty thud
    this._noise(0.1, 800, 3, 0.3, -400);
    this._tone(200, 0.08, 'sine', 0.2, 80);
  }

  playZombieDeath() {
    this._ensureContext();
    // Deeper thud + pitch drop
    this._noise(0.2, 600, 2, 0.4, -800);
    this._tone(300, 0.25, 'sawtooth', 0.15, 40);
    this._tone(120, 0.15, 'sine', 0.2, 30);
  }

  playReload() {
    this._ensureContext();
    // Metallic click sequence
    this._noise(0.03, 6000, 5, 0.25, 0);
    const ctx = this._ctx;
    setTimeout(() => {
      if (ctx.state === 'running') {
        this._noise(0.04, 8000, 8, 0.3, 200);
        this._tone(800, 0.02, 'square', 0.1, 2000);
      }
    }, 80);
  }

  playWaveStart() {
    this._ensureContext();
    // Rising tone sweep
    this._tone(200, 0.6, 'sawtooth', 0.12, 800);
    this._tone(300, 0.5, 'sine', 0.08, 600);
  }

  playDamage() {
    this._ensureContext();
    // Low rumble hit
    this._noise(0.15, 400, 1, 0.35, -600);
    this._tone(80, 0.2, 'sine', 0.25, 40);
  }

  playGameOver() {
    this._ensureContext();
    // Descending tones
    this._tone(400, 0.8, 'sawtooth', 0.1, 80);
    this._tone(300, 1.0, 'sine', 0.12, 50);
    this._noise(0.5, 300, 1, 0.15, -1000);
  }
}
