let draggedRuleId = null;

const rulesBtn = document.getElementById("rules-btn");
const rulesPopup = document.getElementById("rules-popup");
const closeRulesBtn = document.getElementById("close-rules-btn");
const rulesList = document.getElementById("rules-list");

const addRuleBtn = document.getElementById("add-rule-btn");
const ruleBuilder = document.getElementById("rule-builder");
const ruleBuilderTitle = document.getElementById("rule-builder-title");
const ruleBuilderBlocks = document.getElementById("rule-builder-blocks");
const saveRuleBtn = document.getElementById("save-rule-btn");
const cancelRuleBtn = document.getElementById("cancel-rule-btn");
const newRuleNameInput = document.getElementById("new-rule-name");

rulesBtn.addEventListener("click", () => {
  renderRules();
  rulesPopup.classList.remove("hidden");
});

closeRulesBtn.addEventListener("click", () => {
  rulesPopup.classList.add("hidden");
});

addRuleBtn.addEventListener("click", () => {
  renderRuleBuilder();
  ruleBuilder.classList.remove("hidden");
});

cancelRuleBtn.addEventListener("click", () => {
  resetRuleBuilder();
});

const ruleBlocks = [
  {
    id: "shape",
    prompt: "The drawing should be...",
    options: [
      {
        id: "wide",
        text: "wider than tall",
        conditions: [
          { feature: "aspectRatio", op: ">", value: 1.2 }
        ]
      },
      {
        id: "tall",
        text: "taller than wide",
        conditions: [
          { feature: "aspectRatio", op: "<", value: 0.8 }
        ]
      },
      {
        id: "round",
        text: "about as wide as it is tall",
        conditions: [
          { feature: "aspectRatio", op: ">", value: 0.85 },
          { feature: "aspectRatio", op: "<", value: 1.3 }
        ]
      }
    ]
  },
  {
    id: "position",
    prompt: "Most of the drawing should be...",
    options: [
      {
        id: "middle",
        text: "in the middle",
        conditions: [
          { feature: "middleHRatio", op: ">", value: 0.45 }
        ]
      },
      {
        id: "bottom",
        text: "near the bottom",
        conditions: [
          { feature: "bottomRatio", op: ">", value: 0.30 }
        ]
      }
    ]
  },
  {
    id: "sides",
    prompt: "The two sides should look...",
    options: [
      {
        id: "same",
        text: "similar",
        conditions: [
          { feature: "verticalSymmetry", op: ">", value: 0.75 }
        ]
      },
      {
        id: "different",
        text: "different",
        conditions: [
          { feature: "verticalSymmetry", op: "<", value: 0.9 }
        ]
      }
    ]
  }
];

function populateRuleBuilderFromRule(rule, readOnly = false) {
  renderRuleBuilder();

  ruleBuilder.classList.remove("hidden");
  newRuleNameInput.value = rule.name;
  ruleBuilder.dataset.editingRuleId = readOnly ? "" : rule.id;
  ruleBuilder.dataset.readOnly = readOnly ? "true" : "false";

  ruleBuilderTitle.textContent = readOnly ? "View rule" : "Edit rule";

  const selects = ruleBuilderBlocks.querySelectorAll("select");

  for (const select of selects) {
    const blockId = select.dataset.blockId;
    const block = ruleBlocks.find(b => b.id === blockId);
    if (!block) continue;

    const matchingOption = block.options.find(option =>
      option.conditions.every(optionCondition =>
        rule.conditions.some(ruleCondition =>
          ruleCondition.feature === optionCondition.feature &&
          ruleCondition.op === optionCondition.op &&
          ruleCondition.value === optionCondition.value
        )
      )
    );

    if (matchingOption) {
      select.value = matchingOption.id;
    }
  }

  newRuleNameInput.disabled = readOnly;
  selects.forEach(select => {
    select.disabled = readOnly;
  });

  saveRuleBtn.style.display = readOnly ? "none" : "";
}

