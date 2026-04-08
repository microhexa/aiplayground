const canvas = document.getElementById("draw");
const ctx = canvas.getContext("2d");
const resultEl = document.getElementById("result");
const previewCanvas = document.getElementById("normalizedPreview");
const previewCtx = previewCanvas.getContext("2d");

// Set canvas sizes
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
previewCanvas.width = 64;
previewCanvas.height = 64;

// Drawing history for undo
let history = [];

// White background
resetCanvas();

// Initialize preview
previewCtx.fillStyle = "white";
previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

// Simple drawing
let drawing = false;
let strokeMoved = false;

canvas.addEventListener("mousedown", (e) => {
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
  }
  drawing = false;
  ctx.beginPath();
});

canvas.addEventListener("mouseleave", () => {
  if (drawing && strokeMoved) {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 10) history.shift();
  }
  drawing = false;
  ctx.beginPath();
});

canvas.addEventListener("mousemove", draw);

document.getElementById("resetBtn").addEventListener("click", () => {
  resetCanvas();
  resultEl.innerHTML = "";
  previewCtx.fillStyle = "white";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
});

document.getElementById("undoBtn").addEventListener("click", () => {
  if (history.length > 1) {
    history.pop();
    ctx.putImageData(history[history.length - 1], 0, 0);
  }
});

document.getElementById("classifyBtn").addEventListener("click", () => {
  const normCanvas = normalizeCanvas(ctx, canvas.width, canvas.height, 64);
  const normCtx = normCanvas.getContext("2d");

  // Show normalized image in fixed preview canvas
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(normCanvas, 0, 0);

  const features = extractFeatures(normCtx, 64, 64);
  const prediction = classifyByRules(features);

  const challengeMap = {
        sun: "challenge-sun",
        house: "challenge-house",
        fish: "challenge-fish"
    };

    const label = prediction.label.toLowerCase();

    if (challengeMap[label]) {
        document.getElementById(challengeMap[label]).checked = true;
    }

  const pad = (value) => value != null ? value.toFixed(2) : "n/a";

  resultEl.innerHTML = `
    <strong>Prediction:</strong> ${prediction.label}<br>
    <strong>Why:</strong><br>
    ${prediction.reasons.map(r => `- ${r}`).join("<br>")}<br><br>
    <strong>Features:</strong><br>
    aspectRatio: ${pad(features.aspectRatio)}<br>
    density: ${pad(features.density)}<br>
    middleHRatio: ${pad(features.middleHRatio)}<br>
    topRatio: ${pad(features.topRatio)}<br>
    bottomRatio: ${pad(features.bottomRatio)}<br>
    leftRatio: ${pad(features.leftRatio)}<br>
    rightRatio: ${pad(features.rightRatio)}<br>
    verticalSymmetry: ${pad(features.verticalSymmetry)}<br>
    horizontalSymmetry: ${pad(features.horizontalSymmetry)}<br>
    colVariation: ${features.colVariation != null ? pad(features.colVariation) : "n/a"}
  `;
});

function resetCanvas() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  history = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
}

function draw(e) {
  if (!drawing) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineWidth = 8;
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

  // Find bounding box of dark pixels
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

  // Add a little padding so drawing does not touch the borders
  const padding = 4;
  const availableSize = targetSize - 2 * padding;

  const scale = Math.min(availableSize / boxWidth, availableSize / boxHeight);
  const newWidth = Math.max(1, Math.round(boxWidth * scale));
  const newHeight = Math.max(1, Math.round(boxHeight * scale));

  const offsetX = Math.floor((targetSize - newWidth) / 2);
  const offsetY = Math.floor((targetSize - newHeight) / 2);

  // Draw cropped region directly into normalized canvas
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

    // Count ink in each column
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
  const reasons = [];

  if (f.empty) {
    return { label: "Nothing drawn", reasons: ["No ink pixels detected"] };
  }

  // Fish-like
  if (
    f.aspectRatio > 1.2 &&
    f.middleHRatio > 0.45 &&
    f.topRatio < 0.35 &&
    f.bottomRatio < 0.35 &&
    f.verticalSymmetry < 0.9 &&
    f.colVariation < 0.3 &&
    Math.abs(f.leftRatio - f.rightRatio) > 0.08
  ) {
    reasons.push("Drawing is wider than tall");
    reasons.push("Most ink lies in the middle horizontal band");
    reasons.push("Top and bottom contain relatively little ink");
    reasons.push("Left and right sides are imbalanced");
    reasons.push("This fits a body-and-tail shape");
    return { label: "Fish", reasons };
  }

  // House-like
  if (
    f.bottomRatio > 0.30 &&
    f.middleHRatio > 0.30 &&
    f.verticalSymmetry > 0.75 &&
    f.aspectRatio > 0.7 &&
    f.aspectRatio < 1.4
  ) {
    reasons.push("Much of the ink is in the middle and lower region");
    reasons.push("Drawing is fairly vertically symmetric");
    reasons.push("Overall proportions fit a house-like shape");
    return { label: "House", reasons };
  }

  // Sun-like
  if (
    f.aspectRatio > 0.85 &&
    f.aspectRatio < 1.3 &&
    f.density < 0.18 &&
    f.verticalSymmetry > 0.75 &&
    f.horizontalSymmetry > 0.75
  ) {
    reasons.push("Shape is roughly balanced");
    reasons.push("Ink density is relatively sparse");
    reasons.push("Drawing is symmetric both vertically and horizontally");
    return { label: "Sun", reasons };
  }

  reasons.push("No specific rule matched strongly");
  reasons.push("Falling back to default class");
  return { label: "Unknown doodle", reasons };
}