const enBtn = document.getElementById("lang-en");
const daBtn = document.getElementById("lang-da");
const HOME_SCREEN_KEY = "homeScreen";
const CREDITS_MENU_MODE = "credits";
const SESSION_MENU_MODE = "session";
const LEVEL_MENU_MODE = "levels";
const PROGRESS_KEYS = ["imageClassifierUnlocked", "chatbotUnlocked"];
const IMAGE_CLASSIFIER_UNLOCK_KEY = "imageClassifierUnlocked";
const CHATBOT_UNLOCK_KEY = "chatbotUnlocked";
const NEW_SESSION_QUIZ_KEY = "showLevelIntroQuiz";
const PENDING_NEW_SESSION_RESET_KEY = "pendingNewSessionReset";
const SKIP_HOME_TRANSITION_KEY = "skipHomeTransition";
const HOME_QUIZ_DATASET = "./images/full_binary_house.bin";
const HOME_QUIZ_DRAWING_INDEXES = [2, 61];
const HOME_QUIZ_CORRECT_ANSWER = "house";
const MENU_DOODLE_BASE_PATH = "./images/menu-doodles";
const MENU_DOODLE_MIN_DURATION = 1400;
const MENU_DOODLE_PAUSE = 650;

const currentPath = window.location.pathname;
const isHomePage = currentPath.endsWith("index.html") || currentPath.endsWith("/");

const aboutMenu = document.getElementById("menu-about");
const homeMenu = document.getElementById("menu-home");
const curiousMenu = document.getElementById("menu-curious");
const continueMenu = document.getElementById("menu-continue");
const continueMenuSubtitle = document.getElementById("menu-continue-subtitle");
const newSessionMenu = document.getElementById("menu-new-session");
const languageMenu = document.getElementById("menu-language-option");
const languageMenuSubtitle = document.getElementById("menu-language-subtitle");
const creditsMenu = document.getElementById("menu-credits");
const creditsBackButton = document.getElementById("credits-back-button");
const levelBackButton = document.getElementById("level-back-button");
const homeScreens = document.getElementById("home-screens");
const homeFocus = document.querySelector(".home-focus");
const startRuleBasedBtn = document.getElementById("start-rule-based");
const startImageClassifierBtn = document.getElementById("start-image-classifier");
const startChatbotBtn = document.getElementById("start-chatbot");
const returnBtn = document.getElementById("return-btn");
const ruleCard = document.getElementById("slot-left");
const classifierCard = document.getElementById("slot-center");
const chatbotCard = document.getElementById("slot-right");
const introLead = document.querySelector(".intro-lead");
const quizContainer = document.getElementById("micro-quiz");
const quizQuestion = document.getElementById("micro-quiz-question");
const quizCanvas = document.getElementById("micro-quiz-canvas");
const quizFeedback = document.getElementById("micro-quiz-feedback");
const quizOptionButtons = Array.from(document.querySelectorAll(".micro-quiz-option"));
const menuDoodleCanvases = Array.from(document.querySelectorAll(".menu-doodle-canvas"));

let homeMenuMode = sessionStorage.getItem(HOME_SCREEN_KEY) || SESSION_MENU_MODE;
let homeQuizStep = 0;
let homeQuizDrawings = [];
let homeQuizLoaded = false;
let homeQuizLoadingPromise = null;
let menuDoodleAnimationFrame = null;
const menuDoodleState = [];
const menuDoodleCache = new Map();
const shouldSkipInitialHomeTransition = sessionStorage.getItem(SKIP_HOME_TRANSITION_KEY) === "true";

if (shouldSkipInitialHomeTransition) {
    sessionStorage.removeItem(SKIP_HOME_TRANSITION_KEY);
}

function updateLanguageButtons() {
    if (enBtn) enBtn.classList.toggle("active", currentLang === "en");
    if (daBtn) daBtn.classList.toggle("active", currentLang === "da");
}

function setStoredHomeScreen(mode) {
    homeMenuMode = mode;
    sessionStorage.setItem(HOME_SCREEN_KEY, mode);
}

