const enBtn = document.getElementById("lang-en");
const daBtn = document.getElementById("lang-da");

function updateLanguageButtons() {
    if (enBtn) enBtn.classList.toggle("active", currentLang === "en");
    if (daBtn) daBtn.classList.toggle("active", currentLang === "da");
}

if (enBtn) {
    enBtn.onclick = () => {
        setLanguage("en");
        updatePageMeta();
        updateLanguageButtons();
        applyTranslations();
    };
}

if (daBtn) {
    daBtn.onclick = () => {
        setLanguage("da");
        updatePageMeta();
        updateLanguageButtons();
        applyTranslations();
    };
}

const aboutMenu = document.getElementById("menu-about");
const homeMenu = document.getElementById("menu-home");
const curiousMenu = document.getElementById("menu-curious");
const startRuleBasedBtn = document.getElementById("start-rule-based");
const startImageClassifierBtn = document.getElementById("start-image-classifier");
const startChatbotBtn = document.getElementById("start-chatbot");
const returnBtn = document.getElementById("return-btn");
const classifierCard = document.getElementById("slot-center");
const chatbotCard = document.getElementById("slot-right");
const IMAGE_CLASSIFIER_UNLOCK_KEY = "imageClassifierUnlocked";
const CHATBOT_UNLOCK_KEY = "chatbotUnlocked";

function updatePageMeta() {
    document.documentElement.lang = currentLang === "da" ? "da" : "en";

    const currentPath = window.location.pathname;
    if (currentPath.endsWith("image-classifier.html")) return;

    if (currentPath.endsWith("about.html")) {
        document.title = t("pageTitleAbout");
    } else if (currentPath.endsWith("other-resources.html")) {
        document.title = t("pageTitleCurious");
    } else if (currentPath.endsWith("rule-based-ai.html")) {
        document.title = t("pageTitleRuleBased");
    } else if (currentPath.endsWith("chatbot.html")) {
        document.title = t("pageTitleChatbot");
    } else {
        document.title = t("pageTitleHome");
    }
}

if (aboutMenu) {
    aboutMenu.onclick = () => {
        const currentPath = window.location.pathname;
        if (currentPath.endsWith("about.html")) return;
        window.location.href = "about.html";
    };
}

if (curiousMenu) {
    curiousMenu.onclick = () => {
        const currentPath = window.location.pathname;
        if (currentPath.endsWith("other-resources.html")) return;
        window.location.href = "other-resources.html";
    };
}

if (homeMenu) {
    homeMenu.onclick = () => {
        const currentPath = window.location.pathname;
        if (currentPath.endsWith("index.html") || currentPath.endsWith("/")) return;
        window.location.href = "index.html";
    };
}

if (startRuleBasedBtn) {
    startRuleBasedBtn.onclick = () => {
        window.location.href = "rule-based-ai.html";
    };
}

if (startImageClassifierBtn) {
    startImageClassifierBtn.onclick = () => {
        window.location.href = "image-classifier.html";
    };
}

if (startChatbotBtn) {
    startChatbotBtn.onclick = () => {
        window.location.href = "chatbot.html";
    };
}

if (returnBtn) {
    returnBtn.onclick = () => {
        const currentPath = window.location.pathname;
        if (currentPath.endsWith("rule-based-ai.html")) {
            localStorage.setItem(IMAGE_CLASSIFIER_UNLOCK_KEY, "true");
        } else if (currentPath.endsWith("image-classifier.html")) {
            localStorage.setItem(CHATBOT_UNLOCK_KEY, "true");
        }
        window.location.href = "index.html";
    }
}

if (classifierCard) {
    const isUnlocked = localStorage.getItem(IMAGE_CLASSIFIER_UNLOCK_KEY) === "true";
    classifierCard.classList.toggle("locked", !isUnlocked);
    classifierCard.classList.toggle("card-step-locked", !isUnlocked);
    classifierCard.classList.toggle("card-step-next", isUnlocked);
    if (startImageClassifierBtn) {
        startImageClassifierBtn.hidden = !isUnlocked;
    }
}

if (chatbotCard) {
    const isUnlocked = localStorage.getItem(CHATBOT_UNLOCK_KEY) === "true";
    chatbotCard.classList.toggle("locked", !isUnlocked);
    chatbotCard.classList.toggle("card-step-locked", !isUnlocked);
    if (startChatbotBtn) {
        startChatbotBtn.hidden = !isUnlocked;
    }
}

updatePageMeta();
updateLanguageButtons();
applyTranslations();
