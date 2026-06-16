const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const RANGES = {
  low: [45, 64],
  middle: [48, 72],
  high: [55, 79],
};
const MAJOR_KEYS = [0, 2, 5, 7, 9, 10];
const KEY_LABELS = {
  0: "C",
  2: "D",
  5: "F",
  7: "G",
  9: "A",
  10: "B♭",
};
const PIANO_SAMPLE_BASE = "samples/grand";
const GRAND_PIANO_SAMPLES = [
  ["A0", 21], ["C1", 24], ["Ds1", 27], ["Fs1", 30],
  ["A1", 33], ["C2", 36], ["Ds2", 39], ["Fs2", 42],
  ["A2", 45], ["C3", 48], ["Ds3", 51], ["Fs3", 54],
  ["A3", 57], ["C4", 60], ["Ds4", 63], ["Fs4", 66],
  ["A4", 69], ["C5", 72], ["Ds5", 75], ["Fs5", 78],
  ["A5", 81], ["C6", 84], ["Ds6", 87], ["Fs6", 90],
  ["A6", 93], ["C7", 96], ["Ds7", 99], ["Fs7", 102],
  ["A7", 105], ["C8", 108],
].map(([name, midi]) => ({ name, midi }));
const DEGREE_OPTIONS = [
  { degree: 1, roman: "I" },
  { degree: 2, roman: "ii" },
  { degree: 3, roman: "iii" },
  { degree: 4, roman: "IV" },
  { degree: 5, roman: "V" },
  { degree: 6, roman: "vi" },
  { degree: 7, roman: "vii°" },
];
const UPPER_ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC_TRIADS = {
  1: { label: "I", intervals: [0, 4, 7] },
  2: { label: "ii", intervals: [0, 3, 7] },
  3: { label: "iii", intervals: [0, 3, 7] },
  4: { label: "IV", intervals: [0, 4, 7] },
  5: { label: "V", intervals: [0, 4, 7] },
  6: { label: "vi", intervals: [0, 3, 7] },
  7: { label: "vii°", intervals: [0, 3, 6] },
};
const DIATONIC_SEVENTHS = {
  1: { label: "Imaj7", intervals: [0, 4, 7, 11] },
  2: { label: "ii7", intervals: [0, 3, 7, 10] },
  3: { label: "iii7", intervals: [0, 3, 7, 10] },
  4: { label: "IVmaj7", intervals: [0, 4, 7, 11] },
  5: { label: "V7", intervals: [0, 4, 7, 10] },
  6: { label: "vi7", intervals: [0, 3, 7, 10] },
  7: { label: "viiø7", intervals: [0, 3, 6, 10] },
};
const MIXED_CHORD_TYPES = [
  { suffix: "", intervals: [0, 4, 7] },
  { suffix: "m", intervals: [0, 3, 7] },
  { suffix: "°", intervals: [0, 3, 6] },
  { suffix: "+", intervals: [0, 4, 8] },
  { suffix: "sus4", intervals: [0, 5, 7] },
  { suffix: "7", intervals: [0, 4, 7, 10] },
  { suffix: "maj7", intervals: [0, 4, 7, 11] },
  { suffix: "m7", intervals: [0, 3, 7, 10] },
  { suffix: "ø7", intervals: [0, 3, 6, 10] },
  { suffix: "maj9", intervals: [0, 4, 7, 11, 14] },
  { suffix: "m9", intervals: [0, 3, 7, 10, 14] },
  { suffix: "13", intervals: [0, 4, 7, 10, 21] },
];
const COMMON_PROGRESSIONS = [
  [1, 5, 6, 4],
  [1, 4, 5, 1],
  [6, 4, 1, 5],
  [2, 5, 1, 6],
  [1, 6, 2, 5],
  [4, 5, 3, 6],
  [1, 3, 4, 5],
  [1, 2, 5, 1],
];
const MIN_RMS = 0.003;
const MIN_RECORDING_MS = 700;

const els = {
  trainingMode: document.querySelector("#trainingMode"),
  noteCount: document.querySelector("#noteCount"),
  countLabel: document.querySelector("#countLabel"),
  range: document.querySelector("#range"),
  rangeSetting: document.querySelector("#rangeSetting"),
  difficulty: document.querySelector("#difficulty"),
  difficultySetting: document.querySelector("#difficultySetting"),
  tolerance: document.querySelector("#tolerance"),
  chordLevel: document.querySelector("#chordLevel"),
  chordLevelSetting: document.querySelector("#chordLevelSetting"),
  chordKey: document.querySelector("#chordKey"),
  chordKeySetting: document.querySelector("#chordKeySetting"),
  octaveDirection: document.querySelector("#octaveDirection"),
  octaveDirectionSetting: document.querySelector("#octaveDirectionSetting"),
  noteTrack: document.querySelector("#noteTrack"),
  playButton: document.querySelector("#playButton"),
  singButton: document.querySelector("#singButton"),
  singButtonIcon: document.querySelector("#singButtonIcon"),
  singButtonText: document.querySelector("#singButtonText"),
  newQuestionButton: document.querySelector("#newQuestionButton"),
  nextButton: document.querySelector("#nextButton"),
  attemptNumber: document.querySelector("#attemptNumber"),
  micStatus: document.querySelector("#micStatus"),
  singingConsole: document.querySelector("#singingConsole"),
  holdHint: document.querySelector("#holdHint"),
  detectedNote: document.querySelector("#detectedNote"),
  detectedFrequency: document.querySelector("#detectedFrequency"),
  meterNeedle: document.querySelector("#meterNeedle"),
  centsDisplay: document.querySelector("#centsDisplay"),
  recordingTime: document.querySelector("#recordingTime"),
  volumeBar: document.querySelector("#volumeBar"),
  inputState: document.querySelector("#inputState"),
  chordAnswerPanel: document.querySelector("#chordAnswerPanel"),
  answerGrid: document.querySelector("#answerGrid"),
  submitAnswerButton: document.querySelector("#submitAnswerButton"),
  helperText: document.querySelector("#helperText"),
  resultPanel: document.querySelector("#resultPanel"),
  resultList: document.querySelector("#resultList"),
  totalScore: document.querySelector("#totalScore"),
  resultTitle: document.querySelector("#resultTitle"),
};