function hasSavedProgress() {
    return PROGRESS_KEYS.some(key => localStorage.getItem(key) === "true");
}

function hasPendingNewSessionReset() {
    return sessionStorage.getItem(PENDING_NEW_SESSION_RESET_KEY) === "true";
}

function shouldShowLevelQuiz() {
    return sessionStorage.getItem(NEW_SESSION_QUIZ_KEY) === "true";
}

function updateLanguageMenuLabel() {
    if (!languageMenuSubtitle) return;
    languageMenuSubtitle.textContent = t(currentLang === "da" ? "menuLanguageDanish" : "menuLanguageEnglish");
}

function updateContinueState() {
    if (!continueMenu) return;

    const canContinue = hasSavedProgress();
    continueMenu.classList.toggle("disabled", !canContinue);
    continueMenu.setAttribute("aria-disabled", canContinue ? "false" : "true");
    continueMenu.tabIndex = canContinue ? 0 : -1;
    if (continueMenuSubtitle) {
        continueMenuSubtitle.textContent = t(canContinue ? "menuContinueReady" : "menuContinueEmpty");
    }
}

function applyHomeQuizTranslations() {
    if (!quizQuestion) return;

    if (homeQuizStep >= 2) {
        if (introLead) introLead.textContent = t("intro2");
        quizQuestion.textContent = t("homeQuizFinal");
        if (quizFeedback) quizFeedback.textContent = "";
        return;
    }

    quizQuestion.textContent = t(homeQuizStep === 0 ? "homeQuizQuestion1" : "homeQuizQuestion2");
    if (introLead) introLead.textContent = t("intro2");
    updateContinueState();
    updateLanguageMenuLabel();
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

function drawQuickDrawToCanvas(canvas, drawing) {
    if (!canvas || !drawing) return;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f6f6f6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1b2631";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;

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
    const padding = 18;
    const drawableWidth = canvas.width - padding * 2;
    const drawableHeight = canvas.height - padding * 2;
    const scale = Math.min(drawableWidth / boxWidth, drawableHeight / boxHeight);
    const offsetX = (canvas.width - boxWidth * scale) / 2;
    const offsetY = (canvas.height - boxHeight * scale) / 2;

    drawing.forEach(stroke => {
        if (!stroke.xs.length) return;

        ctx.beginPath();
        ctx.moveTo(
            offsetX + (stroke.xs[0] - minX) * scale,
            offsetY + (stroke.ys[0] - minY) * scale
        );

        for (let index = 1; index < stroke.xs.length; index++) {
            ctx.lineTo(
                offsetX + (stroke.xs[index] - minX) * scale,
                offsetY + (stroke.ys[index] - minY) * scale
            );
        }

        ctx.stroke();
    });
}

function getMenuDoodleDuration(drawing) {
    let maxTimestamp = 0;

    drawing.forEach(stroke => {
        const timestamps = stroke[2] || [];
        const lastPointTimestamp = timestamps[timestamps.length - 1] || 0;
        if (lastPointTimestamp > maxTimestamp) {
            maxTimestamp = lastPointTimestamp;
        }
    });

    return {
        maxTimestamp,
        playbackDuration: Math.max(maxTimestamp, MENU_DOODLE_MIN_DURATION),
    };
}

function drawMenuDoodleFrame(canvas, drawing, elapsed) {
    if (!canvas || !drawing) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const points = [];
    drawing.forEach(stroke => {
        const xs = stroke[0] || [];
        const ys = stroke[1] || [];
        for (let index = 0; index < xs.length; index++) {
            points.push({ x: xs[index], y: ys[index] });
        }
    });

    if (!points.length) return;

    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const boxWidth = Math.max(1, maxX - minX);
    const boxHeight = Math.max(1, maxY - minY);
    const padding = 24;
    const drawableWidth = canvas.width - padding * 2;
    const drawableHeight = canvas.height - padding * 2;
    const scale = Math.min(drawableWidth / boxWidth, drawableHeight / boxHeight);
    const offsetX = (canvas.width - boxWidth * scale) / 2;
    const offsetY = (canvas.height - boxHeight * scale) / 2;

    ctx.strokeStyle = "rgba(27, 38, 49, 0.88)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;

    drawing.forEach(stroke => {
        const xs = stroke[0] || [];
        const ys = stroke[1] || [];
        const timestamps = stroke[2] || [];

        if (!xs.length || !ys.length) return;

        let lastVisibleIndex = 0;
        while (
            lastVisibleIndex + 1 < xs.length &&
            (timestamps[lastVisibleIndex + 1] || 0) <= elapsed
        ) {
            lastVisibleIndex += 1;
        }

        if ((timestamps[0] || 0) > elapsed) return;

        ctx.beginPath();
        ctx.moveTo(
            offsetX + (xs[0] - minX) * scale,
            offsetY + (ys[0] - minY) * scale
        );

        for (let index = 1; index <= lastVisibleIndex; index++) {
            ctx.lineTo(
                offsetX + (xs[index] - minX) * scale,
                offsetY + (ys[index] - minY) * scale
            );
        }

        if (lastVisibleIndex < xs.length - 1) {
            const segmentStartTime = timestamps[lastVisibleIndex] || 0;
            const segmentEndTime = timestamps[lastVisibleIndex + 1] || segmentStartTime;
            const segmentDuration = Math.max(1, segmentEndTime - segmentStartTime);
            const segmentProgress = Math.max(
                0,
                Math.min(1, (elapsed - segmentStartTime) / segmentDuration)
            );
            const currentX = xs[lastVisibleIndex] + (xs[lastVisibleIndex + 1] - xs[lastVisibleIndex]) * segmentProgress;
            const currentY = ys[lastVisibleIndex] + (ys[lastVisibleIndex + 1] - ys[lastVisibleIndex]) * segmentProgress;

            ctx.lineTo(
                offsetX + (currentX - minX) * scale,
                offsetY + (currentY - minY) * scale
            );
        }

        ctx.stroke();
    });
}

async function loadMenuDoodleSet(name) {
    if (menuDoodleCache.has(name)) {
        return menuDoodleCache.get(name);
    }

    const response = await fetch(`${MENU_DOODLE_BASE_PATH}/${name}.json`);
    if (!response.ok) {
        throw new Error(`Could not load doodle set: ${name}`);
    }

    const payload = await response.json();
    const drawings = Array.isArray(payload.drawings) ? payload.drawings : [];
    menuDoodleCache.set(name, drawings);
    return drawings;
}

function startMenuDoodleAnimation() {
    if (!menuDoodleState.length || menuDoodleAnimationFrame) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = now => {
        menuDoodleState.forEach(state => {
            const drawingEntry = state.drawings[state.index];
            if (!drawingEntry) return;

            const drawing = drawingEntry.drawing;
            const { maxTimestamp, playbackDuration } = getMenuDoodleDuration(drawing);

            if (state.startedAt === null) {
                state.startedAt = now;
            }

            const cycleElapsed = now - state.startedAt;
            const effectiveElapsed = prefersReducedMotion
                ? maxTimestamp
                : Math.min(
                    maxTimestamp,
                    (Math.min(cycleElapsed, playbackDuration) / playbackDuration) * maxTimestamp
                );

            drawMenuDoodleFrame(state.canvas, drawing, effectiveElapsed);

            if (cycleElapsed >= playbackDuration + MENU_DOODLE_PAUSE) {
                state.index = (state.index + 1) % state.drawings.length;
                state.startedAt = now;
            }
        });

        menuDoodleAnimationFrame = window.requestAnimationFrame(render);
    };

    menuDoodleAnimationFrame = window.requestAnimationFrame(render);
}

async function initializeMenuDoodles() {
    if (!isHomePage || !menuDoodleCanvases.length) return;

    let doodleSets = [];

    try {
        doodleSets = await Promise.all(
            menuDoodleCanvases.map(async (canvas, index) => {
                const source = canvas.dataset.source;
                if (!source) return null;

                const drawings = await loadMenuDoodleSet(source);
                if (!drawings.length) return null;

                return {
                    canvas,
                    drawings,
                    index: index % drawings.length,
                    startedAt: null,
                };
            })
        );
    } catch (error) {
        console.error(error);
        return;
    }

    doodleSets.filter(Boolean).forEach(state => {
        menuDoodleState.push(state);
    });

    startMenuDoodleAnimation();
}

function renderHomeQuizStep() {
    if (!quizCanvas) return;

    if (homeQuizStep >= 2) {
        quizOptionButtons.forEach(button => {
            button.hidden = true;
        });
        if (ruleCard) {
            ruleCard.classList.add("journey-node-highlighted");
        }
        applyHomeQuizTranslations();
        return;
    }

    quizOptionButtons.forEach(button => {
        button.hidden = false;
        button.classList.remove("is-correct");
    });
    drawQuickDrawToCanvas(quizCanvas, homeQuizDrawings[homeQuizStep]);
    applyHomeQuizTranslations();
}

function resetHomeQuizState() {
    homeQuizStep = 0;
    if (quizFeedback) quizFeedback.textContent = "";
    quizOptionButtons.forEach(button => {
        button.hidden = false;
        button.classList.remove("is-correct");
    });
    if (ruleCard) {
        ruleCard.classList.remove("journey-node-highlighted");
    }
}

async function ensureHomeQuizLoaded() {
    if (!quizCanvas || !quizQuestion || !quizOptionButtons.length) return;
    if (homeQuizLoaded) return;
    if (homeQuizLoadingPromise) {
        await homeQuizLoadingPromise;
        return;
    }

    homeQuizLoadingPromise = (async () => {
        applyHomeQuizTranslations();

        const response = await fetch(HOME_QUIZ_DATASET);
        if (!response.ok) throw new Error("Could not load quiz doodles.");
        const buffer = await response.arrayBuffer();
        const drawings = parseQuickDrawBinary(buffer, HOME_QUIZ_DRAWING_INDEXES[1] + 1);
        homeQuizDrawings = HOME_QUIZ_DRAWING_INDEXES.map(index => drawings[index]).filter(Boolean);
        homeQuizLoaded = true;
    })();

    try {
        await homeQuizLoadingPromise;
    } catch (error) {
        if (quizFeedback) quizFeedback.textContent = error.message;
    } finally {
        homeQuizLoadingPromise = null;
    }
}

async function updateLevelQuizVisibility() {
    if (!quizContainer || !homeFocus) return;

    const shouldShow = homeMenuMode === LEVEL_MENU_MODE && shouldShowLevelQuiz();
    quizContainer.hidden = !shouldShow;
    homeFocus.classList.toggle("quiz-hidden", !shouldShow);

    if (!shouldShow) return;

    await ensureHomeQuizLoaded();
    if (homeQuizLoaded) {
        renderHomeQuizStep();
    }
}

function updateLevelCardState() {
    if (hasPendingNewSessionReset()) {
        if (classifierCard) {
            classifierCard.classList.add("locked", "card-step-locked");
            classifierCard.classList.remove("card-step-next");
            if (startImageClassifierBtn) startImageClassifierBtn.hidden = true;
        }

        if (chatbotCard) {
            chatbotCard.classList.add("locked", "card-step-locked");
            if (startChatbotBtn) startChatbotBtn.hidden = true;
        }

        return;
    }

    if (classifierCard) {
        const isUnlocked = localStorage.getItem(IMAGE_CLASSIFIER_UNLOCK_KEY) === "true";
        classifierCard.classList.toggle("locked", !isUnlocked);
        classifierCard.classList.toggle("card-step-locked", !isUnlocked);
        classifierCard.classList.toggle("card-step-next", isUnlocked);
        if (startImageClassifierBtn) startImageClassifierBtn.hidden = !isUnlocked;
    }

    if (chatbotCard) {
        const isUnlocked = localStorage.getItem(CHATBOT_UNLOCK_KEY) === "true";
        chatbotCard.classList.toggle("locked", !isUnlocked);
        chatbotCard.classList.toggle("card-step-locked", !isUnlocked);
        if (startChatbotBtn) startChatbotBtn.hidden = !isUnlocked;
    }
}

function showHomeMenu(mode) {
    setStoredHomeScreen(mode);

    if (homeScreens) {
        homeScreens.classList.remove("is-credits", "is-session", "is-levels");
        if (mode === CREDITS_MENU_MODE) {
            homeScreens.classList.add("is-credits");
        } else if (mode === LEVEL_MENU_MODE) {
            homeScreens.classList.add("is-levels");
        } else {
            homeScreens.classList.add("is-session");
        }
    }

    updateContinueState();
    updateLanguageMenuLabel();

    if (mode === LEVEL_MENU_MODE) {
        updateLevelCardState();
    }

    void updateLevelQuizVisibility();
}

function startNewSession() {
    resetHomeQuizState();
    sessionStorage.setItem(NEW_SESSION_QUIZ_KEY, "true");
    sessionStorage.setItem(PENDING_NEW_SESSION_RESET_KEY, "true");
    showHomeMenu(LEVEL_MENU_MODE);
}

function clearProgressForNewSession() {
    if (!hasPendingNewSessionReset()) return;
    localStorage.clear();
    sessionStorage.removeItem(PENDING_NEW_SESSION_RESET_KEY);
}

function handleHomeQuizAnswer(answer) {
    if (homeQuizStep >= 2) return;

    if (answer !== HOME_QUIZ_CORRECT_ANSWER) {
        if (quizFeedback) quizFeedback.textContent = t("homeQuizWrong");
        return;
    }

    if (quizFeedback) quizFeedback.textContent = t("homeQuizCorrect");
    quizOptionButtons.forEach(button => {
        button.classList.toggle("is-correct", button.dataset.answer === answer);
    });

    homeQuizStep += 1;

    window.setTimeout(() => {
        if (quizFeedback) quizFeedback.textContent = "";
        renderHomeQuizStep();
    }, 500);
}

function updatePageMeta() {
    document.documentElement.lang = currentLang === "da" ? "da" : "en";

    if (currentPath.endsWith("image-classifier.html")) return;

    if (currentPath.endsWith("other-resources.html")) {
        document.title = t("pageTitleCurious");
    } else if (currentPath.endsWith("rule-based-ai.html")) {
        document.title = t("pageTitleRuleBased");
    } else if (currentPath.endsWith("chatbot.html")) {
        document.title = t("pageTitleChatbot");
    } else {
        document.title = t("pageTitleHome");
    }
}

function attachCardNavigation(card, button) {
    if (!card || !button) return;

    const trigger = () => {
        if (card.classList.contains("locked") || button.hidden) return;
        button.click();
    };

    card.addEventListener("click", trigger);
    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            trigger();
        }
    });
}