function renderRuleBuilder() {
  ruleBuilderBlocks.innerHTML = "";

  for (const block of ruleBlocks) {
    const wrapper = document.createElement("div");
    wrapper.className = "rule-builder-block";

    wrapper.innerHTML = `
      <label for="block-${block.id}">${block.prompt}</label>
      <select id="block-${block.id}" data-block-id="${block.id}">
        <option value="">Choose one</option>
        ${block.options.map(option => `
          <option value="${option.id}">${option.text}</option>
        `).join("")}
      </select>
    `;

    ruleBuilderBlocks.appendChild(wrapper);
  }
}

function resetRuleBuilder() {
  ruleBuilder.classList.add("hidden");
  ruleBuilder.dataset.editingRuleId = "";
  ruleBuilder.dataset.readOnly = "false";
  newRuleNameInput.value = "";
  newRuleNameInput.disabled = false;
  ruleBuilderBlocks.innerHTML = "";
  ruleBuilderTitle.textContent = "Make your own rule";
  saveRuleBtn.style.display = "";
}

saveRuleBtn.addEventListener("click", () => {
  if (ruleBuilder.dataset.readOnly === "true") return;
  
  const name = newRuleNameInput.value.trim();

  if (!name) {
    alert("Please choose a name for your label.");
    return;
  }

  const selectedConditions = [];
  const childExplanation = [];

  const selects = ruleBuilderBlocks.querySelectorAll("select");

  selects.forEach((select) => {
    const blockId = select.dataset.blockId;
    const optionId = select.value;

    if (!optionId) return;

    const block = ruleBlocks.find(b => b.id === blockId);
    const option = block?.options.find(o => o.id === optionId);

    if (!option) return;

    selectedConditions.push(...option.conditions);
    childExplanation.push(`${block.prompt} ${option.text}`);
  });

  if (selectedConditions.length === 0) {
    alert("Please choose at least one rule.");
    return;
  }

  const editingRuleId = ruleBuilder.dataset.editingRuleId;

  if (editingRuleId) {
    const rule = customRules.find(r => r.id === editingRuleId);
    if (!rule) return;

    rule.name = name;
    rule.label = name;
    rule.conditions = selectedConditions;
    rule.childExplanation = childExplanation;
  } else {
    const newRule = {
      id: `custom-${Date.now()}`,
      name,
      label: name,
      locked: false,
      reasons: ["This matches the rule you made."],
      conditions: selectedConditions,
      childExplanation
    };

    customRules.push(newRule);
  }

  saveCustomRules();
  window.ruleDefinitions = getAllRules();
  renderRules();
  resetRuleBuilder();
});

function formatConditionForChild(condition) {
  const names = {
    aspectRatio: "The shape",
    middleHRatio: "Most of the drawing",
    topRatio: "Most of the drawing",
    bottomRatio: "Most of the drawing",
    verticalSymmetry: "The two sides",
    horizontalSymmetry: "The top and bottom",
    density: "The drawing",
    colVariation: "The middle part",
    leftRightDifference: "One side"
  };

  if (condition.feature === "aspectRatio" && condition.op === ">") {
    return "The drawing should be wider than it is tall.";
  }

  if (condition.feature === "aspectRatio" && condition.op === "<" && condition.value === 0.8) {
    return "The drawing should be taller than it is wide.";
  }

  if (condition.feature === "aspectRatio" && condition.op === ">" && condition.value === 0.85) {
    return "The drawing should be almost as wide as it is tall.";
  }

  if (condition.feature === "aspectRatio" && condition.op === "<" && condition.value === 1.3) {
    return "The drawing should be almost as tall as it is wide.";
  }

  if (condition.feature === "middleHRatio") {
    return "Most of the drawing should be in the middle.";
  }

  if (condition.feature === "topRatio" && condition.op === "<") {
    return "There should not be too much at the top.";
  }

  if (condition.feature === "bottomRatio" && condition.op === "<") {
    return "There should not be too much at the bottom.";
  }

  if (condition.feature === "bottomRatio" && condition.op === ">") {
    return "A lot of the drawing should be near the bottom.";
  }

  if (condition.feature === "verticalSymmetry" && condition.op === ">") {
    return "The two sides should look similar.";
  }

  if (condition.feature === "verticalSymmetry" && condition.op === "<") {
    return "The two sides should not look exactly the same.";
  }

  if (condition.feature === "horizontalSymmetry" && condition.op === ">") {
    return "The top and bottom should look similar.";
  }

  if (condition.feature === "density" && condition.op === "<") {
    return "The drawing should have a lot of empty space.";
  }

  if (condition.feature === "density" && condition.op === ">") {
    return "The drawing should fill a lot of the space.";
  }

  if (condition.feature === "leftRightDifference") {
    return "One side should stick out a bit more than the other.";
  }

  if (condition.feature === "colVariation") {
    return "The middle should be stronger than the ends.";
  }

  return `${names[condition.feature] || "The drawing"} should match this rule.`;
}

