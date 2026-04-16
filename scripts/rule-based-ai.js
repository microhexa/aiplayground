const canvas = document.getElementById("draw");
const ctx = canvas.getContext("2d");
const detectedTextEl = document.getElementById("result-detected");
const whyTextEl = document.getElementById("result-why");
const whyToggleBtn = document.getElementById("why-toggle-btn");
const whyPanelEl = document.getElementById("why-panel");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");

// Set canvas sizes
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// Drawing history for undo/redo
let history = [];
let redoHistory = [];

let placeholderImage = null;
let whyPanelOpen = false;
const WHY_POPUP_OFFSET = 12;

function updateUndoButtonState() {
  undoBtn.disabled = history.length <= 1;
}

function updateRedoButtonState() {
  redoBtn.disabled = redoHistory.length === 0;
}

// White background
resetCanvas();
setResultPlaceholder();
updateWhyPanel(false);

// Simple drawing
let drawing = false;
let strokeMoved = false;

let hasDrawn = false;

canvas.addEventListener("mousedown", (e) => {
  if (!hasDrawn) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawn = true;
  }

  drawing = true;
  strokeMoved = false;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.beginPath();
  ctx.moveTo(x, y);
});

canvas.addEventListener("mouseup", () => {
  if (drawing && strokeMoved) {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 10) history.shift();

    // New action invalidates redo history
    redoHistory = [];
  }
  drawing = false;
  ctx.beginPath();
  updateUndoButtonState();
  updateRedoButtonState();
});

canvas.addEventListener("mouseleave", () => {
  if (drawing && strokeMoved) {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 10) history.shift();

    // New action invalidates redo history
    redoHistory = [];
  }
  drawing = false;
  ctx.beginPath();
  updateUndoButtonState();
  updateRedoButtonState();
});

canvas.addEventListener("mousemove", draw);

document.getElementById("reset-btn").addEventListener("click", () => {
  hasDrawn = false;
  resetCanvas();
  setResultPlaceholder();
});

document.getElementById("undo-btn").addEventListener("click", () => {
  if (history.length > 1) {
    const currentState = history.pop();
    redoHistory.push(currentState);

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);

    hasDrawn = !isSameImageData(previousState, placeholderImage);
  }
  updateUndoButtonState();
  updateRedoButtonState();
});

document.getElementById("redo-btn").addEventListener("click", () => {
  if (redoHistory.length > 0) {
    const redoneState = redoHistory.pop();
    history.push(redoneState);

    if (history.length > 10) history.shift();

    ctx.putImageData(redoneState, 0, 0);
    hasDrawn = !isSameImageData(redoneState, placeholderImage);
  }
  updateUndoButtonState();
  updateRedoButtonState();
});

document.getElementById("classify-btn").addEventListener("click", () => {
  const normCanvas = normalizeCanvas(ctx, canvas.width, canvas.height, 64);
  const normCtx = normCanvas.getContext("2d");
  const features = extractFeatures(normCtx, 64, 64);
  const prediction = classifyByRules(features);

  const challengeMap = {
    labelSun: "challenge-sun",
    labelHouse: "challenge-house",
    labelFish: "challenge-fish"
  };

  if (challengeMap[prediction.label]) {
    document.getElementById(challengeMap[prediction.label]).checked = true;
  }

  if (prediction.label.startsWith("label")) {
    detectedTextEl.dataset.i18n = prediction.label;
    detectedTextEl.textContent = t(prediction.label);
  } else {
    detectedTextEl.removeAttribute("data-i18n");
    detectedTextEl.textContent = prediction.label;
  }

  whyTextEl.innerHTML = `
    <ul>
      ${prediction.reasons.map(reason => {
        if (reason.startsWith("reason")) {
          return `<li data-i18n="${reason}">${t(reason)}</li>`;
        } else {
          return `<li>${reason}</li>`;
        }
      }).join("")}
    </ul>
  `;

  whyToggleBtn.disabled = false;
  updateWhyPanel(false);
  applyTranslations();
});