function attachMenuAction(menu, handler) {
    if (!menu) return;

    const trigger = () => {
        if (menu.classList.contains("disabled")) return;
        handler();
    };

    menu.addEventListener("click", trigger);
    menu.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            trigger();
        }
    });
}

if (enBtn) {
    enBtn.onclick = () => {
        setLanguage("en");
        updatePageMeta();
        updateLanguageButtons();
        applyTranslations();
        applyHomeQuizTranslations();
    };
}

if (daBtn) {
    daBtn.onclick = () => {
        setLanguage("da");
        updatePageMeta();
        updateLanguageButtons();
        applyTranslations();
        applyHomeQuizTranslations();
    };
}

quizOptionButtons.forEach(button => {
    button.addEventListener("click", () => handleHomeQuizAnswer(button.dataset.answer));
});

if (aboutMenu) {
    aboutMenu.onclick = () => {
        sessionStorage.setItem(HOME_SCREEN_KEY, CREDITS_MENU_MODE);
        window.location.href = "index.html";
    };
}

if (curiousMenu) {
    curiousMenu.onclick = () => {
        if (currentPath.endsWith("other-resources.html")) return;
        window.location.href = "other-resources.html";
    };
}

if (homeMenu) {
    homeMenu.onclick = () => {
        if (currentPath.endsWith("index.html") || currentPath.endsWith("/")) return;
        sessionStorage.setItem(HOME_SCREEN_KEY, SESSION_MENU_MODE);
        window.location.href = "index.html";
    };
}