const builtInRules = [
  {
    id: "fish",
    name: "Fish",
    label: "labelFish",
    locked: true,
    reasons: [
      "reasonFishWidth",
      "reasonFishMiddle",
      "reasonFishTopBottomLow",
      "reasonFishImbalance",
      "reasonFishBodyTail"
    ],
    conditions: [
      { feature: "aspectRatio", op: ">", value: 1.2 },
      { feature: "middleHRatio", op: ">", value: 0.45 },
      { feature: "topRatio", op: "<", value: 0.35 },
      { feature: "bottomRatio", op: "<", value: 0.35 },
      { feature: "verticalSymmetry", op: "<", value: 0.9 },
      { feature: "colVariation", op: "<", value: 0.3 },
      { feature: "leftRightDifference", op: ">", value: 0.08 }
    ]
  },
  {
    id: "house",
    name: "House",
    label: "labelHouse",
    locked: true,
    reasons: [
      "reasonHouseMidBottom",
      "reasonHouseSymmetric",
      "reasonHouseProportions"
    ],
    conditions: [
      { feature: "bottomRatio", op: ">", value: 0.30 },
      { feature: "middleHRatio", op: ">", value: 0.30 },
      { feature: "verticalSymmetry", op: ">", value: 0.75 },
      { feature: "aspectRatio", op: ">", value: 0.7 },
      { feature: "aspectRatio", op: "<", value: 1.4 }
    ]
  },
  {
    id: "sun",
    name: "Sun",
    label: "labelSun",
    locked: true,
    reasons: [
      "reasonSunBalanced",
      "reasonSunSparse",
      "reasonSunSymmetry"
    ],
    conditions: [
      { feature: "aspectRatio", op: ">", value: 0.85 },
      { feature: "aspectRatio", op: "<", value: 1.3 },
      { feature: "density", op: "<", value: 0.18 },
      { feature: "verticalSymmetry", op: ">", value: 0.75 },
      { feature: "horizontalSymmetry", op: ">", value: 0.75 }
    ]
  }
];

let customRules = JSON.parse(localStorage.getItem("customRules") || "[]");

function saveCustomRules() {
  localStorage.setItem("customRules", JSON.stringify(customRules));
}

function getAllRules() {
  return [...builtInRules, ...customRules];
}

window.ruleDefinitions = getAllRules();

function attachRuleDeleteHandlers() {
  const deleteButtons = rulesList.querySelectorAll(".rule-delete-btn");

  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const ruleId = btn.dataset.ruleId;
      customRules = customRules.filter(rule => rule.id !== ruleId);
      saveCustomRules();
      window.ruleDefinitions = getAllRules();
      renderRules();
    });
  });
}

function attachRuleEditHandlers() {
  const editButtons = rulesList.querySelectorAll(".rule-edit-btn");

  editButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const ruleId = btn.dataset.ruleId;
      const rule = customRules.find(r => r.id === ruleId);
      if (!rule) return;

      populateRuleBuilderFromRule(rule, false);
    });
  });
}

function attachRuleViewHandlers() {
  const viewButtons = rulesList.querySelectorAll(".rule-view-btn");

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const ruleId = btn.dataset.ruleId;
      const rule = builtInRules.find(r => r.id === ruleId);
      if (!rule) return;

      populateRuleBuilderFromRule(rule, true);
    });
  });
}