let sequence = [];
let chordProgression = [];
let octaveQuestion = null;
let currentMode = "melody";
let chordKey = 0;
let chordLevel = "triads";
let attempt = 1;
let audioContext;
let analyser;
let mediaStream;
let sourceNode;
let animationFrame;
let playbackTimer;
let playbackNodes = [];
let pianoSampleCache = new Map();
let pianoSampleBuffers = new Map();
let pitchHistory = [];
let recordedPitches = [];
let recordingStartedAt = 0;
let results = [];
let isListening = false;
let isStarting = false;
let cancelStartRequested = false;
let isPlaying = false;
let lastSignalAt = 0;

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToLabel(midi) {
  const rounded = Math.round(midi);
  return {
    name: NOTE_NAMES[((rounded % 12) + 12) % 12],
    octave: Math.floor(rounded / 12) - 1,
  };
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getSelectedCount({ min = 2, max = 8 } = {}) {
  if (els.noteCount.value === "random") {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  return Number(els.noteCount.value);
}

function resolveMelodyDifficulty() {
  return els.difficulty.value === "random"
    ? randomItem(["easy", "medium", "hard"])
    : els.difficulty.value;
}

function resolveChordLevel() {
  return els.chordLevel.value === "random"
    ? randomItem(["triads", "sevenths", "extended"])
    : els.chordLevel.value;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function createSequence() {
  pauseListening({ message: "" });
  resetPlayback();
  currentMode = els.trainingMode.value;
  updateModeUI();
  els.resultPanel.hidden = true;
  els.singingConsole.hidden = true;
  els.chordAnswerPanel.hidden = currentMode !== "chords";
  results = [];

  if (currentMode === "chords") {
    createChordQuestion();
    return;
  }
  if (currentMode === "octave") {
    createOctaveQuestion();
    return;
  }

  createMelodyQuestion();
}

function createMelodyQuestion() {
  const count = getSelectedCount({ min: 2, max: 8 });
  const [min, max] = RANGES[els.range.value];
  const difficulty = resolveMelodyDifficulty();
  const candidates = [];

  for (let midi = min; midi <= max; midi += 1) {
    if (difficulty !== "easy" || NATURAL_PITCH_CLASSES.has(midi % 12)) {
      candidates.push(midi);
    }
  }

  sequence = [randomItem(candidates)];
  while (sequence.length < count) {
    const previous = sequence.at(-1);
    let options = candidates.filter((midi) => midi !== previous);
    if (difficulty === "easy") {
      options = options.filter((midi) => Math.abs(midi - previous) <= 7);
    } else if (difficulty === "medium") {
      options = options.filter((midi) => Math.abs(midi - previous) <= 12);
    } else {
      const leaps = options.filter((midi) => Math.abs(midi - previous) >= 5);
      options = Math.random() < 0.65 && leaps.length ? leaps : options;
    }
    sequence.push(randomItem(options));
  }

  els.singButton.disabled = false;
  els.singButton.hidden = false;
  els.playButton.disabled = false;
  els.helperText.textContent = "播放并记住乐句，然后一口气自然哼完全部音符。";
  renderNotes(false);
}

function createChordQuestion() {
  const count = getSelectedCount({ min: 2, max: 6 });
  chordLevel = resolveChordLevel();
  chordKey = els.chordKey.value === "random" ? randomItem(MAJOR_KEYS) : Number(els.chordKey.value);
  const source = randomItem(COMMON_PROGRESSIONS);
  chordProgression = [];
  for (let i = 0; i < count; i += 1) {
    const degree = source[i % source.length];
    chordProgression.push({
      degree,
      level: chordLevel,
      key: chordKey,
      type: chordLevel === "extended" ? randomItem(MIXED_CHORD_TYPES) : null,
    });
  }

  els.singButton.hidden = true;
  els.playButton.disabled = false;
  els.submitAnswerButton.disabled = false;
  els.helperText.textContent = "先听主和弦建立调性感，再判断后面每个和弦的级数。";
  renderChordCards(false);
  renderChordAnswerInputs();
}

function createOctaveQuestion() {
  const direction = els.octaveDirection.value === "random"
    ? randomItem(["up", "down"])
    : els.octaveDirection.value;
  const [min, max] = direction === "up" ? [45, 64] : [60, 79];
  const source = min + Math.floor(Math.random() * (max - min + 1));
  const target = source + (direction === "up" ? 12 : -12);
  octaveQuestion = { direction, source, target };
  sequence = [target];

  els.singButton.disabled = false;
  els.singButton.hidden = false;
  els.playButton.disabled = false;
  els.submitAnswerButton.disabled = true;
  els.helperText.textContent = direction === "up"
    ? "播放低音后，直接唱出它的高八度音。"
    : "播放高音后，直接唱出它的低八度音。";
  renderOctaveCards(false);
}

function renderNotes(reveal = false) {
  els.noteTrack.innerHTML = "";
  sequence.forEach((midi, index) => {
    const card = document.createElement("div");
    const label = midiToLabel(midi);
    card.className = `note-card${reveal ? "" : " hidden-note"}`;
    card.dataset.index = index;
    card.innerHTML = reveal
      ? `<span>${label.name}<small>${label.octave}</small></span>`
      : "<span>?</span>";
    els.noteTrack.append(card);
    if (index < sequence.length - 1) {
      const line = document.createElement("div");
      line.className = "track-line";
      els.noteTrack.append(line);
    }
  });
}

function renderOctaveCards(reveal = false) {
  els.noteTrack.innerHTML = "";
  const sourceLabel = midiToLabel(octaveQuestion.source);
  const targetLabel = midiToLabel(octaveQuestion.target);
  const directionText = octaveQuestion.direction === "up" ? "高八度" : "低八度";
  [
    {
      title: reveal ? `${sourceLabel.name}${sourceLabel.octave}` : "原音",
      detail: "播放给你",
      hidden: !reveal,
    },
    {
      title: reveal ? `${targetLabel.name}${targetLabel.octave}` : "?",
      detail: `唱${directionText}`,
      hidden: !reveal,
    },
  ].forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `note-card${item.hidden ? " hidden-note" : ""}`;
    card.dataset.index = index;
    card.innerHTML = `<span>${item.title}<small>${item.detail}</small></span>`;
    els.noteTrack.append(card);
    if (index === 0) {
      const line = document.createElement("div");
      line.className = "track-line";
      els.noteTrack.append(line);
    }
  });
}

function updateModeUI() {
  const chordMode = els.trainingMode.value === "chords";
  const octaveMode = els.trainingMode.value === "octave";
  els.countLabel.textContent = chordMode ? "和弦数量" : "音符数量";
  const randomCountOption = els.noteCount.querySelector('option[value="random"]');
  if (randomCountOption) {
    randomCountOption.textContent = chordMode ? "任意 2–6 个" : "任意 2–8 个";
  }
  els.noteCount.closest("label").hidden = octaveMode;
  els.rangeSetting.hidden = chordMode || octaveMode;
  els.difficultySetting.hidden = chordMode || octaveMode;
  els.chordLevelSetting.hidden = !chordMode;
  els.chordKeySetting.hidden = !chordMode;
  els.octaveDirectionSetting.hidden = !octaveMode;
  els.chordAnswerPanel.hidden = !chordMode;
  els.singButton.hidden = chordMode;
  els.playButton.querySelector(".button-icon").textContent = "▶";
}

function chordDefinition(chord) {
  if (chord.level === "triads") return DIATONIC_TRIADS[chord.degree];
  if (chord.level === "sevenths") return DIATONIC_SEVENTHS[chord.degree];
  const type = chord.type || randomItem(MIXED_CHORD_TYPES);
  return {
    label: mixedChordLabel(chord.degree, type.suffix),
    intervals: type.intervals,
  };
}

function mixedChordLabel(degree, suffix) {
  const upper = UPPER_ROMANS[degree - 1] || "?";
  const lower = upper.toLowerCase();
  if (suffix === "m") return lower;
  if (suffix === "m7") return `${lower}7`;
  if (suffix === "m9") return `${lower}9`;
  if (suffix === "°") return `${lower}°`;
  if (suffix === "ø7") return `${lower}ø7`;
  return `${upper}${suffix}`;
}

function chordLabel(chord) {
  return chordDefinition(chord).label;
}

function keyLabel(key) {
  const normalizedKey = ((key % 12) + 12) % 12;
  return `${KEY_LABELS[normalizedKey] || NOTE_NAMES[normalizedKey]} 大调`;
}

function renderChordCards(reveal = false) {
  els.noteTrack.innerHTML = "";
  chordProgression.forEach((chord, index) => {
    const card = document.createElement("div");
    card.className = `note-card${reveal ? "" : " hidden-note"}`;
    card.dataset.index = index;
    card.innerHTML = reveal
      ? `<span>${chordLabel(chord)}<small>${keyLabel(chord.key)}</small></span>`
      : "<span>?</span>";
    els.noteTrack.append(card);
    if (index < chordProgression.length - 1) {
      const line = document.createElement("div");
      line.className = "track-line";
      els.noteTrack.append(line);
    }
  });
}

function renderChordAnswerInputs() {
  els.answerGrid.innerHTML = "";
  chordProgression.forEach((_, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "answer-item";
    const options = DEGREE_OPTIONS.map((item) => (
      `<option value="${item.degree}">${item.roman}</option>`
    )).join("");
    wrapper.innerHTML = `
      <span>第 ${index + 1} 个和弦</span>
      <select class="degree-answer" data-index="${index}">
        <option value="">选择级数</option>
        ${options}
      </select>
    `;
    els.answerGrid.append(wrapper);
  });
}

function setActiveNote(index) {
  document.querySelectorAll(".note-card").forEach((card) => {
    const cardIndex = Number(card.dataset.index);
    card.classList.toggle("active", cardIndex === index);
    card.classList.toggle("correct", cardIndex < index);
  });
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  try {
    return new AudioContextClass({ latencyHint: "interactive" });
  } catch (error) {
    return new AudioContextClass();
  }
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

async function getAudioContext({ recreate = false } = {}) {
  if (recreate && audioContext && audioContext.state !== "closed") {
    await withTimeout(audioContext.close().catch(() => {}), 800, "AudioContext close timed out").catch(() => {});
    audioContext = null;
  }
  if (!audioContext || audioContext.state === "closed") {
    audioContext = createAudioContext();
  }

  if (audioContext.state !== "running") {
    await withTimeout(audioContext.resume().catch(() => {}), 1200, "AudioContext resume timed out");
  }

  // Safari can leave a context in its non-standard "interrupted" state after
  // repeated reloads, calls, or backgrounding. Recreate it from this user tap.
  if (audioContext.state !== "running") {
    await withTimeout(audioContext.close().catch(() => {}), 800, "AudioContext close timed out").catch(() => {});
    audioContext = createAudioContext();
    await withTimeout(audioContext.resume().catch(() => {}), 1200, "AudioContext resume timed out");
  }

  if (audioContext.state !== "running") {
    throw new Error(`AudioContext is ${audioContext.state}`);
  }

  // A silent buffer unlocks output reliably on iOS Safari.
  const unlockBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
  const unlockSource = audioContext.createBufferSource();
  unlockSource.buffer = unlockBuffer;
  unlockSource.connect(audioContext.destination);
  unlockSource.start(0);
  return audioContext;
}

async function playSequence() {
  if (isPlaying || isListening || isStarting) return;
  if (currentMode === "chords") {
    await playChordProgression();
    return;
  }
  if (currentMode === "octave") {
    await playOctavePrompt();
    return;
  }

  isPlaying = true;
  els.playButton.disabled = true;
  els.singButton.disabled = true;
  try {
    let context;
    try {
      context = await getAudioContext();
    } catch (error) {
      context = await getAudioContext({ recreate: true });
    }
    await preloadPianoSamples(context, sequence);
    const startAt = context.currentTime + 0.08;
    const noteLength = 0.72;
    sequence.forEach((midi, index) => {
      const noteStart = startAt + index * noteLength;
      schedulePianoSample(context, midi, noteStart, 0.68, 0.82);
      window.setTimeout(() => setActiveNote(index), Math.max(0, (noteStart - context.currentTime) * 1000));
    });
    playbackTimer = window.setTimeout(resetPlayback, sequence.length * noteLength * 1000 + 150);
  } catch (error) {
    console.error(error);
    els.helperText.textContent = `钢琴音色播放失败：${error.message || "请再点一次播放题目"}`;
    resetPlayback();
  }
}

async function playOctavePrompt() {
  isPlaying = true;
  els.playButton.disabled = true;
  els.singButton.disabled = true;
  try {
    let context;
    try {
      context = await getAudioContext();
    } catch (error) {
      context = await getAudioContext({ recreate: true });
    }
    await preloadPianoSamples(context, [octaveQuestion.source]);
    const startAt = context.currentTime + 0.08;
    schedulePianoSample(context, octaveQuestion.source, startAt, 1.0, 0.85);
    window.setTimeout(() => setActiveNote(0), Math.max(0, (startAt - context.currentTime) * 1000));
    playbackTimer = window.setTimeout(resetPlayback, 1180);
  } catch (error) {
    console.error(error);
    els.helperText.textContent = `钢琴音色播放失败：${error.message || "请再点一次播放题目"}`;
    resetPlayback();
  }
}

function chordMidiNotes(chord) {
  const scaleDegreeOffset = MAJOR_SCALE[chord.degree - 1];
  const root = 48 + chord.key + scaleDegreeOffset;
  const intervals = chordDefinition(chord).intervals;
  const voicing = intervals.map((interval) => root + interval);
  const bass = root - 12;
  return [bass, ...voicing.map((midi, index) => midi + (index > 2 ? 12 : 0))];
}

function nearestPianoSample(midi) {
  return GRAND_PIANO_SAMPLES.reduce((nearest, sample) => (
    Math.abs(sample.midi - midi) < Math.abs(nearest.midi - midi) ? sample : nearest
  ), GRAND_PIANO_SAMPLES[0]);
}

async function loadPianoSample(context, midi) {
  const sampleName = nearestPianoSample(midi).name;
  if (!pianoSampleCache.has(sampleName)) {
    const samplePromise = loadArrayBuffer(`${PIANO_SAMPLE_BASE}/${sampleName}.mp3`)
      .then((arrayBuffer) => decodeAudioBuffer(context, arrayBuffer))
      .then((buffer) => {
        pianoSampleBuffers.set(sampleName, buffer);
        return buffer;
      });
    pianoSampleCache.set(sampleName, samplePromise);
  }
  return pianoSampleCache.get(sampleName);
}

function decodeAudioBuffer(context, arrayBuffer) {
  return new Promise((resolve, reject) => {
    const copy = arrayBuffer.slice(0);
    try {
      const maybePromise = context.decodeAudioData(copy, resolve, reject);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function loadArrayBuffer(url) {
  if (window.fetch) {
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Piano sample failed: ${url}`);
      return response.arrayBuffer();
    });
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response);
      } else {
        reject(new Error(`Piano sample failed: ${url}`));
      }
    };
    request.onerror = () => reject(new Error(`Piano sample failed: ${url}`));
    request.send();
  });
}

async function preloadPianoSamples(context, midiNotes) {
  const uniqueSamples = [...new Set(midiNotes.map((midi) => nearestPianoSample(midi).midi))];
  await Promise.all(uniqueSamples.map((midi) => loadPianoSample(context, midi)));
}

function schedulePianoSample(context, midi, startAt, duration, gainValue = 0.8) {
  const sample = nearestPianoSample(midi);
  const buffer = pianoSampleBuffers.get(sample.name);
  if (!buffer) throw new Error(`Piano sample ${sample.name} is not loaded`);
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = Math.pow(2, (midi - sample.midi) / 12);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.012);
  gain.gain.setValueAtTime(gainValue * 0.7, startAt + duration * 0.46);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(gain).connect(context.destination);
  source.start(startAt);
  source.stop(startAt + duration + 0.08);
  playbackNodes.push(source);
  source.addEventListener("ended", () => {
    playbackNodes = playbackNodes.filter((item) => item !== source);
    if (currentMode === "chords" && isPlaying && playbackNodes.length === 0) {
      finishChordPlayback();
    }
  });
}

function finishChordPlayback() {
  resetPlayback();
  els.submitAnswerButton.disabled = false;
}

async function playChordProgression() {
  isPlaying = true;
  els.playButton.disabled = true;
  els.submitAnswerButton.disabled = true;
  try {
    let context;
    try {
      context = await getAudioContext();
    } catch (error) {
      context = await getAudioContext({ recreate: true });
    }
    const startAt = context.currentTime + 0.08;
    const chordLength = 1.08;
    const gap = 0.15;
    const tonic = { degree: 1, level: "triads", key: chordKey, type: null };
    const tonicNotes = chordMidiNotes(tonic);
    const questionNotes = chordProgression.flatMap((chord) => chordMidiNotes(chord));
    await preloadPianoSamples(context, [48 + chordKey, ...tonicNotes, ...questionNotes]);

    // Establish the key before the actual question.
    schedulePianoSample(context, 48 + chordKey, startAt, 0.45, 0.58);
    tonicNotes.forEach((midi, noteIndex) => {
      schedulePianoSample(context, midi, startAt + 0.48 + noteIndex * 0.012, 0.82, noteIndex === 0 ? 0.58 : 0.42);
    });

    const questionStart = startAt + 1.5;
    chordProgression.forEach((chord, index) => {
      const chordStart = questionStart + index * (chordLength + gap);
      chordMidiNotes(chord).forEach((midi, noteIndex) => {
        schedulePianoSample(context, midi, chordStart + noteIndex * 0.018, chordLength, noteIndex === 0 ? 0.58 : 0.36);
      });
      window.setTimeout(() => setActiveNote(index), Math.max(0, (chordStart - context.currentTime) * 1000));
    });

    const duration = 1500 + chordProgression.length * (chordLength + gap) * 1000;
    playbackTimer = window.setTimeout(finishChordPlayback, duration + 160);
  } catch (error) {
    console.error(error);
    els.helperText.textContent = `钢琴音色播放失败：${error.message || "请再点一次播放题目"}`;
    finishChordPlayback();
  }
}

function resetPlayback() {
  clearTimeout(playbackTimer);
  playbackNodes.forEach((node) => {
    try {
      node.stop();
    } catch (error) {
      // The playback node may already have ended.
    }
  });
  playbackNodes = [];
  document.querySelectorAll(".note-card").forEach((card) => card.classList.remove("active"));
  els.playButton.disabled = false;
  els.singButton.disabled = false;
  isPlaying = false;
}

function setListeningButton(active, starting = false) {
  els.singButton.disabled = false;
  els.singButton.classList.toggle("button-primary", !active && !starting);
  els.singButton.classList.toggle("button-stop", active || starting);
  els.singButtonIcon.textContent = active || starting ? "■" : "●";
  els.singButtonText.textContent = starting ? "取消启动" : active ? "结束并评分" : "开始演唱";
}

async function toggleListening() {
  if (isStarting) {
    cancelStartRequested = true;
    setListeningButton(false);
    els.helperText.textContent = "已取消启动。";
    return;
  }
  if (isListening) {
    finishPhraseRecording();
    return;
  }
  await startListening();
}

async function startListening() {
  if (isPlaying || isListening || isStarting) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    els.helperText.textContent = "当前环境不支持麦克风。请使用 localhost 或 HTTPS 地址打开。";
    return;
  }

  isStarting = true;
  cancelStartRequested = false;
  const canReuseMicrophone = mediaStream?.getAudioTracks()
    .some((track) => track.readyState === "live");
  setListeningButton(false, true);
  els.singingConsole.hidden = false;
  els.inputState.textContent = canReuseMicrophone ? "正在连接" : "正在请求权限";
  els.helperText.textContent = canReuseMicrophone
    ? "正在重新使用已授权的麦克风。"
    : "首次使用时，请在浏览器权限提示中选择“允许”。";

  try {
    // Resume Web Audio while this click still counts as a user gesture.
    const context = await getAudioContext();
    const hasLiveTrack = mediaStream?.getAudioTracks()
      .some((track) => track.readyState === "live");
    const stream = hasLiveTrack
      ? mediaStream
      : await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

    if (cancelStartRequested) {
      if (!hasLiveTrack) stream.getTracks().forEach((track) => track.stop());
      return;
    }

    mediaStream = stream;
    mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    if (sourceNode) sourceNode.disconnect();
    sourceNode = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    sourceNode.connect(analyser);
    mediaStream.getAudioTracks()[0]?.addEventListener("ended", () => {
      if (isListening) stopListening({ message: "麦克风输入已断开，请检查系统输入设备。" });
    });

    isListening = true;
    results = [];
    resetPitchState();
    recordedPitches = [];
    recordingStartedAt = performance.now();
    if (currentMode === "octave") {
      renderOctaveCards(false);
    } else {
      renderNotes(false);
    }
    document.querySelectorAll(".note-card").forEach((card) => card.classList.add("active"));
    els.playButton.disabled = true;
    els.helperText.textContent = currentMode === "octave"
      ? "现在唱出目标八度音，唱稳后点击“结束并评分”。"
      : "现在连续哼出整句，唱完后点击“结束并评分”。";
    els.micStatus.classList.add("active");
    els.micStatus.lastChild.textContent = " 麦克风检测中";
    setListeningButton(true);
    detectPitch();
  } catch (error) {
    const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    els.singingConsole.hidden = true;
    els.helperText.textContent = denied
      ? "麦克风权限被拒绝。请在地址栏权限设置中允许麦克风，然后刷新页面。"
      : `麦克风启动失败：${error?.message || "请检查系统输入设备"}`;
  } finally {
    isStarting = false;
    if (!isListening) setListeningButton(false);
  }
}

function resetPitchState() {
  pitchHistory = [];
  lastSignalAt = performance.now();
  els.detectedNote.textContent = "--";
  els.detectedFrequency.textContent = "等待声音";
  els.meterNeedle.style.left = "50%";
  els.centsDisplay.textContent = "保持一个清晰、稳定的元音";
  els.holdHint.textContent = "唱完后点击结束";
  els.holdHint.classList.remove("on-target");
  els.recordingTime.textContent = "0.0";
  els.volumeBar.style.width = "0%";
  els.inputState.textContent = "等待声音";
  els.inputState.classList.remove("has-signal");
}

function stopListening({ message = "已停止麦克风检测。" } = {}) {
  pauseListening({ message });
  releaseMicrophone();
}

function pauseListening({ message = "已暂停麦克风检测。" } = {}) {
  cancelStartRequested = true;
  isListening = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  if (sourceNode) sourceNode.disconnect();
  sourceNode = null;
  analyser = null;
  if (mediaStream) {
    mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }
  resetPitchState();
  const hasLiveTrack = mediaStream?.getAudioTracks()
    .some((track) => track.readyState === "live");
  els.micStatus.classList.toggle("active", Boolean(hasLiveTrack));
  els.micStatus.lastChild.textContent = hasLiveTrack
    ? " 麦克风已就绪"
    : " 麦克风未启用";
  els.playButton.disabled = false;
  setListeningButton(false);
  document.querySelectorAll(".note-card").forEach((card) => card.classList.remove("active"));
  if (message) els.helperText.textContent = message;
}

function releaseMicrophone() {
  if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  els.micStatus.classList.remove("active");
  els.micStatus.lastChild.textContent = " 麦克风未启用";
}

// YIN pitch detection is substantially more reliable for sung notes than
// selecting the largest raw autocorrelation peak.
function detectPitchYin(buffer, sampleRate) {
  let mean = 0;
  for (const sample of buffer) mean += sample;
  mean /= buffer.length;

  let rms = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] -= mean;
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < MIN_RMS) return { frequency: null, rms };

  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.floor(sampleRate / 70), Math.floor(buffer.length / 2));
  const difference = new Float32Array(maxLag + 1);
  const cumulative = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i < buffer.length - lag; i += 1) {
      const delta = buffer[i] - buffer[i + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  cumulative[minLag] = 1;
  let runningSum = 0;
  let bestLag = -1;
  let bestValue = 1;
  for (let lag = minLag + 1; lag <= maxLag; lag += 1) {
    runningSum += difference[lag];
    cumulative[lag] = runningSum ? difference[lag] * (lag - minLag) / runningSum : 1;
    if (cumulative[lag] < bestValue) {
      bestValue = cumulative[lag];
      bestLag = lag;
    }
    if (cumulative[lag] < 0.16) {
      while (lag + 1 <= maxLag && cumulative[lag + 1] < cumulative[lag]) lag += 1;
      bestLag = lag;
      break;
    }
  }

  if (bestLag < 0 || bestValue > 0.35) return { frequency: null, rms };
  const left = difference[bestLag - 1] || difference[bestLag];
  const center = difference[bestLag];
  const right = difference[bestLag + 1] || difference[bestLag];
  const divisor = 2 * (2 * center - left - right);
  const adjustment = divisor ? (right - left) / divisor : 0;
  const frequency = sampleRate / (bestLag + adjustment);
  return {
    frequency: frequency >= 70 && frequency <= 1000 ? frequency : null,
    rms,
  };
}

function detectPitch() {
  if (!isListening || !analyser) return;
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  const { frequency, rms } = detectPitchYin(buffer, audioContext.sampleRate);
  const volumePercent = Math.min(100, Math.max(0, (rms - 0.001) * 900));
  els.volumeBar.style.width = `${volumePercent}%`;

  if (rms >= MIN_RMS) {
    lastSignalAt = performance.now();
    els.inputState.textContent = frequency ? "已识别音高" : "听到声音";
    els.inputState.classList.add("has-signal");
  } else {
    els.inputState.textContent = "声音太小";
    els.inputState.classList.remove("has-signal");
  }

  if (frequency) {
    pitchHistory.push(frequency);
    if (pitchHistory.length > 5) pitchHistory.shift();
    updatePitchUI(median(pitchHistory), rms);
  } else {
    pitchHistory = [];
    els.detectedNote.textContent = "--";
    els.detectedFrequency.textContent = rms >= MIN_RMS ? "正在分析" : "等待声音";
    els.holdHint.textContent = rms >= MIN_RMS ? "正在听" : "请靠近麦克风";
  }

  els.recordingTime.textContent = ((performance.now() - recordingStartedAt) / 1000).toFixed(1);
  if (performance.now() - lastSignalAt > 4000) {
    els.helperText.textContent = "没有收到麦克风信号。请检查系统的输入设备和输入音量，或换一个麦克风。";
  }
  animationFrame = requestAnimationFrame(detectPitch);
}

function updatePitchUI(frequency, rms) {
  const detectedMidi = frequencyToMidi(frequency);
  const detectedLabel = midiToLabel(Math.round(detectedMidi));

  els.detectedNote.textContent = `${detectedLabel.name}${detectedLabel.octave}`;
  els.detectedFrequency.textContent = `${frequency.toFixed(1)} Hz`;
  const centsFromNearest = 100 * (detectedMidi - Math.round(detectedMidi));
  els.meterNeedle.style.left = `${Math.max(0, Math.min(100, 50 + centsFromNearest / 2))}%`;
  els.centsDisplay.textContent = "正在记录音高轨迹";
  els.holdHint.textContent = "继续唱完整句";
  recordedPitches.push({
    time: performance.now() - recordingStartedAt,
    midi: detectedMidi,
    rms,
  });
}

function finishPhraseRecording() {
  const duration = performance.now() - recordingStartedAt;
  if (duration < MIN_RECORDING_MS || recordedPitches.length < sequence.length * 3) {
    pauseListening({ message: "录到的声音太少，请重新开始并连续哼完整句。" });
    els.singingConsole.hidden = true;
    return;
  }

  const captured = [...recordedPitches];
  pauseListening({ message: "" });
  const detectedNotes = splitPitchTrack(captured, sequence.length);
  if (!detectedNotes) {
    els.singingConsole.hidden = true;
    els.helperText.textContent = "没有找到足够清晰的音高。请用“啊”连续哼唱，并稍微拉开每个音。";
    return;
  }
  scorePhrase(detectedNotes);
}

function splitPitchTrack(samples, noteCount) {
  let values = samples.map((sample) => sample.midi)
    .filter((midi) => Number.isFinite(midi) && midi >= 33 && midi <= 84);
  if (values.length < noteCount * 3) return null;

  // Limit the dynamic-programming input while preserving the phrase shape.
  if (values.length > 240) {
    const compact = [];
    const bucketSize = values.length / 240;
    for (let i = 0; i < 240; i += 1) {
      compact.push(median(values.slice(
        Math.floor(i * bucketSize),
        Math.max(Math.floor(i * bucketSize) + 1, Math.floor((i + 1) * bucketSize)),
      )));
    }
    values = compact;
  }

  const n = values.length;
  const minSegment = Math.max(2, Math.floor(n / (noteCount * 8)));
  const prefix = new Float64Array(n + 1);
  const prefixSq = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) {
    prefix[i + 1] = prefix[i] + values[i];
    prefixSq[i + 1] = prefixSq[i] + values[i] * values[i];
  }
  const cost = (start, end) => {
    const count = end - start;
    const sum = prefix[end] - prefix[start];
    const sumSq = prefixSq[end] - prefixSq[start];
    return sumSq - sum * sum / count;
  };

  const dp = Array.from({ length: noteCount + 1 }, () => new Float64Array(n + 1).fill(Infinity));
  const previous = Array.from({ length: noteCount + 1 }, () => new Int32Array(n + 1).fill(-1));
  dp[0][0] = 0;
  for (let parts = 1; parts <= noteCount; parts += 1) {
    const endMin = parts * minSegment;
    const endMax = n - (noteCount - parts) * minSegment;
    for (let end = endMin; end <= endMax; end += 1) {
      const startMin = (parts - 1) * minSegment;
      const startMax = end - minSegment;
      for (let start = startMin; start <= startMax; start += 1) {
        const candidate = dp[parts - 1][start] + cost(start, end);
        if (candidate < dp[parts][end]) {
          dp[parts][end] = candidate;
          previous[parts][end] = start;
        }
      }
    }
  }

  if (!Number.isFinite(dp[noteCount][n])) return null;
  const segments = [];
  let end = n;
  for (let parts = noteCount; parts > 0; parts -= 1) {
    const start = previous[parts][end];
    if (start < 0) return null;
    segments.unshift(median(values.slice(start, end)));
    end = start;
  }
  return segments;
}

function scorePhrase(detectedNotes) {
  if (currentMode === "octave") {
    scoreOctave(detectedNotes[0]);
    return;
  }

  const tolerance = Number(els.tolerance.value);
  results = detectedNotes.map((detectedMidi, index) => {
    const cents = 100 * (detectedMidi - sequence[index]);
    const excess = Math.max(0, Math.abs(cents) - tolerance);
    const accuracy = Math.max(0, 100 - excess * 1.3);
    return {
      midi: sequence[index],
      detectedMidi,
      cents,
      score: Math.round(accuracy),
    };
  });

  renderNotes(true);
  document.querySelectorAll(".note-card").forEach((card) => card.classList.add("correct"));
  els.singingConsole.hidden = true;
  els.singButton.disabled = true;
  els.helperText.textContent = "完成！已按整句音高轨迹自动分段。";
  const total = Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length);
  els.totalScore.textContent = `${total}%`;
  els.resultTitle.textContent =
    total >= 92 ? "耳朵和声音配合得很漂亮" :
    total >= 80 ? "不错，再收紧一点音准" :
    "完成了，下一题会更稳";
  els.resultList.innerHTML = results.map((result, index) => {
    const label = midiToLabel(result.midi);
    const sung = midiToLabel(Math.round(result.detectedMidi));
    const offset = Math.round(result.cents);
    const detail = Math.abs(offset) <= 3 ? "准" : `${offset > 0 ? "+" : ""}${offset} 音分`;
    return `<div class="result-chip ${result.score >= 85 ? "good" : "needs-work"}">
      <strong>${index + 1}. ${label.name}${label.octave}</strong>
      唱成 ${sung.name}${sung.octave} · ${detail}
    </div>`;
  }).join("");
  els.resultPanel.hidden = false;
  els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function scoreOctave(detectedMidi) {
  const tolerance = Number(els.tolerance.value);
  const cents = 100 * (detectedMidi - octaveQuestion.target);
  const excess = Math.max(0, Math.abs(cents) - tolerance);
  const score = Math.round(Math.max(0, 100 - excess * 1.3));
  const total = score;
  const sourceLabel = midiToLabel(octaveQuestion.source);
  const targetLabel = midiToLabel(octaveQuestion.target);
  const sungLabel = midiToLabel(Math.round(detectedMidi));
  const offset = Math.round(cents);
  const detail = Math.abs(offset) <= 3 ? "准" : `${offset > 0 ? "+" : ""}${offset} 音分`;
  const directionText = octaveQuestion.direction === "up" ? "高八度" : "低八度";

  results = [{
    midi: octaveQuestion.target,
    detectedMidi,
    cents,
    score,
  }];
  renderOctaveCards(true);
  document.querySelectorAll(".note-card").forEach((card) => card.classList.add("correct"));
  els.singingConsole.hidden = true;
  els.singButton.disabled = true;
  els.helperText.textContent = "完成！已检测你唱出的八度目标音。";
  els.totalScore.textContent = `${total}%`;
  els.resultTitle.textContent =
    total >= 92 ? "八度联想很准" :
    total >= 80 ? "方向对了，再收紧音准" :
    "先在心里听见目标八度";
  els.resultList.innerHTML = `<div class="result-chip ${score >= 85 ? "good" : "needs-work"}">
    <strong>${sourceLabel.name}${sourceLabel.octave} → ${targetLabel.name}${targetLabel.octave}</strong>
    要唱${directionText} · 你唱成 ${sungLabel.name}${sungLabel.octave} · ${detail}
  </div>`;
  els.resultPanel.hidden = false;
  els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function submitChordAnswers() {
  if (currentMode !== "chords") return;
  const answers = [...document.querySelectorAll(".degree-answer")].map((select) => Number(select.value));
  if (answers.some((answer) => !answer)) {
    els.helperText.textContent = "还有和弦没有选择级数。";
    return;
  }

  const totalCorrect = answers.reduce((sum, answer, index) => (
    sum + (answer === chordProgression[index].degree ? 1 : 0)
  ), 0);
  const total = Math.round(totalCorrect / chordProgression.length * 100);

  renderChordCards(true);
  document.querySelectorAll(".note-card").forEach((card, index) => {
    card.classList.toggle("correct", answers[index] === chordProgression[index].degree);
  });

  els.totalScore.textContent = `${total}%`;
  els.resultTitle.textContent =
    total === 100 ? "级数全对，调性感很稳" :
    total >= 70 ? "不错，听感已经抓住了" :
    "先记住低音和解决方向";
  els.resultList.innerHTML = chordProgression.map((chord, index) => {
    const expected = chordLabel(chord);
    const answerDegree = answers[index];
    const answerLabel = DEGREE_OPTIONS.find((item) => item.degree === answerDegree)?.roman || "?";
    const correct = answerDegree === chord.degree;
    return `<div class="result-chip ${correct ? "good" : "needs-work"}">
      <strong>${index + 1}. ${correct ? "正确" : "未中"}</strong>
      你选 ${answerLabel} · 答案 ${expected}
    </div>`;
  }).join("");
  els.helperText.textContent = `调性：${keyLabel(chordKey)}；和弦类型：${
    chordLevel === "triads" ? "三和弦" : chordLevel === "sevenths" ? "七和弦" : "复杂和弦"
  }。`;
  els.resultPanel.hidden = false;
  els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function nextQuestion() {
  attempt += 1;
  els.attemptNumber.textContent = String(attempt);
  createSequence();
}

els.playButton.addEventListener("click", playSequence);
els.singButton.addEventListener("click", toggleListening);
els.submitAnswerButton.addEventListener("click", submitChordAnswers);
els.newQuestionButton.addEventListener("click", createSequence);
els.nextButton.addEventListener("click", nextQuestion);
[els.trainingMode, els.noteCount, els.range, els.difficulty, els.chordLevel, els.chordKey, els.octaveDirection].forEach((input) => {
  input.addEventListener("change", createSequence);
});
window.addEventListener("pagehide", () => {
  releaseMicrophone();
  resetPlayback();
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close().catch(() => {});
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && audioContext?.state === "interrupted") {
    audioContext.resume().catch(() => {});
  }
});

createSequence();
