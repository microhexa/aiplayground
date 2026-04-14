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
        chatbotText: "It sounds smart and confident.",
        classifierTitle: "Image classifier",
        classifierText: "It's very good at spotting patterns in pictures.",
        rulesTitle: "Rule-based AI",
        rulesText: "It never guesses - it only follows rules. Can the AI identify what you draw?",
        challengesTitle: "Challenges",
        challengeSun: "Draw a sun",
        challengeHouse: "Draw a house",
        challengeFish: "Draw a fish",
        challengeNote: "Challenges are complete when the AI recognizes the drawn image.",
        classifyBtn: "Classify",
        detectedTitle: "Detected:",
        whyTitle: "Why:",
        drawHere: "Draw here!",
        labelNothing: "Nothing drawn",
        labelFish: "Fish",
        labelHouse: "House",
        labelSun: "Sun",
        labelUnknown: "Unknown doodle",
        reasonNoInk: "No ink pixels detected",
        reasonFishWidth: "Drawing is wider than tall",
        reasonFishMiddle: "Most ink lies in the middle horizontal band",
        reasonFishTopBottomLow: "Top and bottom contain relatively little ink",
        reasonFishImbalance: "Left and right sides are imbalanced",
        reasonFishBodyTail: "This fits a body-and-tail shape",
        reasonHouseMidBottom: "Much of the ink is in the middle and lower region",
        reasonHouseSymmetric: "Drawing is fairly vertically symmetric",
        reasonHouseProportions: "Overall proportions fit a house-like shape",
        reasonSunBalanced: "Shape is roughly balanced",
        reasonSunSparse: "Ink density is relatively sparse",
        reasonSunSymmetry: "Drawing is symmetric both vertically and horizontally",
        reasonDefaultNoMatch: "No specific rule matched strongly",
        reasonDefaultFallback: "Falling back to default class",
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
        chatbotText: "Den lyder smart og selvsikker.",
        classifierTitle: "Billedklassifikator",
        classifierText: "Den er meget god til at genkende mønstre i billeder.",
        rulesTitle: "Regelbaseret AI",
        rulesText: "Den gætter aldrig - den følger kun regler. Kan AI'en se, hvad du tegner?",
        challengesTitle: "Udfordringer",
        challengeSun: "Tegn en sol",
        challengeHouse: "Tegn et hus",
        challengeFish: "Tegn en fisk",
        challengeNote: "Udfordringer er fuldført, når AI'en genkender det tegnede billede.",
        classifyBtn: "Klassificer",
        detectedTitle: "Genkendt:",
        whyTitle: "Hvorfor:",
        drawHere: "Tegn her!",
        labelNothing: "Intet tegnet",
        labelFish: "Fisk",
        labelHouse: "Hus",
        labelSun: "Sol",
        labelUnknown: "Ukendt doodle",
        reasonNoInk: "Ingen blækpixels registreret",
        reasonFishWidth: "Tegningen er bredere end høj",
        reasonFishMiddle: "Det meste blæk ligger i den midterste vandrette zone",
        reasonFishTopBottomLow: "Top og bund indeholder relativt lidt blæk",
        reasonFishImbalance: "Venstre og højre side er ubalanceret",
        reasonFishBodyTail: "Dette passer med en krops-og-hale form",
        reasonHouseMidBottom: "Meget af blækket er i midter- og nederste område",
        reasonHouseSymmetric: "Tegningen er relativt lodret symmetrisk",
        reasonHouseProportions: "Samlede proportioner passer til en hus-lignende form",
        reasonSunBalanced: "Formen er nogenlunde afbalanceret",
        reasonSunSparse: "Blæktætheden er relativt sparsom",
        reasonSunSymmetry: "Tegningen er symmetrisk både lodret og vandret",
        reasonDefaultNoMatch: "Ingen specifik regel matchede stærkt",
        reasonDefaultFallback: "Bruger standardklassen som fallback",
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

function t(key) {
    return translations[currentLang][key] || key;
}
