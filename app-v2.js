document.addEventListener("DOMContentLoaded", () => {

/* ============================================================
   APP STATE
   ============================================================ */

const appState = {
  characters: {},
  inventory: {},
  jobs: {}
};


/* ============================================================
   LOAD & SAVE STATE
   ============================================================ */

function loadState() {
  const raw = localStorage.getItem("dreamlightAppState");
  if (!raw) return;

  try {
    Object.assign(appState, JSON.parse(raw));
  } catch (e) {
    console.error("Failed to parse saved state:", e);
  }
}

function saveState() {
  localStorage.setItem("dreamlightAppState", JSON.stringify(appState));
}


/* ============================================================
   EXPORT / IMPORT
   ============================================================ */

document.getElementById("exportState").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(appState, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "dreamlight-app-state.json";
  a.click();

  URL.revokeObjectURL(url);
});

document.getElementById("importState").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      Object.assign(appState, JSON.parse(reader.result));
      saveState();
      renderAllPanels();
      alert("App state imported successfully.");
    } catch {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
});


/* ============================================================
   SHARE APP
   ============================================================ */

document.getElementById("shareApp").addEventListener("click", async () => {
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title: "DDV Gift/Item Tracker", url });
      return;
    } catch {}
  }

  navigator.clipboard.writeText(url);
  alert("Link copied to clipboard.");
});


/* ============================================================
   RESET APP
   ============================================================ */

document.getElementById("resetApp").addEventListener("click", () => {
  if (!confirm("Reset ALL app data? This cannot be undone.")) return;

  localStorage.removeItem("dreamlightAppState");
  location.reload();
});


/* ============================================================
   PANEL SWITCHING + SOUNDS
   ============================================================ */

const panels = document.querySelectorAll(".panel");
const navButtons = document.querySelectorAll(".nav button");

// Sound elements (now guaranteed to exist)
const soundBell = document.getElementById("soundBell");
const soundClick = document.getElementById("soundClick");
const soundDing = document.getElementById("soundDing");
const soundFavourite = document.getElementById("soundFavourite");
const soundPop = document.getElementById("soundPop");

function playSound(audioEl) {
  if (!audioEl) return;
  try {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  } catch {}
}

// Default panel: Characters
document.getElementById("panel-characters").classList.remove("hidden");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.panel;

    panels.forEach(p => p.classList.add("hidden"));
    document.getElementById(`panel-${target}`).classList.remove("hidden");

    playSound(soundClick);
  });
});


/* ============================================================
   LOAD JSON DATA
   ============================================================ */

let charactersData = [];
let mealsData = [];
let ingredientsData = [];
let fishingData = [];
let gemsData = [];
let foragingData = [];
let craftingData = [];

async function loadData() {
  const files = [
    ["characters", "data/characters.json"],
    ["meals", "data/items/meals.json"],
    ["ingredients", "data/items/ingredients.json"],
    ["fishing", "data/items/fishing.json"],
    ["gems", "data/items/gems.json"],
    ["foraging", "data/items/foraging.json"],
    ["crafting", "data/items/crafting.json"]
  ];

  const promises = files.map(([key, path]) =>
    fetch(path).then(r => r.json()).catch(() => {
      console.error(`Failed to load ${path}`);
      return [];
    })
  );

  const [
    chars,
    meals,
    ingredients,
    fishing,
    gems,
    foraging,
    crafting
  ] = await Promise.all(promises);

  charactersData = chars;
  mealsData = meals;
  ingredientsData = ingredients;
  fishingData = fishing;
  gemsData = gems;
  foragingData = foraging;
  craftingData = crafting;

  initializeStateDefaults();
  renderAllPanels();
  startGuestTimer();
}


/* ============================================================
   INITIALIZE DEFAULT STATE
   ============================================================ */

function initializeStateDefaults() {
  if (!appState.jobs) appState.jobs = {};

  charactersData.forEach(char => {
    if (!appState.characters[char.id]) {
      appState.characters[char.id] = { level: 0, favorite: false };
    }
    if (!appState.jobs[char.id]) {
      appState.jobs[char.id] = "None";
    }
  });

  const allItems = [
    ...ingredientsData,
    ...fishingData,
    ...gemsData,
    ...foragingData,
    ...craftingData
  ];

  allItems.forEach(item => {
    if (!appState.inventory[item.id]) {
      appState.inventory[item.id] = { owned: false, storedAt: "" };
    }
  });

  saveState();
}


/* ============================================================
   POPULATE CATEGORY DROPDOWN
   ============================================================ */

