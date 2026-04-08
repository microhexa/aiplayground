const enBtn = document.getElementById("lang-en");
const daBtn = document.getElementById("lang-da");

function updateLanguageButtons() {
    enBtn.classList.toggle("active", currentLang === "en");
    daBtn.classList.toggle("active", currentLang === "da");
}

enBtn.onclick = () => {
    setLanguage("en");
    updateLanguageButtons();
    applyTranslations();
};

daBtn.onclick = () => {
    setLanguage("da");
    updateLanguageButtons();
    applyTranslations();
};

const aboutMenu = document.getElementById("menu-about");
const homeMenu = document.getElementById("menu-home");
const curiousMenu = document.getElementById("menu-curious");
const startRuleBasedBtn = document.getElementById("start-rule-based");

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

updateLanguageButtons();
applyTranslations();