whyToggleBtn.addEventListener("click", () => {
  if (whyToggleBtn.disabled) return;
  const rect = whyToggleBtn.getBoundingClientRect();
  updateWhyPanel(!whyPanelOpen, {
    x: rect.right,
    y: rect.top
  });
});

whyToggleBtn.addEventListener("mouseenter", (event) => {
  if (whyToggleBtn.disabled) return;
  updateWhyPanel(true, {
    x: event.clientX,
    y: event.clientY
  });
});

whyToggleBtn.addEventListener("mousemove", (event) => {
  if (!whyPanelOpen || whyToggleBtn.disabled) return;
  positionWhyPanel(event.clientX, event.clientY);
});

whyToggleBtn.addEventListener("mouseleave", () => {
  updateWhyPanel(false);
});

whyToggleBtn.addEventListener("focus", () => {
  if (whyToggleBtn.disabled) return;
  const rect = whyToggleBtn.getBoundingClientRect();
  updateWhyPanel(true, {
    x: rect.right,
    y: rect.top
  });
});

whyToggleBtn.addEventListener("blur", () => {
  updateWhyPanel(false);
});

function resetCanvas() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "grey";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "1.8rem Caroni, sans-serif";
  ctx.fillText(t("drawHere"), canvas.width / 2, canvas.height / 2);

  ctx.beginPath();

  const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
  placeholderImage = initialState;
  history = [initialState];
  redoHistory = [];
  updateUndoButtonState();
  updateRedoButtonState();
}

function setResultPlaceholder() {
  detectedTextEl.removeAttribute("data-i18n");
  detectedTextEl.textContent = t("ruleDetectedPlaceholder");
  whyTextEl.removeAttribute("data-i18n");
  whyTextEl.textContent = t("ruleWhyPlaceholder");
  whyToggleBtn.disabled = true;
  updateWhyPanel(false);
}

function updateWhyPanel(nextOpen, position = null) {
  whyPanelOpen = nextOpen && !whyToggleBtn.disabled;
  whyPanelEl.classList.toggle("hidden", !whyPanelOpen);
  whyPanelEl.setAttribute("aria-hidden", String(!whyPanelOpen));
  whyToggleBtn.setAttribute("aria-expanded", String(whyPanelOpen));
  whyToggleBtn.setAttribute("aria-label", t(whyPanelOpen ? "ruleHideWhyAria" : "ruleWhyToggleAria"));

  if (whyPanelOpen && position) {
    positionWhyPanel(position.x, position.y);
  }
}

function positionWhyPanel(clientX, clientY) {
  const panelWidth = whyPanelEl.offsetWidth;
  const panelHeight = whyPanelEl.offsetHeight;
  const maxLeft = window.innerWidth - panelWidth - 16;
  const maxTop = window.innerHeight - panelHeight - 16;
  const nextLeft = Math.min(clientX + WHY_POPUP_OFFSET, Math.max(16, maxLeft));
  const nextTop = Math.min(clientY + WHY_POPUP_OFFSET, Math.max(16, maxTop));

  whyPanelEl.style.left = `${Math.max(16, nextLeft)}px`;
  whyPanelEl.style.top = `${Math.max(16, nextTop)}px`;
}

function isSameImageData(img1, img2) {
  if (!img1 || !img2 || img1.data.length !== img2.data.length) return false;

  for (let i = 0; i < img1.data.length; i++) {
    if (img1.data[i] !== img2.data[i]) return false;
  }

  return true;
}