function renderRules() {
  if (!rulesList) return;

  rulesList.innerHTML = "";

  for (const rule of window.ruleDefinitions) {
    const card = document.createElement("div");
    const isCustom = !rule.locked;

    card.className = "rule-card";
    card.dataset.ruleId = rule.id;

    if (isCustom) {
      card.classList.add("draggable-rule");
    }

    card.innerHTML = `
      <div class="rule-header">
        <div class="rule-header-left">
          ${isCustom ? `
            <div class="rule-drag-handle" title="Drag to reorder" aria-label="Drag to reorder" draggable="true">≡</div>
          ` : ``}
          <div class="rule-title">${rule.name}</div>
        </div>

        <div class="rule-header-right">
          ${isCustom ? `
            <button class="rule-edit-btn" type="button" data-rule-id="${rule.id}" aria-label="Edit rule">
              <!-- edit svg -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M22.994,5.195c-.011-.067-.277-1.662-1.378-2.774-1.111-1.09-2.712-1.355-2.779-1.366-.119-.021-.239,.005-.342,.068-.122,.075-3.047,1.913-9.049,7.886C3.12,15.305,1.482,17.791,1.415,17.894c-.045,.07-.073,.15-.079,.233l-.334,4.285c-.011,.146,.042,.289,.145,.393,.094,.094,.221,.146,.354,.146,.013,0,.026,0,.039-.001l4.306-.333c.083-.006,.162-.033,.232-.078,.103-.066,2.6-1.697,8.924-7.991,6.002-5.974,7.848-8.886,7.923-9.007,.064-.103,.089-.225,.07-.344ZM14.295,13.838c-5.54,5.514-8.14,7.427-8.661,7.792l-3.59,.278,.278-3.569c.368-.521,2.292-3.109,7.828-8.619,1.773-1.764,3.278-3.166,4.518-4.264,.484,.112,1.721,.468,2.595,1.326,.868,.851,1.23,2.046,1.346,2.526-1.108,1.24-2.525,2.75-4.314,4.531Zm5.095-5.419c-.236-.681-.669-1.608-1.427-2.352-.757-.742-1.703-1.166-2.396-1.397,1.807-1.549,2.902-2.326,3.292-2.59,.396,.092,1.362,.375,2.05,1.049,.675,.682,.963,1.645,1.058,2.042-.265,.388-1.039,1.469-2.577,3.247Z"/>
              </svg>
            </button>

            <button class="rule-delete-btn crit" type="button" data-rule-id="${rule.id}" aria-label="Delete rule">
              <!-- delete svg -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="m15.854,10.854l-3.146,3.146,3.146,3.146c.195.195.195.512,0,.707-.098.098-.226.146-.354.146s-.256-.049-.354-.146l-3.146-3.146-3.146,3.146c-.098.098-.226.146-.354.146s-.256-.049-.354-.146c-.195-.195-.195-.512,0-.707l3.146-3.146-3.146-3.146c-.195-.195-.195-.512,0-.707s.512-.195.707,0l3.146,3.146,3.146-3.146c.195-.195.512-.195.707,0s.195.512,0,.707Zm7.146-6.354c0,.276-.224.5-.5.5h-1.5c0,.015,0,.03-.002.046l-1.37,14.867c-.215,2.33-2.142,4.087-4.481,4.087h-6.272c-2.337,0-4.263-1.754-4.48-4.08l-1.392-14.873c-.001-.016-.002-.031-.002-.047h-1.5c-.276,0-.5-.224-.5-.5s.224-.5.5-.5h5.028c.25-2.247,2.16-4,4.472-4h2c2.312,0,4.223,1.753,4.472,4h5.028c.276,0,.5.224,.5.5Zm-15.464-.5h8.928c-.243-1.694-1.704-3-3.464-3h-2c-1.76,0-3.221,1.306-3.464,3Zm12.462,1H4.002l1.387,14.826c.168,1.81,1.667,3.174,3.484,3.174h6.272c1.82,0,3.318-1.366,3.485-3.179l1.366-14.821Z"/>
              </svg>
            </button>
          ` : `
            <button class="rule-view-btn" type="button" data-rule-id="${rule.id}" aria-label="View rule">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M23.312,9.733c-1.684-2.515-5.394-6.733-11.312-6.733S2.373,7.219,.688,9.733c-.922,1.377-.922,3.156,0,4.533,1.684,2.515,5.394,6.733,11.312,6.733s9.627-4.219,11.312-6.733c.922-1.377,.922-3.156,0-4.533Zm-.831,3.977c-1.573,2.349-5.027,6.29-10.48,6.29S3.093,16.059,1.52,13.71c-.696-1.039-.696-2.381,0-3.42,1.573-2.349,5.027-6.29,10.48-6.29s8.907,3.941,10.48,6.29c.696,1.039,.696,2.381,0,3.42ZM12,7c-2.757,0-5,2.243-5,5s2.243,5,5,5,5-2.243,5-5-2.243-5-5-5Zm0,9c-2.206,0-4-1.794-4-4s1.794-4,4-4,4,1.794,4,4-1.794,4-4,4Z"/>
              </svg>
            </button>
          `}
        </div>
      </div>
    `;

    rulesList.appendChild(card);
  }

  attachRuleDeleteHandlers();
  attachRuleEditHandlers();
  attachRuleViewHandlers();
  attachRuleDragHandlers();
}

