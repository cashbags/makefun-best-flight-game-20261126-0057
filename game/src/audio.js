// Sound, all synthesized: an engine hum that follows the throttle, wind
// that follows the speed, and short chimes for rings, landings and mission
// completions. No audio files; the AudioContext starts on first input.
export function createFlightAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let windGain = null;
  let muted = false;
  let started = false;

  function ensureStarted() {
    if (started) return;
    started = true;
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const noiseFilter = context.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 900;
      windGain = context.createGain();
      windGain.gain.value = 0;
      noise.connect(noiseFilter);
      noiseFilter.connect(windGain);
      windGain.connect(context.destination);
      noise.start();
    } catch {
      context = null;
    }
  }

  function beep(frequency, duration, delay, volume) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const gain = context.createGain();
    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  return {
    ensureStarted,
    setMuted(value) {
      muted = value;
      if (engineGain) engineGain.gain.value = value ? 0 : engineGain.gain.value;
    },
    isMuted() {
      return muted;
    },
    updateEngine(throttle, speed, airborne) {
      if (!context || muted) return;
      if (context.state === 'suspended') context.resume();
      const target = airborne ? 0.05 + throttle * 0.11 : 0.02 + throttle * 0.05;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + throttle * 90 + speed * 0.25, context.currentTime, 0.1);
      engineFilter.frequency.setTargetAtTime(280 + throttle * 900, context.currentTime, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0009), context.currentTime, 0.15);
    },
    ringChime() {
      beep(880, 0.35, 0, 0.16);
      beep(1318, 0.4, 0.09, 0.12);
    },
    landingThud(hard) {
      beep(hard ? 70 : 120, 0.3, 0, hard ? 0.3 : 0.18);
    },
    missionComplete() {
      beep(523, 0.3, 0, 0.18);
      beep(659, 0.3, 0.12, 0.18);
      beep(784, 0.45, 0.24, 0.18);
      beep(1046, 0.6, 0.36, 0.16);
    },
    warningBeep() {
      beep(440, 0.18, 0, 0.14);
      beep(440, 0.18, 0.25, 0.14);
    },
  };
}