if (startRuleBasedBtn) {
    startRuleBasedBtn.onclick = () => {
        clearProgressForNewSession();
        sessionStorage.setItem(HOME_SCREEN_KEY, LEVEL_MENU_MODE);
        sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
        window.location.href = "rule-based-ai.html";
    };
}

if (startImageClassifierBtn) {
    startImageClassifierBtn.onclick = () => {
        clearProgressForNewSession();
        sessionStorage.setItem(HOME_SCREEN_KEY, LEVEL_MENU_MODE);
        sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
        window.location.href = "image-classifier.html";
    };
}

if (startChatbotBtn) {
    startChatbotBtn.onclick = () => {
        clearProgressForNewSession();
        sessionStorage.setItem(HOME_SCREEN_KEY, LEVEL_MENU_MODE);
        sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
        window.location.href = "chatbot.html";
    };
}

attachCardNavigation(ruleCard, startRuleBasedBtn);
attachCardNavigation(classifierCard, startImageClassifierBtn);
attachCardNavigation(chatbotCard, startChatbotBtn);

attachMenuAction(continueMenu, () => {
    if (!hasSavedProgress()) return;
    sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
    sessionStorage.removeItem(PENDING_NEW_SESSION_RESET_KEY);
    showHomeMenu(LEVEL_MENU_MODE);
});

