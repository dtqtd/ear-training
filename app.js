const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const RANGES = {
  low: [45, 64],
  middle: [48, 72],
  high: [55, 79],
};
const MIN_RMS = 0.003;
const MIN_RECORDING_MS = 700;

const els = {
  noteCount: document.querySelector("#noteCount"),
  range: document.querySelector("#range"),
  difficulty: document.querySelector("#difficulty"),
  tolerance: document.querySelector("#tolerance"),
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
  helperText: document.querySelector("#helperText"),
  resultPanel: document.querySelector("#resultPanel"),
  resultList: document.querySelector("#resultList"),
  totalScore: document.querySelector("#totalScore"),
  resultTitle: document.querySelector("#resultTitle"),
};

let sequence = [];
let attempt = 1;
let audioContext;
let analyser;
let mediaStream;
let sourceNode;
let animationFrame;
let playbackTimer;
let playbackOscillators = [];
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
  const count = Number(els.noteCount.value);
  const [min, max] = RANGES[els.range.value];
  const difficulty = els.difficulty.value;
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

  results = [];
  els.resultPanel.hidden = true;
  els.singingConsole.hidden = true;
  els.singButton.disabled = false;
  els.playButton.disabled = false;
  els.helperText.textContent = "播放并记住乐句，然后一口气自然哼完全部音符。";
  renderNotes(false);
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

async function getAudioContext({ recreate = false } = {}) {
  if (recreate && audioContext && audioContext.state !== "closed") {
    await audioContext.close().catch(() => {});
    audioContext = null;
  }
  if (!audioContext || audioContext.state === "closed") {
    audioContext = createAudioContext();
  }

  if (audioContext.state !== "running") {
    await audioContext.resume().catch(() => {});
  }

  // Safari can leave a context in its non-standard "interrupted" state after
  // repeated reloads, calls, or backgrounding. Recreate it from this user tap.
  if (audioContext.state !== "running") {
    await audioContext.close().catch(() => {});
    audioContext = createAudioContext();
    await audioContext.resume().catch(() => {});
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
    const startAt = context.currentTime + 0.08;
    const noteLength = 0.72;
    sequence.forEach((midi, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startAt + index * noteLength;
      oscillator.type = "sine";
      oscillator.frequency.value = midiToFrequency(midi);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.23, noteStart + 0.025);
      gain.gain.setValueAtTime(0.23, noteStart + 0.48);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.64);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.68);
      playbackOscillators.push(oscillator);
      oscillator.addEventListener("ended", () => {
        playbackOscillators = playbackOscillators.filter((item) => item !== oscillator);
      });
      window.setTimeout(() => setActiveNote(index), Math.max(0, (noteStart - context.currentTime) * 1000));
    });
    playbackTimer = window.setTimeout(resetPlayback, sequence.length * noteLength * 1000 + 150);
  } catch (error) {
    els.helperText.textContent = "音频播放失败，请刷新页面后重试。";
    resetPlayback();
  }
}

function resetPlayback() {
  clearTimeout(playbackTimer);
  playbackOscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch (error) {
      // The oscillator may already have ended.
    }
  });
  playbackOscillators = [];
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
    renderNotes(false);
    document.querySelectorAll(".note-card").forEach((card) => card.classList.add("active"));
    els.playButton.disabled = true;
    els.helperText.textContent = "现在连续哼出整句，唱完后点击“结束并评分”。";
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

function nextQuestion() {
  attempt += 1;
  els.attemptNumber.textContent = String(attempt);
  createSequence();
}

els.playButton.addEventListener("click", playSequence);
els.singButton.addEventListener("click", toggleListening);
els.newQuestionButton.addEventListener("click", createSequence);
els.nextButton.addEventListener("click", nextQuestion);
[els.noteCount, els.range, els.difficulty].forEach((input) => {
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
