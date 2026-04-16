    const doodleSections = [
      {
        id: "sun",
        labelKey: "imageClassifierClassSun",
        datasetPath: "./images/full_binary_sun.bin",
        samples: Array.from({ length: 15 }, (_, index) => ({
          id: `sun-${index + 1}`,
          preview: `SUN\nDOODLE ${index + 1}`
        }))
      },
      {
        id: "fish",
        labelKey: "imageClassifierClassFish",
        datasetPath: "./images/full_binary_fish.bin",
        samples: Array.from({ length: 15 }, (_, index) => ({
          id: `fish-${index + 1}`,
          preview: `FISH\nDOODLE ${index + 1}`
        }))
      },
      {
        id: "house",
        labelKey: "imageClassifierClassHouse",
        datasetPath: "./images/full_binary_house.bin",
        samples: Array.from({ length: 15 }, (_, index) => ({
          id: `house-${index + 1}`,
          preview: `HOUSE\nDOODLE ${index + 1}`
        }))
      },
      {
        id: "animal-migration",
        labelKey: "imageClassifierClassAnimalMigration",
        datasetPath: "./images/full_binary_animal migration.bin",
        samples: Array.from({ length: 15 }, (_, index) => ({
          id: `animal-migration-${index + 1}`,
          preview: `ANIMAL\nMIGRATION ${index + 1}`
        }))
      }
    ];

    const doodleSamples = doodleSections.flatMap((section) =>
      section.samples.map((sample) => ({
        ...sample,
        labelId: section.id,
        label: getSectionLabel(section)
      }))
    );

    const classPicker = document.getElementById("class-picker");
    const doodleBrowser = document.getElementById("doodle-browser");
    const selectionCountEl = document.getElementById("selection-count");
    const selectionHintEl = document.getElementById("selection-hint");
    const clearSelectionBtn = document.getElementById("clear-selection-btn");
    const trainModelBtn = document.getElementById("train-model-btn");
    const trainingTabBtn = document.getElementById("training-tab");
    const testingTabBtn = document.getElementById("testing-tab");
    const trainingPopup = document.getElementById("training-popup");
    const trainingPanel = document.getElementById("training-panel");
    const testingPanel = document.getElementById("testing-panel");
    const trainingProgressEl = document.getElementById("training-progress");
    const trainingStatusEl = document.getElementById("training-status");
    const trainingPercentEl = document.getElementById("training-percent");
    const trainingClassesEl = document.getElementById("training-classes");
    const trainingSamplesEl = document.getElementById("training-samples");
    const trainingBackendNoteEl = document.getElementById("training-backend-note");
    const resetBtn = document.getElementById("reset-btn");
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    const canvasCard = document.getElementById("canvas-card");
    const canvasHelperEl = document.getElementById("canvas-helper");
    const selectedTagsEl = document.getElementById("selected-tags");
    const testingSelectedTagsEl = document.getElementById("testing-selected-tags");
    const modelStateEl = document.getElementById("model-state");
    const modelBackendEl = document.getElementById("model-backend");
    const modelTrainedAtEl = document.getElementById("model-trained-at");
    const testingModelStateEl = document.getElementById("testing-model-state");
    const testingModelBackendEl = document.getElementById("testing-model-backend");
    const testingModelTrainedAtEl = document.getElementById("testing-model-trained-at");
    const predictionLabelEl = document.getElementById("prediction-label");
    const predictionConfidenceEl = document.getElementById("prediction-confidence");
    const classifierTabBar = document.getElementById("classifier-tab-bar");

    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");

    let selectedClasses = new Set();
    let selectedDoodles = new Set();
    let history = [];
    let redoHistory = [];
    let placeholderImage = null;
    let drawing = false;
    let strokeMoved = false;
    let hasDrawn = false;
    let trainingInterval = null;
    let trainingInProgress = false;
    let modelReady = false;
    let trainedBrowserModel = null;
    let trainingStatusKey = "imageClassifierPreparingData";
    let predictionPlaceholderKey = "imageClassifierTrainAndDraw";
    let canvasHelperKey = "imageClassifierTrainAndDraw";

    function getSectionLabel(section) {
      return t(section.labelKey);
    }

    function formatMessage(key, values = {}) {
      return Object.entries(values).reduce((message, [name, value]) => (
        message.replace(`{${name}}`, value)
      ), t(key));
    }

    function updateDocumentLanguage() {
      document.documentElement.lang = currentLang === "da" ? "da" : "en";
      document.title = currentLang === "da"
        ? "AI Legepladsen | Billedklassifikator"
        : "The AI Playground | Image Classifier";
    }

    window.applyImageClassifierTranslations = function applyImageClassifierTranslations() {
      updateDocumentLanguage();
      classifierTabBar.setAttribute("aria-label", t("imageClassifierAriaSteps"));
      resetBtn.setAttribute("aria-label", t("imageClassifierReset"));
      undoBtn.setAttribute("aria-label", t("imageClassifierUndo"));
      redoBtn.setAttribute("aria-label", t("imageClassifierRedo"));
      renderClassOptions();
      renderDoodleTiles();
      updateSelectionUI();
      trainingStatusEl.textContent = t(trainingStatusKey);
      canvasHelperEl.textContent = t(canvasHelperKey);
      if (predictionLabelEl.textContent === t("imageClassifierNothingDetected") || predictionLabelEl.textContent === "Nothing detected") {
        predictionLabelEl.textContent = t("imageClassifierNothingDetected");
      }
      if (predictionLabelEl.textContent === "-") {
        predictionConfidenceEl.textContent = t(predictionPlaceholderKey);
      }
      if (!hasDrawn) {
        resetCanvas();
      }
    };

    renderClassOptions();
    renderDoodleTiles();
    loadDatasetDoodles();
    updateSelectionUI();
    updateModelStatus(t("imageClassifierWaitingForTraining"), t("imageClassifierNotConnected"), "-");
    resetCanvas();
    setPredictionPlaceholder();
    setCanvasAvailability(false);
    setActiveTab("training");

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDrawing);
    canvas.addEventListener("mouseleave", endDrawing);
    document.getElementById("reset-btn").addEventListener("click", handleResetCanvas);
    document.getElementById("undo-btn").addEventListener("click", handleUndo);
    document.getElementById("redo-btn").addEventListener("click", handleRedo);
    document.getElementById("classify-btn").addEventListener("click", classifyDrawing);
    trainModelBtn.addEventListener("click", trainModel);
    clearSelectionBtn.addEventListener("click", clearSelection);
    trainingTabBtn.addEventListener("click", () => setActiveTab("training"));
    testingTabBtn.addEventListener("click", () => {
      if (!testingTabBtn.disabled) {
        setActiveTab("testing");
      }
    });

    function renderClassOptions() {
      classPicker.innerHTML = doodleSections.map((section) => {
        const active = selectedClasses.has(section.id) ? " active" : "";
        return `
          <button class="class-option${active}" type="button" data-class-id="${section.id}" aria-pressed="${selectedClasses.has(section.id) ? "true" : "false"}">
            <span class="class-option-check" aria-hidden="true"></span>
            ${getSectionLabel(section)}
          </button>
        `;
      }).join("");

      classPicker.querySelectorAll("[data-class-id]").forEach((button) => {
        button.addEventListener("click", () => toggleClassSelection(button.dataset.classId));
      });
    }

    function renderDoodleTiles() {
      const visibleSections = doodleSections.filter((section) => selectedClasses.has(section.id));

      if (!visibleSections.length) {
        doodleBrowser.innerHTML = `<div class="empty-browser">${t("imageClassifierChooseClassesAbove")}</div>`;
        return;
      }

      doodleBrowser.innerHTML = visibleSections.map((section) => `
        <section class="doodle-section" aria-labelledby="section-${section.id}">
          <h3 id="section-${section.id}" class="doodle-section-title">${getSectionLabel(section).toLowerCase()}</h3>
          <div class="doodle-grid">
            ${section.samples.map((sample) => {
              const selected = selectedDoodles.has(sample.id) ? " selected" : "";
              return `
                <button class="doodle-tile${selected}" type="button" data-doodle-id="${sample.id}" aria-pressed="${selected ? "true" : "false"}">
                  <span class="doodle-check" aria-hidden="true"></span>
                  <div class="doodle-preview">${getDoodlePreviewMarkup(sample)}</div>
                </button>
              `;
            }).join("")}
          </div>
        </section>
      `).join("");

      doodleBrowser.querySelectorAll("[data-doodle-id]").forEach((tile) => {
        tile.addEventListener("click", () => toggleDoodle(tile.dataset.doodleId));
      });
    }

    function toggleClassSelection(classId) {
      if (selectedClasses.has(classId)) {
        selectedClasses.delete(classId);
        [...selectedDoodles].forEach((sampleId) => {
          const sample = findSampleById(sampleId);
          if (sample && sample.labelId === classId) {
            selectedDoodles.delete(sampleId);
          }
        });
      } else {
        selectedClasses.add(classId);
      }

      renderClassOptions();
      renderDoodleTiles();
      updateSelectionUI();
    }

    async function loadDatasetDoodles() {
      const loadableSections = doodleSections.filter((section) => section.datasetPath);

      await Promise.all(loadableSections.map(async (section) => {
        try {
          const response = await fetch(section.datasetPath);
          if (!response.ok) {
            throw new Error("Failed to load " + section.datasetPath);
          }

          const buffer = await response.arrayBuffer();
          const drawings = parseQuickDrawBinary(buffer, section.samples.length);

          section.samples = section.samples.map((sample, index) => {
            const drawing = drawings[index];
            if (!drawing) return sample;

            return {
              ...sample,
              previewImage: renderQuickDrawPreview(drawing)
            };
          });
        } catch (error) {
          // Keep text placeholders when the local file cannot be fetched.
        }
      }));

      renderDoodleTiles();
    }

    function getDoodlePreviewMarkup(sample) {
      if (sample.previewImage) {
        return `<img src="${sample.previewImage}" alt="" />`;
      }

      return sample.preview;
    }

    function toggleDoodle(id) {
      if (selectedDoodles.has(id)) {
        selectedDoodles.delete(id);
      } else {
        selectedDoodles.add(id);
      }

      renderDoodleTiles();
      updateSelectionUI();
    }

    function clearSelection() {
      selectedClasses.clear();
      selectedDoodles.clear();
      renderClassOptions();
      renderDoodleTiles();
      updateSelectionUI();
    }

    function updateSelectionUI() {
      const classCount = selectedClasses.size;
      const doodleCount = selectedDoodles.size;
      const labelGroups = getSelectedLabelGroups();
      const hasSamplesForEachClass = classCount > 0 && labelGroups.length === classCount;

      selectionCountEl.textContent = formatMessage("imageClassifierSelectedSummary", {
        classes: classCount,
        doodles: doodleCount
      });
      selectionHintEl.textContent = classCount < 2
        ? t("imageClassifierPickAtLeastTwo")
        : hasSamplesForEachClass
          ? t("imageClassifierReadyToTrain")
          : t("imageClassifierPickDoodlesForEach");
      trainModelBtn.disabled = classCount < 2 || !hasSamplesForEachClass || trainingInProgress;
      clearSelectionBtn.disabled = (classCount === 0 && doodleCount === 0) || trainingInProgress;

      selectedTagsEl.innerHTML = getSelectedClassLabels()
        .map((label) => `<span class="model-tag">${label}</span>`)
        .join("");

      testingSelectedTagsEl.innerHTML = selectedTagsEl.innerHTML;
      testingTabBtn.disabled = !modelReady;
    }

    async function trainModel() {
      if (selectedClasses.size < 2 || trainingInProgress) return;

      trainingInProgress = true;
      modelReady = false;
      const selectedSamples = getSelectedSamples();
      const payloadSamples = getTrainingPayloadSamples();
      const labelGroups = getSelectedLabelGroups();

      updateSelectionUI();
      setCanvasAvailability(false);
      setPredictionPlaceholder("imageClassifierTrainingInProgress");
      modelStateEl.textContent = t("imageClassifierTraining");
      modelBackendEl.textContent = t("imageClassifierConnecting");
      trainingClassesEl.textContent = String(labelGroups.length);
      trainingSamplesEl.textContent = String(selectedSamples.length);
      trainingBackendNoteEl.textContent = "";

      showTrainingPopup();
      setTrainingProgress(0, "imageClassifierPreparingData");
      startTrainingAnimation();

      const payload = {
        labels: getSelectedClassIds(),
        samples: payloadSamples
      };

      try {
        if (payloadSamples.length !== selectedSamples.length) {
          throw new Error("Not all selected doodles have preview images available for training.");
        }
        
        await wait(180);
        setTrainingProgress(18, "imageClassifierEncodingDoodles");

        const processedSamples = [];
        for (let index = 0; index < payload.samples.length; index++) {
          const sample = payload.samples[index];
          const vector = await vectorizeImageDataUrl(sample.image);
          processedSamples.push({
            id: sample.id,
            label: sample.label,
            vector
          });

          const progress = 18 + ((index + 1) / payload.samples.length) * 44;
          setTrainingProgress(progress, "imageClassifierEncodingDoodles");
        }

        await wait(120);
        setTrainingProgress(72, "imageClassifierTrainingClassifier");
        trainedBrowserModel = buildBrowserModel(processedSamples, payload.labels);

        await wait(120);
        setTrainingProgress(90, "imageClassifierValidatingModel");
        await wait(120);

        finishTraining({
          backend: t("imageClassifierBackendConnected"),
          classes: labelGroups.length,
          samples: selectedSamples.length,
          note: t("imageClassifierTrainingFinished")
        });
      } catch (error) {
        handleTrainingFailure(error, {
          classes: labelGroups.length,
          samples: selectedSamples.length
        });
      }
    }

    function finishTraining(details) {
      stopTrainingAnimation();
      setTrainingProgress(100, "imageClassifierModelReady");
      trainingClassesEl.textContent = String(details.classes);
      trainingSamplesEl.textContent = String(details.samples);
      trainingBackendNoteEl.textContent = details.note;

      trainingInProgress = false;
      modelReady = true;
      const trainedAt = new Date().toLocaleTimeString(currentLang === "da" ? "da-DK" : "en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
      updateModelStatus(t("imageClassifierReady"), details.backend, trainedAt);
      canvasHelperKey = "imageClassifierDrawSelectedClass";
      canvasHelperEl.textContent = t(canvasHelperKey);
      testingTabBtn.disabled = false;
      setCanvasAvailability(true);
      handleResetCanvas();
      setPredictionPlaceholder("imageClassifierDrawThenTest");
      updateSelectionUI();
      window.setTimeout(() => {
        hideTrainingPopup();
        setActiveTab("testing");
      }, 550);
    }

    function handleTrainingFailure(error, details) {
      stopTrainingAnimation();
      trainingInProgress = false;
      modelReady = false;
      testingTabBtn.disabled = true;
      setCanvasAvailability(false);
      setPredictionPlaceholder("imageClassifierTrainAndDraw");
      trainingProgressEl.style.width = "0%";
      trainingPercentEl.textContent = "0%";
      trainingStatusKey = "imageClassifierTrainingFailed";
      trainingStatusEl.textContent = t(trainingStatusKey);
      updateModelStatus(
        t("imageClassifierWaitingForTraining"),
        t("imageClassifierNotConnected"),
        "-"
      );
      trainedBrowserModel = null;
      trainingClassesEl.textContent = String(details.classes);
      trainingSamplesEl.textContent = String(details.samples);
      trainingBackendNoteEl.textContent = getTrainingErrorMessage(error);
      updateSelectionUI();
    }

    function getTrainingErrorMessage(error) {
      if (error && typeof error.message === "string" && error.message.trim()) {
        return error.message;
      }

      return "Training failed. Make sure the selected doodles are loaded before training.";
    }

    function showTrainingPopup() {
      trainingPopup.classList.remove("hidden");
      trainingPopup.setAttribute("aria-hidden", "false");
    }

    function hideTrainingPopup() {
      trainingPopup.classList.add("hidden");
      trainingPopup.setAttribute("aria-hidden", "true");
    }

    function startTrainingAnimation() {
      stopTrainingAnimation();
      let value = 0;
      const steps = [
        "imageClassifierPreparingData",
        "imageClassifierEncodingDoodles",
        "imageClassifierTrainingClassifier",
        "imageClassifierValidatingModel"
      ];

      trainingInterval = window.setInterval(() => {
        value = Math.min(value + Math.random() * 11 + 4, 92);
        const stepIndex = Math.min(steps.length - 1, Math.floor(value / 25));
        setTrainingProgress(value, steps[stepIndex]);
      }, 260);
    }

    function stopTrainingAnimation() {
      if (trainingInterval) {
        window.clearInterval(trainingInterval);
        trainingInterval = null;
      }
    }

    function setTrainingProgress(value, label) {
      const clamped = Math.max(0, Math.min(100, value));
      trainingProgressEl.style.width = clamped + "%";
      trainingPercentEl.textContent = Math.round(clamped) + "%";
      trainingStatusKey = label;
      trainingStatusEl.textContent = t(label);
    }

    function setActiveTab(tab) {
      const showTraining = tab === "training";
      trainingTabBtn.classList.toggle("active", showTraining);
      trainingTabBtn.setAttribute("aria-selected", String(showTraining));
      testingTabBtn.classList.toggle("active", !showTraining);
      testingTabBtn.setAttribute("aria-selected", String(!showTraining));
      trainingPanel.classList.toggle("active", showTraining);
      testingPanel.classList.toggle("active", !showTraining);
    }

    function updateModelStatus(state, backend, trainedAt) {
      modelStateEl.textContent = state;
      modelBackendEl.textContent = backend;
      modelTrainedAtEl.textContent = trainedAt;
      testingModelStateEl.textContent = state;
      testingModelBackendEl.textContent = backend;
      testingModelTrainedAtEl.textContent = trainedAt;
    }

    function setCanvasAvailability(enabled) {
      canvasCard.classList.toggle("locked", !enabled);
      document.querySelectorAll("#reset-btn, #undo-btn, #redo-btn, #classify-btn").forEach((button) => {
        button.disabled = !enabled;
      });
      undoBtn.disabled = !enabled || history.length <= 1;
      redoBtn.disabled = !enabled || redoHistory.length === 0;
    }

    function handleResetCanvas() {
      hasDrawn = false;
      resetCanvas();
    }

    function resetCanvas() {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#7b7b7b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "2rem Caroni, sans-serif";
      ctx.fillText(modelReady ? t("imageClassifierDrawHere") : t("imageClassifierTrainFirst"), canvas.width / 2, canvas.height / 2);

      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      placeholderImage = initialState;
      history = [initialState];
      redoHistory = [];
      ctx.beginPath();
      undoBtn.disabled = !modelReady || history.length <= 1;
      redoBtn.disabled = !modelReady || redoHistory.length === 0;
    }

    function startDrawing(event) {
      if (!modelReady) return;

      if (!hasDrawn) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasDrawn = true;
      }

      drawing = true;
      strokeMoved = false;

      const { x, y } = getCanvasPoint(event);

      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function draw(event) {
      if (!drawing || !modelReady) return;

      const { x, y } = getCanvasPoint(event);

      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "black";

      strokeMoved = true;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function endDrawing() {
      if (drawing && strokeMoved) {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (history.length > 20) history.shift();
        redoHistory = [];
      }

      drawing = false;
      ctx.beginPath();
      undoBtn.disabled = !modelReady || history.length <= 1;
      redoBtn.disabled = !modelReady || redoHistory.length === 0;
    }

    function handleUndo() {
      if (!modelReady || history.length <= 1) return;

      const currentState = history.pop();
      redoHistory.push(currentState);

      const previousState = history[history.length - 1];
      ctx.putImageData(previousState, 0, 0);
      hasDrawn = !isSameImageData(previousState, placeholderImage);
      undoBtn.disabled = !modelReady || history.length <= 1;
      redoBtn.disabled = !modelReady || redoHistory.length === 0;
    }

    function handleRedo() {
      if (!modelReady || redoHistory.length === 0) return;

      const redoneState = redoHistory.pop();
      history.push(redoneState);
      ctx.putImageData(redoneState, 0, 0);
      hasDrawn = !isSameImageData(redoneState, placeholderImage);
      undoBtn.disabled = !modelReady || history.length <= 1;
      redoBtn.disabled = !modelReady || redoHistory.length === 0;
    }

    async function classifyDrawing() {
      if (!modelReady || !trainedBrowserModel) return;

      if (!hasDrawn) {
        setPredictionPlaceholder("imageClassifierDrawSomethingFirst");
        return;
      }

      predictionLabelEl.textContent = t("imageClassifierTestingProgress");
      predictionConfidenceEl.textContent = t("imageClassifierSendingCanvas");

      try {
        await wait(120);
        const result = predictWithBrowserModel(vectorizeCanvasElement(canvas));
        showPrediction({
          label: formatLabel(result.label || "unknown"),
          confidence: typeof result.confidence === "number" ? result.confidence : null,
          source: t("imageClassifierPredictionFromBackend")
        });
      } catch (error) {
        predictionLabelEl.textContent = "-";
        predictionConfidenceEl.textContent = error.message || t("imageClassifierPredictionFallback");
      }
    }

    function showPrediction(result) {
      predictionLabelEl.textContent = result.label;
      if (typeof result.confidence === "number") {
        predictionConfidenceEl.textContent = Math.round(result.confidence * 100) + "% " + t("imageClassifierConfidence") + ". " + result.source;
      } else {
        predictionConfidenceEl.textContent = result.source;
      }
    }

    function setPredictionPlaceholder(messageKey = "imageClassifierTrainAndDraw") {
      predictionPlaceholderKey = messageKey;
      predictionLabelEl.textContent = "-";
      predictionConfidenceEl.textContent = t(messageKey);
    }

    function getCanvasPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    }

    function formatLabel(value) {
      const section = doodleSections.find((item) => item.id === value);
      if (section) return getSectionLabel(section);
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function getSelectedSamples() {
      return [...selectedDoodles]
        .map((id) => findSampleById(id))
        .filter(Boolean);
    }

    function findSampleById(id) {
      for (const section of doodleSections) {
        const sample = section.samples.find((item) => item.id === id);
        if (sample) {
          return {
            ...sample,
            labelId: section.id,
            label: getSectionLabel(section)
          };
        }
      }

      return doodleSamples.find((sample) => sample.id === id) || null;
    }

    function getTrainingPayloadSamples() {
      return getSelectedSamples()
        .filter((sample) => sample.previewImage)
        .map((sample) => ({
          id: sample.id,
          label: sample.labelId,
          image: sample.previewImage
        }));
    }

    async function vectorizeImageDataUrl(dataUrl) {
      const image = await loadImage(dataUrl);
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const offscreenCtx = offscreenCanvas.getContext("2d");
      offscreenCtx.fillStyle = "white";
      offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      offscreenCtx.drawImage(image, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      const normalizedCanvas = normalizeCanvasForClassifier(offscreenCtx, offscreenCanvas.width, offscreenCanvas.height, 64);
      return extractVectorFromContext(normalizedCanvas.getContext("2d"), 64, 64);
    }

    function vectorizeCanvasElement(sourceCanvas) {
      const sourceCtx = sourceCanvas.getContext("2d");
      const normalizedCanvas = normalizeCanvasForClassifier(sourceCtx, sourceCanvas.width, sourceCanvas.height, 64);
      return extractVectorFromContext(normalizedCanvas.getContext("2d"), 64, 64);
    }

    function normalizeCanvasForClassifier(sourceCtx, width, height, targetSize = 64) {
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
          const isInk = average < 200;

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

    function extractVectorFromContext(sourceCtx, width, height) {
      const image = sourceCtx.getImageData(0, 0, width, height);
      const vector = new Float32Array(width * height);

      for (let i = 0; i < width * height; i++) {
        const pixelOffset = i * 4;
        const average = (
          image.data[pixelOffset] +
          image.data[pixelOffset + 1] +
          image.data[pixelOffset + 2]
        ) / 3;
        vector[i] = 1 - (average / 255);
      }

      return normalizeVector(vector);
    }

    function normalizeVector(vector) {
      let magnitude = 0;
      for (let i = 0; i < vector.length; i++) {
        magnitude += vector[i] * vector[i];
      }

      magnitude = Math.sqrt(magnitude) || 1;
      return Array.from(vector, (value) => value / magnitude);
    }

    function buildBrowserModel(samples, labels) {
      return {
        labels: [...labels],
        samples: samples.map((sample) => ({
          id: sample.id,
          label: sample.label,
          vector: sample.vector
        }))
      };
    }

    function predictWithBrowserModel(vector) {
      if (!trainedBrowserModel || !trainedBrowserModel.samples.length) {
        throw new Error("No in-browser model is available yet.");
      }

      const scoredSamples = trainedBrowserModel.samples
        .map((sample) => ({
          label: sample.label,
          score: cosineSimilarity(sample.vector, vector)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(5, trainedBrowserModel.samples.length));

      const scoreByLabel = new Map();
      let totalScore = 0;

      scoredSamples.forEach((match) => {
        const safeScore = Math.max(0, match.score);
        totalScore += safeScore;
        scoreByLabel.set(match.label, (scoreByLabel.get(match.label) || 0) + safeScore);
      });

      const sortedLabels = [...scoreByLabel.entries()].sort((a, b) => b[1] - a[1]);
      const [bestLabel, bestScore] = sortedLabels[0] || [trainedBrowserModel.labels[0], 0];
      const confidence = totalScore > 0 ? bestScore / totalScore : 0.5;

      return {
        label: bestLabel,
        confidence: Math.max(0.35, Math.min(0.99, confidence))
      };
    }

    function cosineSimilarity(left, right) {
      let sum = 0;
      for (let index = 0; index < left.length; index++) {
        sum += left[index] * right[index];
      }
      return sum;
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Could not read one of the doodle images for training."));
        image.src = src;
      });
    }

    function wait(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function getSelectedLabelGroups() {
      const groups = new Map();

      getSelectedSamples().forEach((sample) => {
        const existing = groups.get(sample.labelId);
        if (existing) {
          existing.count += 1;
        } else {
          groups.set(sample.labelId, {
            labelId: sample.labelId,
            label: sample.label,
            count: 1
          });
        }
      });

      return [...groups.values()];
    }

    function getSelectedLabels() {
      return getSelectedLabelGroups().map((group) => group.label);
    }

    function getSelectedClassIds() {
      return doodleSections
        .filter((section) => selectedClasses.has(section.id))
        .map((section) => section.id);
    }

    function getSelectedClassLabels() {
      return doodleSections
        .filter((section) => selectedClasses.has(section.id))
        .map((section) => getSectionLabel(section));
    }

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

        for (let s = 0; s < strokeCount; s++) {
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

          for (let i = 0; i < pointCount; i++) {
            xs.push(view.getUint8(offset + i));
          }
          offset += pointCount;

          for (let i = 0; i < pointCount; i++) {
            ys.push(view.getUint8(offset + i));
          }
          offset += pointCount;

          drawing.push({ xs, ys });
        }

        if (!valid) break;
        drawings.push(drawing);
      }

      return drawings;
    }

    function renderQuickDrawPreview(drawing, size = 112) {
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = size;
      previewCanvas.height = size;
      const previewCtx = previewCanvas.getContext("2d");

      previewCtx.fillStyle = "white";
      previewCtx.fillRect(0, 0, size, size);
      previewCtx.strokeStyle = "#111111";
      previewCtx.lineCap = "round";
      previewCtx.lineJoin = "round";
      previewCtx.lineWidth = 3;

      const points = [];
      drawing.forEach((stroke) => {
        for (let i = 0; i < stroke.xs.length; i++) {
          points.push({ x: stroke.xs[i], y: stroke.ys[i] });
        }
      });

      if (!points.length) {
        return previewCanvas.toDataURL("image/png");
      }

      const minX = Math.min(...points.map((point) => point.x));
      const maxX = Math.max(...points.map((point) => point.x));
      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));

      const boxWidth = Math.max(1, maxX - minX);
      const boxHeight = Math.max(1, maxY - minY);
      const padding = 12;
      const drawableWidth = size - padding * 2;
      const drawableHeight = size - padding * 2;
      const scale = Math.min(drawableWidth / boxWidth, drawableHeight / boxHeight);
      const offsetX = (size - boxWidth * scale) / 2;
      const offsetY = (size - boxHeight * scale) / 2;

      drawing.forEach((stroke) => {
        if (!stroke.xs.length) return;

        previewCtx.beginPath();
        previewCtx.moveTo(
          offsetX + (stroke.xs[0] - minX) * scale,
          offsetY + (stroke.ys[0] - minY) * scale
        );

        for (let i = 1; i < stroke.xs.length; i++) {
          previewCtx.lineTo(
            offsetX + (stroke.xs[i] - minX) * scale,
            offsetY + (stroke.ys[i] - minY) * scale
          );
        }

        previewCtx.stroke();
      });

      return previewCanvas.toDataURL("image/png");
    }

    function isSameImageData(img1, img2) {
      if (!img1 || !img2 || img1.data.length !== img2.data.length) return false;

      for (let i = 0; i < img1.data.length; i++) {
        if (img1.data[i] !== img2.data[i]) return false;
      }

      return true;
    }

    function mockPredictFromCanvas() {
      const features = extractFeatures();
      const labels = getSelectedClassIds();

      if (features.empty) {
        return {
          label: t("imageClassifierNothingDetected"),
          confidence: 0.12
        };
      }

      let candidate = labels[0];

      if (features.circularity > 0.58 && labels.includes("sun")) candidate = "sun";
      else if (features.aspectRatio > 1.2 && labels.includes("fish")) candidate = "fish";
      else if (features.aspectRatio > 0.75 && features.aspectRatio < 1.25 && labels.includes("house")) candidate = "house";
      else if (features.spread > 0.68 && labels.includes("star")) candidate = "star";
      else if (features.centerBias > 0.58 && labels.includes("flower")) candidate = "flower";
      else if (features.aspectRatio > 1.4 && labels.includes("car")) candidate = "car";

      return {
        label: formatLabel(candidate),
        confidence: Math.max(0.52, Math.min(0.94, 0.55 + features.inkDensity * 0.55))
      };
    }

    function extractFeatures() {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      const inkPixels = [];

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const average = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (average < 220) inkPixels.push({ x, y });
        }
      }

      if (inkPixels.length === 0) {
        return { empty: true };
      }

      const xs = inkPixels.map((p) => p.x);
      const ys = inkPixels.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const spread = inkPixels.length / (width * height);

      let centerHits = 0;
      for (const pixel of inkPixels) {
        const dx = Math.abs(pixel.x - centerX) / Math.max(1, width / 2);
        const dy = Math.abs(pixel.y - centerY) / Math.max(1, height / 2);
        if (dx + dy < 0.85) centerHits++;
      }

      return {
        empty: false,
        aspectRatio: width / Math.max(1, height),
        spread,
        inkDensity: inkPixels.length / (canvas.width * canvas.height),
        centerBias: centerHits / inkPixels.length,
        circularity: 1 - Math.abs(width - height) / Math.max(width, height)
      };
    }
  