function populateCategoryDropdown() {
  const select = document.getElementById("categorySelect");

  const counts = {
    crafting: craftingData.length,
    fishing: fishingData.length,
    foraging: foragingData.length,
    gems: gemsData.length,
    ingredients: ingredientsData.filter(i => !i.id.startsWith("any_")).length,
    meals: mealsData.length
  };

  select.innerHTML = `
    <option value="">-- Select Category --</option>
    <option value="crafting">Crafting (${counts.crafting})</option>
    <option value="fishing">Fishing (${counts.fishing})</option>
    <option value="foraging">Foraging (${counts.foraging})</option>
    <option value="gems">Gems (${counts.gems})</option>
    <option value="ingredients">Ingredients (${counts.ingredients})</option>
    <option value="meals">Meals (${counts.meals})</option>
  `;
}


/* ============================================================
   RENDER PANELS
   ============================================================ */

function renderAllPanels() {
  populateCategoryDropdown();
  renderCharactersPanel();
  renderItemsPanel();
  renderMealsPanel();
  renderInventoryPanel();
}


/* ============================================================
   CHARACTERS PANEL
   ============================================================ */

function renderCharactersPanel() {
  const container = document.getElementById("charactersList");
  container.innerHTML = "";

  const order = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 10];

  const sorted = [...charactersData].sort((a, b) => {
    const A = appState.characters[a.id];
    const B = appState.characters[b.id];

    if (A.favorite && !B.favorite) return -1;
    if (B.favorite && !A.favorite) return 1;

    return order.indexOf(A.level) - order.indexOf(B.level);
  });

  const jobOptions = [
    "None",
    "Foraging",
    "Snippet Catching",
    "Mining",
    "Gardening",
    "Time Bending",
    "Digging",
    "Fishing"
  ];

  sorted.forEach(char => {
    const state = appState.characters[char.id];
    const job = appState.jobs[char.id] || "None";

    const card = document.createElement("div");
    card.className = "card";

    const jobSelectHtml = `
      <label>
        Assigned Job:
        <select class="job-select" data-id="${char.id}">
          ${jobOptions.map(j => `
            <option value="${j}">${j}</option>
          `).join("")}
        </select>
      </label>
    `;

    card.innerHTML = `
      <h3>${char.name}</h3>
      <p>Level: ${state.level}</p>
      <button class="lvl-btn" data-id="${char.id}">+1</button>
      <button class="fav-btn ${state.favorite ? "active" : ""}" data-id="${char.id}">
        ★ Favourite
      </button>
      ${jobSelectHtml}
    `;

    container.appendChild(card);

    const selectEl = card.querySelector(".job-select");
    selectEl.value = job;
  });

  document.querySelectorAll(".lvl-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (appState.characters[id].level < 10) {
        appState.characters[id].level++;
        const newLevel = appState.characters[id].level;
        saveState();
        renderCharactersPanel();

        if (newLevel === 10) {
          playSound(soundDing);
        }
      }
    });
  });

  document.querySelectorAll(".fav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;

      const favCount = Object.values(appState.characters)
        .filter(c => c.favorite).length;

      if (!appState.characters[id].favorite && favCount >= 3) {
        alert("You can only favourite 3 characters.");
        return;
      }

      const wasFavourite = appState.characters[id].favorite;
      appState.characters[id].favorite = !appState.characters[id].favorite;
      saveState();
      renderCharactersPanel();

      if (!wasFavourite && appState.characters[id].favorite) {
        playSound(soundFavourite);
      } else if (wasFavourite && !appState.characters[id].favorite) {
        playSound(soundPop);
      }
    });
  });

  document.querySelectorAll(".job-select").forEach(select => {
    select.addEventListener("change", () => {
      const id = select.dataset.id;
      appState.jobs[id] = select.value;
      saveState();
    });
  });
}


/* ============================================================
   ITEMS PANEL (global search + recipes)
   ============================================================ */

