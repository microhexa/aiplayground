const quizCanvas = document.getElementById("quiz-doodle");

if (quizCanvas) {
  const quizCtx = quizCanvas.getContext("2d");
  const answerButtons = Array.from(document.querySelectorAll(".answer-option"));
  const playerStatusEl = document.getElementById("player-status");
  const aiStatusEl = document.getElementById("ai-status");
  const aiAnswerValueEl = document.getElementById("ai-answer-value");
  const playerAnswerValueEl = document.getElementById("player-answer-value");
  const aiAnswerRepeatEl = document.getElementById("ai-answer-repeat");
  const countdownFillEl = document.getElementById("countdown-fill");
  const nextRoundBtn = document.getElementById("next-round-btn");

  const DATASET_LIMIT = 80;
  const ROUND_DURATION_MS = 7000;
  const DATASETS = [
    { labelKey: "labelSun", path: "./images/full_binary_sun.bin" },
    { labelKey: "labelHouse", path: "./images/full_binary_house.bin" },
    { labelKey: "labelFish", path: "./images/full_binary_fish.bin" }
  ];

  let samplePool = [];
  let currentRound = null;
  let countdownFrameId = null;
  let roundStartedAt = 0;

  const builtInRules = [
    {
      label: "labelFish",
      conditions: [
        { feature: "aspectRatio", op: ">", value: 1.2 },
        { feature: "middleHRatio", op: ">", value: 0.45 },
        { feature: "verticalSymmetry", op: "<", value: 0.9 }
      ]
    },
    {
      label: "labelHouse",
      conditions: [
        { feature: "bottomRatio", op: ">", value: 0.30 },
        { feature: "verticalSymmetry", op: ">", value: 0.75 },
        { feature: "aspectRatio", op: "<", value: 0.95 },
        { feature: "density", op: ">", value: 0.16 }
      ]
    },
    {
      label: "labelSun",
      conditions: [
        { feature: "aspectRatio", op: ">", value: 0.85 },
        { feature: "aspectRatio", op: "<", value: 1.3 },
        { feature: "verticalSymmetry", op: ">", value: 0.75 },
        { feature: "density", op: "<", value: 0.18 }
      ]
    }
  ];

  function updateDocumentLanguage() {
    document.documentElement.lang = currentLang === "da" ? "da" : "en";
    document.title = t("pageTitleRuleBased");
  }

  window.applyRulesTranslations = function applyRulesTranslations() {
    updateDocumentLanguage();

    if (!currentRound) return;

    if (currentRound.answered) {
      playerAnswerValueEl.textContent = currentRound.playerAnswer ? t(currentRound.playerAnswer) : "-";
      aiAnswerValueEl.textContent = t(currentRound.aiAnswer);
      aiAnswerRepeatEl.textContent = t(currentRound.aiAnswer);
      playerStatusEl.textContent = !currentRound.playerAnswer
        ? t("rulesPlayerTooSlow")
        : currentRound.playerAnswer === currentRound.aiAnswer
        ? t("rulesPlayerMatched")
        : t("rulesPlayerDiffered");
      aiStatusEl.textContent = t("rulesAiReveal");
    } else {
      playerStatusEl.textContent = t("rulesPlayerWaiting");
      aiStatusEl.textContent = t("rulesAiWaiting");
      aiAnswerValueEl.textContent = t("rulesAiHidden");
      playerAnswerValueEl.textContent = "-";
      aiAnswerRepeatEl.textContent = "-";
    }
  };

  function parseQuickDrawBinary(buffer, limit) {
    const view = new DataView(buffer);
    const drawings = [];
    let offset = 0;

    while (offset < view.byteLength && drawings.length < limit) {
      if (offset + 15 > view.byteLength) break;

      offset += 8;
      offset += 2;
      offset += 1;
      offset += 4;

      const strokeCount = view.getUint16(offset, true);
      offset += 2;

      const drawing = [];
      let valid = true;

      for (let strokeIndex = 0; strokeIndex < strokeCount; strokeIndex++) {
        if (offset + 2 > view.byteLength) {
          valid = false;
          break;
        }

        const pointCount = view.getUint16(offset, true);
        offset += 2;

        if (offset + pointCount * 2 > view.byteLength) {
          valid = false;
          break;
        }

        const xs = [];
        const ys = [];

        for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
          xs.push(view.getUint8(offset + pointIndex));
        }
        offset += pointCount;

        for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
          ys.push(view.getUint8(offset + pointIndex));
        }
        offset += pointCount;

        drawing.push({ xs, ys });
      }

      if (!valid) break;
      drawings.push(drawing);
    }

    return drawings;
  }

  function drawQuickDraw(drawing) {
    quizCtx.fillStyle = "#f6f6f6";
    quizCtx.fillRect(0, 0, quizCanvas.width, quizCanvas.height);
    quizCtx.strokeStyle = "#1b2631";
    quizCtx.lineCap = "round";
    quizCtx.lineJoin = "round";
    quizCtx.lineWidth = 10;

    const points = [];
    drawing.forEach(stroke => {
      for (let index = 0; index < stroke.xs.length; index++) {
        points.push({ x: stroke.xs[index], y: stroke.ys[index] });
      }
    });

    if (!points.length) return;

    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const boxWidth = Math.max(1, maxX - minX);
    const boxHeight = Math.max(1, maxY - minY);
    const padding = 34;
    const scale = Math.min(
      (quizCanvas.width - padding * 2) / boxWidth,
      (quizCanvas.height - padding * 2) / boxHeight
    );
    const offsetX = (quizCanvas.width - boxWidth * scale) / 2;
    const offsetY = (quizCanvas.height - boxHeight * scale) / 2;

    drawing.forEach(stroke => {
      if (!stroke.xs.length) return;

      quizCtx.beginPath();
      quizCtx.moveTo(
        offsetX + (stroke.xs[0] - minX) * scale,
        offsetY + (stroke.ys[0] - minY) * scale
      );

      for (let index = 1; index < stroke.xs.length; index++) {
        quizCtx.lineTo(
          offsetX + (stroke.xs[index] - minX) * scale,
          offsetY + (stroke.ys[index] - minY) * scale
        );
      }

      quizCtx.stroke();
    });
  }

  function normalizeCanvas(sourceCtx, width, height, targetSize = 64) {
    const image = sourceCtx.getImageData(0, 0, width, height);
    const data = image.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let foundInk = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const average = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const isInk = average < 220;

        if (isInk) {
          foundInk = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const normalizedCanvas = document.createElement("canvas");
    normalizedCanvas.width = targetSize;
    normalizedCanvas.height = targetSize;
    const normalizedCtx = normalizedCanvas.getContext("2d");
    normalizedCtx.fillStyle = "white";
    normalizedCtx.fillRect(0, 0, targetSize, targetSize);

    if (!foundInk) {
      return normalizedCanvas;
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const padding = 4;
    const availableSize = targetSize - 2 * padding;
    const scale = Math.min(availableSize / boxWidth, availableSize / boxHeight);
    const newWidth = Math.max(1, Math.round(boxWidth * scale));
    const newHeight = Math.max(1, Math.round(boxHeight * scale));
    const offsetX = Math.floor((targetSize - newWidth) / 2);
    const offsetY = Math.floor((targetSize - newHeight) / 2);

    normalizedCtx.drawImage(
      sourceCtx.canvas,
      minX, minY, boxWidth, boxHeight,
      offsetX, offsetY, newWidth, newHeight
    );

    return normalizedCanvas;
  }

  function extractFeatures(ctx, width, height) {
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const inkPixels = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const average = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (average < 200) inkPixels.push({ x, y });
      }
    }

    if (!inkPixels.length) return { empty: true };

    const xs = inkPixels.map(point => point.x);
    const ys = inkPixels.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;

    let top = 0;
    let middleH = 0;
    let bottom = 0;
    let left = 0;
    let middleV = 0;
    let right = 0;

    for (const point of inkPixels) {
      if (point.y < height / 3) top++;
      else if (point.y < 2 * height / 3) middleH++;
      else bottom++;

      if (point.x < width / 3) left++;
      else if (point.x < 2 * width / 3) middleV++;
      else right++;
    }

    const binary = Array.from({ length: height }, () => Array(width).fill(0));
    for (const point of inkPixels) {
      binary[point.y][point.x] = 1;
    }

    let verticalMatches = 0;
    let verticalChecks = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < Math.floor(width / 2); x++) {
        if (binary[y][x] === binary[y][width - 1 - x]) verticalMatches++;
        verticalChecks++;
      }
    }

    return {
      empty: false,
      aspectRatio: boxWidth / boxHeight,
      density: inkPixels.length / (boxWidth * boxHeight),
      middleHRatio: middleH / inkPixels.length,
      bottomRatio: bottom / inkPixels.length,
      verticalSymmetry: verticalMatches / verticalChecks
    };
  }

  function evaluateCondition(features, condition) {
    const value = features[condition.feature];
    if (condition.op === ">") return value > condition.value;
    if (condition.op === "<") return value < condition.value;
    return false;
  }

  function classifyByRules(features) {
    if (features.empty) return "labelNothing";

    for (const rule of builtInRules) {
      if (rule.conditions.every(condition => evaluateCondition(features, condition))) {
        return rule.label;
      }
    }

    return "labelUnknown";
  }

  function computeAiAnswer(drawing) {
    drawQuickDraw(drawing);
    const normalizedCanvas = normalizeCanvas(quizCtx, quizCanvas.width, quizCanvas.height, 64);
    const normalizedCtx = normalizedCanvas.getContext("2d");
    return classifyByRules(extractFeatures(normalizedCtx, 64, 64));
  }

  function setCountdownProgress(progress) {
    if (!countdownFillEl) return;
    const clamped = Math.max(0, Math.min(1, progress));
    countdownFillEl.style.transform = `scaleX(${clamped})`;
    countdownFillEl.style.opacity = clamped < 0.2 ? "0.72" : "1";
  }

  function stopCountdown() {
    if (countdownFrameId) {
      window.cancelAnimationFrame(countdownFrameId);
      countdownFrameId = null;
    }
  }

  function startCountdown() {
    stopCountdown();
    roundStartedAt = Date.now();
    setCountdownProgress(1);

    const tick = () => {
      if (!currentRound || currentRound.answered) {
        stopCountdown();
        return;
      }

      const elapsed = Date.now() - roundStartedAt;
      const remainingRatio = 1 - elapsed / ROUND_DURATION_MS;
      setCountdownProgress(remainingRatio);

      if (elapsed >= ROUND_DURATION_MS) {
        revealRound(null);
        return;
      }

      countdownFrameId = window.requestAnimationFrame(tick);
    };

    countdownFrameId = window.requestAnimationFrame(tick);
  }

  function resetRoundUi() {
    answerButtons.forEach(button => {
      button.disabled = false;
      button.classList.remove("selected", "correct", "incorrect");
    });
    playerStatusEl.textContent = t("rulesPlayerWaiting");
    aiStatusEl.textContent = t("rulesAiWaiting");
    aiAnswerValueEl.textContent = t("rulesAiHidden");
    playerAnswerValueEl.textContent = "-";
    aiAnswerRepeatEl.textContent = "-";
    nextRoundBtn.hidden = true;
    setCountdownProgress(1);
  }

  function chooseRandomSample() {
    const index = Math.floor(Math.random() * samplePool.length);
    return samplePool[index];
  }

  function beginRound() {
    if (!samplePool.length) return;

    const sample = chooseRandomSample();
    currentRound = {
      sample,
      aiAnswer: sample.aiAnswer,
      playerAnswer: null,
      answered: false
    };

    drawQuickDraw(sample.drawing);
    resetRoundUi();
    startCountdown();
  }

  function revealRound(playerAnswer) {
    if (!currentRound || currentRound.answered) return;

    currentRound.playerAnswer = playerAnswer;
    currentRound.answered = true;
    stopCountdown();

    answerButtons.forEach(button => {
      button.disabled = true;
      const answerKey = button.dataset.answer;
      button.classList.toggle("selected", answerKey === playerAnswer);
      button.classList.toggle("correct", answerKey === currentRound.aiAnswer);
      button.classList.toggle("incorrect", answerKey === playerAnswer && playerAnswer !== currentRound.aiAnswer);
    });

    playerAnswerValueEl.textContent = playerAnswer ? t(playerAnswer) : "-";
    aiAnswerValueEl.textContent = t(currentRound.aiAnswer);
    aiAnswerRepeatEl.textContent = t(currentRound.aiAnswer);
    aiStatusEl.textContent = t("rulesAiReveal");
    playerStatusEl.textContent = !playerAnswer
      ? t("rulesPlayerTooSlow")
      : playerAnswer === currentRound.aiAnswer
      ? t("rulesPlayerMatched")
      : t("rulesPlayerDiffered");
    nextRoundBtn.hidden = false;
  }

  async function loadSamples() {
    const loaded = await Promise.all(DATASETS.map(async dataset => {
      const response = await fetch(dataset.path);
      if (!response.ok) return [];

      const buffer = await response.arrayBuffer();
      const drawings = parseQuickDrawBinary(buffer, DATASET_LIMIT);

      return drawings.map(drawing => ({
        labelKey: dataset.labelKey,
        drawing,
        aiAnswer: null
      }));
    }));

    samplePool = loaded.flat();

    samplePool.forEach(sample => {
      sample.aiAnswer = computeAiAnswer(sample.drawing);
    });
  }

  answerButtons.forEach(button => {
    button.addEventListener("click", () => revealRound(button.dataset.answer));
  });

  nextRoundBtn.addEventListener("click", beginRound);

  updateDocumentLanguage();
  applyTranslations();

  loadSamples()
    .then(() => {
      if (!samplePool.length) {
        aiStatusEl.textContent = "Could not load drawings.";
        return;
      }
      beginRound();
    })
    .catch(() => {
      aiStatusEl.textContent = "Could not load drawings.";
    });
}