function draw(e) {
  if (!drawing) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "black";

  strokeMoved = true;
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
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
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const isInk = (r + g + b) / 3 < 200;

      if (isInk) {
        foundInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const normCanvas = document.createElement("canvas");
  normCanvas.width = targetSize;
  normCanvas.height = targetSize;
  const normCtx = normCanvas.getContext("2d");

  normCtx.fillStyle = "white";
  normCtx.fillRect(0, 0, targetSize, targetSize);

  if (!foundInk) {
    return normCanvas;
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

  normCtx.drawImage(
    canvas,
    minX, minY, boxWidth, boxHeight,
    offsetX, offsetY, newWidth, newHeight
  );

  return normCanvas;
}

function extractFeatures(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  let inkPixels = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const isInk = (r + g + b) / 3 < 200;
      if (isInk) inkPixels.push({ x, y });
    }
  }

  if (inkPixels.length === 0) {
    return { empty: true };
  }

  const xs = inkPixels.map(p => p.x);
  const ys = inkPixels.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const aspectRatio = boxWidth / boxHeight;
  const density = inkPixels.length / (boxWidth * boxHeight);

  let sumX = 0;
  let sumY = 0;
  for (const p of inkPixels) {
    sumX += p.x;
    sumY += p.y;
  }

  const centerX = sumX / inkPixels.length;
  const centerY = sumY / inkPixels.length;

  let top = 0, middleH = 0, bottom = 0;
  let left = 0, middleV = 0, right = 0;

  for (const p of inkPixels) {
    if (p.y < height / 3) top++;
    else if (p.y < 2 * height / 3) middleH++;
    else bottom++;

    if (p.x < width / 3) left++;
    else if (p.x < 2 * width / 3) middleV++;
    else right++;
  }

  const binary = Array.from({ length: height }, () => Array(width).fill(0));
  for (const p of inkPixels) {
    binary[p.y][p.x] = 1;
  }

  let verticalMatches = 0, verticalChecks = 0;
  let horizontalMatches = 0, horizontalChecks = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 2); x++) {
      if (binary[y][x] === binary[y][width - 1 - x]) verticalMatches++;
      verticalChecks++;
    }
  }

  for (let y = 0; y < Math.floor(height / 2); y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y][x] === binary[height - 1 - y][x]) horizontalMatches++;
      horizontalChecks++;
    }
  }

  let upperMiddle = 0;
  let lowerMiddle = 0;

  for (const p of inkPixels) {
    if (p.y >= height / 3 && p.y < 2 * height / 3) {
      if (p.x < width / 2) upperMiddle++;
      else lowerMiddle++;
    }
  }

  const leftHalfRatio = inkPixels.filter(p => p.x < width / 2).length / inkPixels.length;
  const rightHalfRatio = inkPixels.filter(p => p.x >= width / 2).length / inkPixels.length;

  const colCounts = Array(width).fill(0);
  for (const p of inkPixels) {
    colCounts[p.x]++;
  }

  const maxColCount = Math.max(...colCounts);
  const minColCount = Math.min(...colCounts.filter(c => c > 0));
  const colVariation = maxColCount > 0 ? minColCount / maxColCount : 0;

  return {
    empty: false,
    inkCount: inkPixels.length,
    minX, maxX, minY, maxY,
    boxWidth, boxHeight,
    aspectRatio,
    density,
    centerX, centerY,
    topRatio: top / inkPixels.length,
    middleHRatio: middleH / inkPixels.length,
    bottomRatio: bottom / inkPixels.length,
    leftRatio: left / inkPixels.length,
    middleVRatio: middleV / inkPixels.length,
    rightRatio: right / inkPixels.length,
    leftHalfRatio,
    rightHalfRatio,
    verticalSymmetry: verticalMatches / verticalChecks,
    horizontalSymmetry: horizontalMatches / horizontalChecks,
    colVariation
  };
}

function classifyByRules(f) {
  if (f.empty) {
    return { label: "labelNothing", reasons: ["reasonNoInk"] };
  }

  for (const rule of window.ruleDefinitions) {
    if (ruleMatches(f, rule)) {
      return {
        label: rule.label,
        reasons: rule.childExplanationKeys?.length
          ? rule.childExplanationKeys.map(([promptKey, optionKey]) => `${t(promptKey)} ${t(optionKey)}`)
          : (rule.childExplanation?.length ? rule.childExplanation : rule.reasons)
      };
    }
  }

  return {
    label: "labelUnknown",
    reasons: ["reasonDefaultNoMatch", "reasonDefaultFallback"]
  };
}
