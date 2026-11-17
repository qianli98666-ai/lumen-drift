// Synthesized sound for Lumen Drift: every effect and the ambient music loop
// are built with the Web Audio API, so the game ships no audio files at all.
// Audio starts only after the player's first gesture (the browser's rule).
export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // A slow, dreamy arpeggio in A minor pentatonic: the drifting-field mood.
  const MELODY = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
  const BASS = [110.0, 87.31, 130.81, 98.0];

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    return true;
  }

  function tone({ frequency, endFrequency, duration, type = 'sine', volume = 0.2, when = 0 }) {
    if (!ensureContext() || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noiseBurst({ duration = 0.25, volume = 0.25, lowpass = 1200 }) {
    if (!ensureContext() || muted) return;
    const start = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  function startMusic() {
    if (!ensureContext() || musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const note = MELODY[musicStep % MELODY.length];
      const bass = BASS[Math.floor(musicStep / 2) % BASS.length];
      tone({ frequency: note, duration: 0.9, type: 'triangle', volume: 0.12 });
      if (musicStep % 2 === 0) tone({ frequency: bass, duration: 1.6, type: 'sine', volume: 0.14 });
      if (musicStep % 8 === 7) tone({ frequency: note * 2, duration: 0.6, type: 'sine', volume: 0.05 });
      musicStep += 1;
    }, 420);
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      if (ensureContext()) startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() {
      tone({ frequency: 880, endFrequency: 220, duration: 0.09, type: 'square', volume: 0.07 });
    },
    hit() {
      tone({ frequency: 180, endFrequency: 90, duration: 0.08, type: 'sawtooth', volume: 0.1 });
    },
    explode() {
      noiseBurst({ duration: 0.35, volume: 0.3, lowpass: 900 });
      tone({ frequency: 120, endFrequency: 40, duration: 0.3, type: 'sine', volume: 0.22 });
    },
    pickup() {
      tone({ frequency: 660, duration: 0.07, type: 'sine', volume: 0.1 });
      tone({ frequency: 990, duration: 0.1, type: 'sine', volume: 0.1, when: 0.05 });
    },
    dash() {
      noiseBurst({ duration: 0.16, volume: 0.12, lowpass: 2400 });
    },
    hurt() {
      tone({ frequency: 220, endFrequency: 55, duration: 0.25, type: 'sawtooth', volume: 0.18 });
      noiseBurst({ duration: 0.2, volume: 0.18, lowpass: 700 });
    },
    upgrade() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
        tone({ frequency, duration: 0.16, type: 'triangle', volume: 0.12, when: i * 0.07 });
      });
    },
    waveClear() {
      [392.0, 523.25, 659.25].forEach((frequency, i) => {
        tone({ frequency, duration: 0.2, type: 'triangle', volume: 0.12, when: i * 0.09 });
      });
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, i) => {
        tone({ frequency, duration: 0.3, type: 'triangle', volume: 0.13, when: i * 0.11 });
      });
    },
    gameOver() {
      [392.0, 311.13, 233.08, 155.56].forEach((frequency, i) => {
        tone({ frequency, duration: 0.35, type: 'sine', volume: 0.14, when: i * 0.16 });
      });
    },
  };
}