function renderItemsPanel() {
  const container = document.getElementById("itemsList");
  container.innerHTML = "";

  const selected = document.getElementById("categorySelect").value;
  const search = document.getElementById("itemSearch").value.toLowerCase();

  let list = [];

  // Global search overrides category
  if (search && search.length > 0) {
    list = [
      ...craftingData,
      ...fishingData,
      ...foragingData,
      ...gemsData,
      ...ingredientsData.filter(i => !i.id.startsWith("any_")),
      ...mealsData
    ].filter(item => item.name.toLowerCase().includes(search));
  } else {
    switch (selected) {
      case "crafting": list = craftingData; break;
      case "fishing": list = fishingData; break;
      case "foraging": list = foragingData; break;
      case "gems": list = gemsData; break;
      case "ingredients": list = ingredientsData.filter(i => !i.id.startsWith("any_")); break;
      case "meals": list = mealsData; break;
      default: list = [];
    }
  }

  // If category is meals OR item has ingredients → treat as recipe
  const isMealsView = selected === "meals" || (!search && selected === "meals");

  // Sort alphabetically by name
  list = list.sort((a, b) => a.name.localeCompare(b.name));

  if (list.length === 0) {
    container.innerHTML = `<p>No results found.</p>`;
    return;
  }

  list.forEach(entry => {
    const isMeal = entry.categoryId === "meals";
    const hasIngredients = Array.isArray(entry.ingredients) && entry.ingredients.length > 0;

    // Recipe-style card (meals + crafting recipes)
    if (isMeal || hasIngredients) {
      const ingredientsHtml = entry.ingredients.map(ing => {
        const inv = appState.inventory[ing.id];
        const owned = inv?.owned ? "✔" : "✖";
        const item = findItemById(ing.id);
        const displayName = item?.name || ing.id;

        return `
          <span class="meal-ingredient" data-id="${ing.id}">
            ${owned} ${displayName} (x${ing.amount})
          </span>
        `;
      }).join("<br>");

      const card = document.createElement("div");
      card.className = "card";

      const typeText = entry.type ? `Type: ${entry.type}` : "";
      const starsText = entry.stars ? `Stars: ${entry.stars}` : "";

      card.innerHTML = `
        <h3>${entry.name}</h3>
        ${typeText ? `<p>${typeText}</p>` : ""}
        ${starsText ? `<p>${starsText}</p>` : ""}
        <hr>
        <p>${ingredientsHtml}</p>
      `;

      container.appendChild(card);
      return;
    }

    // Normal item card
    const inv = appState.inventory[entry.id];
    const sourceText = entry.source || entry.location || "No source info";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${entry.name}</h3>
      <p>${sourceText}</p>

      <label>
        <input type="checkbox" data-id="${entry.id}" class="owned-toggle"
          ${inv?.owned ? "checked" : ""}>
        Owned
      </label>

      <input type="text" class="stored-input" data-id="${entry.id}"
        placeholder="Stored at..." value="${inv?.storedAt || ""}">
    `;

    container.appendChild(card);
  });

  // Attach ingredient click handlers
  document.querySelectorAll(".meal-ingredient").forEach(span => {
    span.addEventListener("click", () => {
      const id = span.dataset.id;
      openIngredientModal(id);
    });
  });

  // Attach inventory handlers for normal items
  document.querySelectorAll(".owned-toggle").forEach(box => {
    box.addEventListener("change", () => {
      const id = box.dataset.id;
      if (!appState.inventory[id]) {
        appState.inventory[id] = { owned: false, storedAt: "" };
      }
      appState.inventory[id].owned = box.checked;
      saveState();
    });
  });

  document.querySelectorAll(".stored-input").forEach(input => {
    input.addEventListener("input", () => {
      const id = input.dataset.id;
      if (!appState.inventory[id]) {
        appState.inventory[id] = { owned: false, storedAt: "" };
      }
      appState.inventory[id].storedAt = input.value;
      saveState();
    });
  });
}

document.getElementById("categorySelect").addEventListener("change", renderItemsPanel);
document.getElementById("itemSearch").addEventListener("input", renderItemsPanel);


/* ============================================================
   MEALS PANEL (legacy)
   ============================================================ */

function renderMealsPanel() {
  const container = document.getElementById("mealsList");
  container.innerHTML = "";

  mealsData.forEach(meal => {
    const ingredients = meal.ingredients.map(ing => {
      const inv = appState.inventory[ing.id];
      const owned = inv?.owned ? "✔" : "✖";
      return `${owned} ${ing.id} (x${ing.amount})`;
    }).join("<br>");

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${meal.name}</h3>
      <p>Type: ${meal.type}</p>
      <p>Stars: ${meal.stars}</p>
      <hr>
      <p>${ingredients}</p>
    `;

    container.appendChild(card);
  });
}


/* ============================================================
   INVENTORY PANEL
   ============================================================ */

function renderInventoryPanel() {
  const container = document.getElementById("inventoryList");
  container.innerHTML = "";

  const ownedItems = Object.entries(appState.inventory)
    .filter(([id, data]) => data.owned)
    .map(([id, data]) => {
      const item = findItemById(id);
      return { item, data };
    });

  ownedItems.forEach(({ item, data }) => {
    if (!item) return;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>Stored at: ${data.storedAt || "Unknown"}</p>
    `;

    container.appendChild(card);
  });
}


/* ============================================================
   HELPER
   ============================================================ */

function findItemById(id) {
  return (
    ingredientsData.find(i => i.id === id) ||
    fishingData.find(i => i.id === id) ||
    gemsData.find(i => i.id === id) ||
    foragingData.find(i => i.id === id) ||
    craftingData.find(i => i.id === id)
  );
}


/* ============================================================
   INGREDIENT MODAL (editable)
   ============================================================ */

const modal = document.getElementById("ingredientModal");
const modalName = document.getElementById("modalName");
const modalSource = document.getElementById("modalSource");
const modalCategory = document.getElementById("modalCategory");
const modalOwned = document.getElementById("modalOwned");
const modalStoredAt = document.getElementById("modalStoredAt");
const modalClose = document.getElementById("modalClose");
const modalSave = document.getElementById("modalSave");

let modalCurrentId = null;

function openIngredientModal(id) {
  const item = findItemById(id);
  const inv = appState.
