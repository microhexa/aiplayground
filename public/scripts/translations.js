const translations = {
    en: {
        siteTitle: "The AI Playground",
        menuOption1: "Home",
        menuOption2: "About",
        menuOption3: "For the curious",
        intro1: "Welcome to the AI Playground",
        intro2: "A space where you can explore and interact with different AI models.",
        intro3: "Click a card to try it out.",
        start: "Start",
        chatbotTitle: "Chatbot",
        chatbotText: "It sounds smart and confident. But is it always right?",
        classifierTitle: "Image classifier",
        classifierText: "It's very good at spotting patterns in pictures. But does it really understand them?",
        rulesTitle: "Rule-based AI",
        rulesText: "It never guesses - it only follows rules. But what happens outside them?"
    },
    da: {
        siteTitle: "AI Legepladsen",
        menuOption1: "Hjem",
        menuOption2: "Om",
        menuOption3: "For de nysgerrige",
        intro1: "Velkommen til AI Legepladsen",
        intro2: "Et sted, hvor du kan udforske og interagere med forskellige AI-modeller.",
        intro3: "Klik på et kort for at prøve det.",
        start: "Start",
        chatbotTitle: "Chatbot",
        chatbotText: "Den lyder smart og selvsikker. Men har den altid ret?",
        classifierTitle: "Billedklassifikator",
        classifierText: "Den er meget god til at genkende mønstre i billeder. Men forstår den dem egentlig?",
        rulesTitle: "Regelbaseret AI",
        rulesText: "Den gætter aldrig - den følger kun regler. Men hvad sker der uden for dem?"
    }
};

let currentLang = localStorage.getItem("lang") || "en";

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("lang", lang);
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = translations[currentLang][key];
    });
}