function reorderCustomRules(draggedId, targetId) {
  const fromIndex = customRules.findIndex(rule => rule.id === draggedId);
  const toIndex = customRules.findIndex(rule => rule.id === targetId);

  if (fromIndex === -1 || toIndex === -1) return;

  const [movedRule] = customRules.splice(fromIndex, 1);
  customRules.splice(toIndex, 0, movedRule);

  saveCustomRules();
  window.ruleDefinitions = getAllRules();
  renderRules();
}

function clearDropMarkers() {
  rulesList.querySelectorAll(".drag-over").forEach((card) => {
    card.classList.remove("drag-over");
  });
}

function attachRuleDragHandlers() {
  const handles = rulesList.querySelectorAll(".rule-drag-handle");
  const cards = rulesList.querySelectorAll(".rule-card");

  handles.forEach((handle) => {
    const card = handle.closest(".rule-card");

    handle.addEventListener("dragstart", (e) => {
      draggedRuleId = card.dataset.ruleId;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", draggedRuleId);
    });

    handle.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      draggedRuleId = null;
      clearDropMarkers();
    });
  });

  cards.forEach((card) => {
    if (!card.classList.contains("draggable-rule")) return;

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");

      const targetRuleId = card.dataset.ruleId;

      if (!draggedRuleId || draggedRuleId === targetRuleId) return;

      reorderCustomRules(draggedRuleId, targetRuleId);
    });
  });
}

function attachRuleToggleHandlers() {
  const toggleButtons = rulesList.querySelectorAll(".rule-toggle-btn");

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".rule-card");
      const isCollapsed = card.classList.contains("collapsed");

      if (isCollapsed) {
        card.classList.remove("collapsed");
        card.classList.add("expanded");
        btn.setAttribute("aria-expanded", "true");
      } else {
        card.classList.remove("expanded");
        card.classList.add("collapsed");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function evaluateCondition(f, condition) {
  let actualValue;

  if (condition.feature === "leftRightDifference") {
    actualValue = Math.abs(f.leftRatio - f.rightRatio);
  } else {
    actualValue = f[condition.feature];
  }

  switch (condition.op) {
    case ">":
      return actualValue > condition.value;
    case "<":
      return actualValue < condition.value;
    case ">=":
      return actualValue >= condition.value;
    case "<=":
      return actualValue <= condition.value;
    case "==":
      return actualValue === condition.value;
    default:
      return false;
  }
}

function ruleMatches(f, rule) {
  return rule.conditions.every(condition => evaluateCondition(f, condition));
}