attachMenuAction(newSessionMenu, startNewSession);

attachMenuAction(languageMenu, () => {
    setLanguage(currentLang === "en" ? "da" : "en");
    updatePageMeta();
    updateLanguageButtons();
    applyTranslations();
    applyHomeQuizTranslations();
});

attachMenuAction(creditsMenu, () => {
    showHomeMenu(CREDITS_MENU_MODE);
});

if (creditsBackButton) {
    creditsBackButton.onclick = () => {
        showHomeMenu(SESSION_MENU_MODE);
    };
}

if (levelBackButton) {
    levelBackButton.onclick = () => {
        sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
        sessionStorage.removeItem(PENDING_NEW_SESSION_RESET_KEY);
        showHomeMenu(SESSION_MENU_MODE);
    };
}

if (returnBtn) {
    returnBtn.onclick = () => {
        if (currentPath.endsWith("rule-based-ai.html")) {
            localStorage.setItem(IMAGE_CLASSIFIER_UNLOCK_KEY, "true");
            sessionStorage.setItem(HOME_SCREEN_KEY, LEVEL_MENU_MODE);
            sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
            sessionStorage.setItem(SKIP_HOME_TRANSITION_KEY, "true");
            window.location.href = "index.html";
            return;
        }

        if (currentPath.endsWith("image-classifier.html")) {
            localStorage.setItem(CHATBOT_UNLOCK_KEY, "true");
            sessionStorage.setItem(HOME_SCREEN_KEY, LEVEL_MENU_MODE);
            sessionStorage.removeItem(NEW_SESSION_QUIZ_KEY);
            sessionStorage.setItem(SKIP_HOME_TRANSITION_KEY, "true");
            window.location.href = "index.html";
            return;
        }

        sessionStorage.setItem(HOME_SCREEN_KEY, SESSION_MENU_MODE);
        window.location.href = "index.html";
    };
}

updatePageMeta();
updateLanguageButtons();
applyTranslations();
void initializeMenuDoodles();

if (isHomePage) {
    if (homeScreens && shouldSkipInitialHomeTransition) {
        homeScreens.classList.add("no-transition");
    }
    if (![CREDITS_MENU_MODE, SESSION_MENU_MODE, LEVEL_MENU_MODE].includes(homeMenuMode)) {
        homeMenuMode = SESSION_MENU_MODE;
    }
    showHomeMenu(homeMenuMode);
    if (homeScreens && shouldSkipInitialHomeTransition) {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                homeScreens.classList.remove("no-transition");
            });
        });
    }
} else {
    updateContinueState();
    updateLanguageMenuLabel();
}
