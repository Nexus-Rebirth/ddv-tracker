/* ============================================================
   APP STATE
   ============================================================ */

const appState = {
  characters: {},
  inventory: {},
  completed: {},
  prepQueue: {},
  favouriteRecipes: {},
  timers: [],
  gatheringQueue: {},

  ui: {
    timersExpanded: false,
    prepExpanded: false,
    favouritesExpanded: false,
  },
};

const addSound = new Audio("data/sounds/add.mp3");
const bellSound = new Audio("data/sounds/bell.mp3");
const clickSound = new Audio("data/sounds/click.mp3");
const dingSound = new Audio("data/sounds/ding.mp3");
const favouriteSound = new Audio("data/sounds/favourite.mp3");
const plopSound = new Audio("data/sounds/plop.mp3");
const popSound = new Audio("data/sounds/pop.mp3");
const prepSound = new Audio("data/sounds/prep.mp3");
const reduceSound = new Audio("data/sounds/reduce.mp3");
const setSound = new Audio("data/sounds/set.mp3");
const timerSound = new Audio("data/sounds/timer.mp3");
const trashSound = new Audio("data/sounds/trash.mp3");
const addCardSound = new Audio("data/sounds/addCard.mp3");
const addItemSound = new Audio("data/sounds/addItem.mp3");
const drawerOpenSound = new Audio("data/sounds/drawerOpen.mp3");
const drawerCloseSound = new Audio("data/sounds/drawerClose.mp3");

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
    type: "application/json",
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
   PANEL SWITCHING
   ============================================================ */

const panels = document.querySelectorAll(".panel");
const navButtons = document.querySelectorAll(".nav button");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((button) => button.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.panel;
    panels.forEach((p) => p.classList.add("hidden"));
    document.getElementById(`panel-${target}`).classList.remove("hidden");
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
let miningData = [];

async function loadData() {
  const files = [
    ["characters", "data/characters.json"],
    ["meals", "data/items/meals.json"],
    ["ingredients", "data/items/ingredients.json"],
    ["fishing", "data/items/fishing.json"],
    ["gems", "data/items/gems.json"],
    ["foraging", "data/items/foraging.json"],
    ["mining", "data/items/mining.json"],
    ["crafting", "data/items/crafting.json"],
  ];

  const promises = files.map(([key, path]) =>
    fetch(path)
      .then((r) => r.json())
      .catch(() => {
        console.error(`Failed to load ${path}`);
        return [];
      }),
  );

  const [chars, meals, ingredients, fishing, gems, foraging, mining, crafting] =
    await Promise.all(promises);

  charactersData = chars;
  mealsData = meals;
  ingredientsData = ingredients;
  fishingData = fishing;
  gemsData = gems;
  foragingData = foraging;
  miningData = mining;
  craftingData = crafting;

  initializeStateDefaults();
  renderAllPanels();
  startGuestTimer();
}

/* ============================================================
   INITIALIZE DEFAULT STATE
   ============================================================ */

function initializeStateDefaults() {
  charactersData.forEach((char) => {
    if (!appState.characters[char.id]) {
      appState.characters[char.id] = { level: 0, favorite: false };
    }
  });

  const allItems = [
    ...craftingData,
    ...fishingData,
    ...foragingData,
    ...gemsData,
    ...ingredientsData,
    ...miningData,
    ...mealsData,
  ];

  allItems.forEach((item) => {
    if (!appState.inventory[item.id]) {
      appState.inventory[item.id] = { owned: false, storedAt: "" };
    }

    if (appState.completed[item.id] === undefined) {
      appState.completed[item.id] = false;
    }
  });

  saveState();
}

/* ============================================================
   POPULATE CATEGORY DROPDOWN
   ============================================================ */

function populateCategoryDropdown() {
  const select = document.getElementById("categorySelect");
  const craftingStats = getCompletionStats(craftingData);
  const fishingStats = getCompletionStats(fishingData);
  const foragingStats = getCompletionStats(foragingData);
  const gemsStats = getCompletionStats(gemsData);
  const miningStats = getCompletionStats(miningData);
  const ingredientsStats = getCompletionStats(
    ingredientsData.filter((i) => !i.id.startsWith("any_")),
  );

  const mealsStats = getCompletionStats(mealsData);

  select.innerHTML = `
    <option value="">-- Select Category --</option>
    <option value="crafting">Crafting (${craftingStats.percent}%)</option>
    <option value="fishing">Fishing (${fishingStats.percent}%)</option>
    <option value="foraging">Foraging (${foragingStats.percent}%)</option>
    <option value="gems">Gems (${gemsStats.percent}%)</option>
    <option value="mining">Mining (${miningStats.percent}%)</option>
    <option value="ingredients">Ingredients (${ingredientsStats.percent}%)</option>
    <option value="meals">Meals (${mealsStats.percent}%)</option>
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
  renderPrepDrawer();
  renderTimersPanel();
  renderGatheringDrawer();
}

/* ============================================================
   CHARACTERS PANEL
   ============================================================ */

function renderCharactersPanel() {
  const container = document.getElementById("charactersList");
  container.innerHTML = "";
  const order = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const sorted = [...charactersData].sort((a, b) => {
    const A = appState.characters[a.id];
    const B = appState.characters[b.id];
    if (A.favorite && !B.favorite) return -1;
    if (B.favorite && !A.favorite) return 1;
    return order.indexOf(A.level) - order.indexOf(B.level);
  });
  sorted.forEach((char) => {
    const state = appState.characters[char.id];
    const favouriteCount = Object.values(appState.characters).filter(
      (c) => c.favorite,
    ).length;
    const showFavouriteButton = state.favorite || favouriteCount < 3;
    const card = document.createElement("div");
    card.className = "card";
    if (state.favorite) {
      card.classList.add("favourite-card");
    }
    card.innerHTML = `
      <h3>${char.name}</h3>
      <p>Level: ${state.level}</p>
      <button
        class="lvl-btn"
        data-id="${char.id}"
        title="Level Up"
      >
        +1
      </button>
      ${
        showFavouriteButton
          ? `
      <button
        class="fav-btn ${state.favorite ? "active" : ""}"
        data-id="${char.id}"
      >
        <img class="icon-btn" src="${
          state.favorite
            ? "data/assets/heart-minus.svg"
            : "data/assets/heart-plus.svg"
        }"
        alt="Favourite"
        title="${
          state.favorite ? "Remove from favourites" : "Add to favourites"
        }" 
        >
      </button>
    `
          : ""
      }
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".lvl-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (appState.characters[id].level < 10) {
        appState.characters[id].level++;
        if (appState.characters[id].level === 10) {
          dingSound.currentTime = 0;
          dingSound.play().catch(() => {});
        } else {
          clickSound.currentTime = 0;
          clickSound.play().catch(() => {});
        }
        saveState();
        renderCharactersPanel();
      }
    });
  });

  document.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const favCount = Object.values(appState.characters).filter(
        (c) => c.favorite,
      ).length;
      if (!appState.characters[id].favorite && favCount >= 3) {
        alert("You can only favourite 3 characters.");
        return;
      }
      const wasFavourite = appState.characters[id].favorite;
      appState.characters[id].favorite = !appState.characters[id].favorite;
      if (!wasFavourite) {
        favouriteSound.currentTime = 0;
        favouriteSound.play().catch(() => {});
      } else {
        popSound.currentTime = 0;
        popSound.play().catch(() => {});
      }
      saveState();
      renderCharactersPanel();
    });
  });
}

function toggleCompleted(id) {
  appState.completed[id] = !appState.completed[id];
  saveState();
  const selectedCategory = document.getElementById("categorySelect").value;
  populateCategoryDropdown();
  document.getElementById("categorySelect").value = selectedCategory;
  renderItemsPanel();
}

function toggleRecipeFavourite(id) {
  if (appState.favouriteRecipes[id]) {
    popSound.currentTime = 0;
    popSound.play().catch(() => {});
    delete appState.favouriteRecipes[id];
  } else {
    favouriteSound.currentTime = 0;
    favouriteSound.play().catch(() => {});
    appState.favouriteRecipes[id] = true;
  }
  saveState();
}

function getCompletionStats(items) {
  const total = items.length;
  const completed = items.filter((item) => appState.completed[item.id]).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return {
    total,
    completed,
    percent,
  };
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
      ...miningData,
      ...ingredientsData.filter((i) => !i.id.startsWith("any_")),
      ...mealsData,
    ].filter((item) => item.name.toLowerCase().includes(search));
  } else {
    switch (selected) {
      case "crafting":
        list = craftingData;
        break;
      case "fishing":
        list = fishingData;
        break;
      case "foraging":
        list = foragingData;
        break;
      case "gems":
        list = gemsData;
        break;
      case "ingredients":
        list = ingredientsData.filter((i) => !i.id.startsWith("any_"));
        break;
      case "meals":
        list = mealsData;
        break;
      case "mining":
        list = miningData;
        break;
      default:
        list = [];
    }
  }

  // Sort alphabetically by name
  list = list.sort((a, b) => a.name.localeCompare(b.name));

  const currentLocationFilter = document.getElementById("locationFilter").value;

  populateLocationFilter(list);

  document.getElementById("locationFilter").value = [
    ...document.getElementById("locationFilter").options,
  ].some((o) => o.value === currentLocationFilter)
    ? currentLocationFilter
    : "all";

  const statusFilter = document.getElementById("statusFilter").value;

  const locationFilter = document.getElementById("locationFilter").value;

  if (statusFilter !== "all") {
    list = list.filter((item) => {
      const inv = appState.inventory[item.id];

      const collected = appState.completed[item.id];

      const craftable = item.ingredients
        ? item.ingredients.every((ingredient) => {
            const itemData =
              ingredientsData.find((x) => x.name === ingredient) ||
              findItemById(ingredient);

            return itemData && appState.inventory[itemData.id]?.owned;
          })
        : item.materials
          ? item.materials.every((material) => {
              const itemData = findItemByName(material.item);
              return itemData && appState.inventory[itemData.id]?.owned;
            })
          : false;

      switch (statusFilter) {
        case "owned":
          return inv?.owned;

        case "not-owned":
          return !inv?.owned;

        case "collected":
          return collected;

        case "not-collected":
          return !collected;

        case "craftable":
          return craftable;

        case "not-craftable":
          return !craftable;

        default:
          return true;
      }
    });
  }

  if (locationFilter !== "all") {
    list = list.filter((item) => {
      const value = item.location || item.source;

      return value === locationFilter;
    });
  }

  if (list.length === 0) {
    container.innerHTML = `<p>No results found.</p>`;
    return;
  }

  list.forEach((entry) => {
    const isMeal = Array.isArray(entry.ingredients);
    const isCrafting = Array.isArray(entry.materials);

    if (isMeal) {
      const ingredientsHtml = entry.ingredients
        .map((ingredient) => {
          const item =
            ingredientsData.find((x) => x.name === ingredient) ||
            findItemById(ingredient);
          const owned = item && appState.inventory[item.id]?.owned;
          const icon = owned
            ? "data/assets/check.svg"
            : "data/assets/circle.svg";
          const isGathered = appState.gatheringQueue[ingredient];

          const gatheringClass = isGathered ? "icon-gold" : "";
          const iconClass = owned ? "icon-gold" : "";
          return `
        <img class="icon-btn gathering-add-item ${gatheringClass}"
          <div class="recipe-material-content">
            <img class="icon-btn ${iconClass}"
              src="${icon}"
              alt="Owned Status"
            >
            <span class="recipe-item-link"
              data-name="${ingredient}"
              title="View item details">
              ${ingredient}
            </span>
          </div>
          <img class="icon-btn gathering-add-item"
            data-item="${ingredient}"
            data-qty="1"
            src="data/assets/addItem.svg"
            alt="Add To Gathering"
            title="Add item to list"
          >
        </div>
      `;
        })
        .join("<br>");

      const isFavourite = appState.favouriteRecipes?.[entry.id];
      if (!appState.inventory[entry.id]) {
        appState.inventory[entry.id] = {
          owned: false,
          storedAt: "",
        };
      }

      const ownedClass = appState.inventory[entry.id]?.owned ? "icon-gold" : "";

      const ownedIcon = "data/assets/check.svg";
      const completedClass = appState.completed[entry.id] ? "icon-gold" : "";

      const completionIcon = appState.completed[entry.id]
        ? "data/assets/circle-check.svg"
        : "data/assets/circle.svg";

      const completionTooltip = appState.completed[entry.id]
        ? "Remove from collection"
        : "Mark as collected";

      const craftable = entry.ingredients.every((ingredient) => {
        const item =
          ingredientsData.find((x) => x.name === ingredient) ||
          findItemById(ingredient);

        return item && appState.inventory[item.id]?.owned;
      });

      const card = document.createElement("div");
      card.className = "card";

      if (craftable) {
        card.classList.add("craftable");
      }

      if (isFavourite) {
        card.classList.add("favourite-card");
      }

      card.innerHTML = ` 
  <div class="card-header">
    <h3>${entry.name}</h3>
    <div class="card-actions">
      <img class="icon-btn gathering-add-card"
        data-id="${entry.id}"
        src="data/assets/addCard.svg"
        alt="Add Recipe To Gathering"
        title="Add all to list"
      >
      <img class="icon-btn recipe-fav-btn ${isFavourite ? "icon-gold" : ""}"
        data-id="${entry.id}"
        src="${
          isFavourite
            ? "data/assets/heart-minus.svg"
            : "data/assets/heart-plus.svg"
        }"
      alt="Favourite Recipe"
      title="${isFavourite ? "Remove from favourites" : "Add to favourites"}"
      >
      <img
        class="icon-btn owned-toggle ${ownedClass}"
        data-id="${entry.id}"
        src="${ownedIcon}"
        alt="Owned Status"
      >
      <img class="icon-btn completion-toggle ${completedClass}"
        data-id="${entry.id}"
        src="${completionIcon}"
        alt="Collection Status"
        title="${completionTooltip}"
      >
    </div>
  </div>
  <p>
    <strong>Ingredients:</strong>
  </p>
  <div class="recipe-material-list">
    ${ingredientsHtml}
  </div>
  <button class="prep-add-btn" data-id="${entry.id}">
    Add To Prep
  </button>
    `;
      container.appendChild(card);
      return;
    }

    if (isCrafting) {
      const craftable = entry.materials.every((material) => {
        const item = findItemByName(material.item);
        return item && appState.inventory[item.id]?.owned;
      });
      const materialsHtml = entry.materials
        .map((material) => {
          const item = findItemByName(material.item);
          const owned = item && appState.inventory[item.id]?.owned;
          const icon = owned
            ? "data/assets/check.svg"
            : "data/assets/circle.svg";

          const isGathered = appState.gatheringQueue[material.item];

          const gatheringClass = isGathered ? "icon-gold" : "";
          const iconClass = owned ? "icon-gold" : "";

          return `
          <div class="recipe-material-row">
            <div class="recipe-material-content">
              <img class="icon-btn ${iconClass}"
                src="${icon}"
                alt="Owned Status"
              >

              <span class="recipe-item-link"
                data-name="${material.item}"
                title="View item details">
                ${material.item}
              </span>
              x${material.quantity}
            </div>
            <img class="icon-btn gathering-add-item ${gatheringClass}"
              data-item="${material.item}"
              data-qty="${material.quantity}"
              src="data/assets/addItem.svg"
              alt="Add To Gathering"
              title="Add item to list"
            >
          </div>
        `;
        })
        .join("<br>");
      const locationHtml = entry.locations?.length
        ? `
        <p>
          <strong>Location:</strong><br>
          ${entry.locations.join(", ")}
        </p>
      `
        : "";

      const isFavourite = appState.favouriteRecipes?.[entry.id];

      if (!appState.inventory[entry.id]) {
        appState.inventory[entry.id] = {
          owned: false,
          storedAt: "",
        };
      }

      const ownedClass = appState.inventory[entry.id]?.owned ? "icon-gold" : "";

      const ownedIcon = "data/assets/check.svg";

      const completedClass = appState.completed[entry.id] ? "icon-gold" : "";

      const completionIcon = appState.completed[entry.id]
        ? "data/assets/circle-check.svg"
        : "data/assets/circle.svg";

      const completionTooltip = appState.completed[entry.id]
        ? "Remove from collection"
        : "Mark as collected";

      const card = document.createElement("div");
      card.className = "card";

      if (craftable) {
        card.classList.add("craftable");
      }

      if (isFavourite) {
        card.classList.add("favourite-card");
      }

      card.innerHTML = `
  <div class="card-header">
    <h3>${entry.name}</h3>
    <div class="card-actions">
      <img class="icon-btn gathering-add-card"
        data-id="${entry.id}"
        src="data/assets/addCard.svg"
        alt="Add Recipe To Gathering"
        title="Add all to list"
      >
      <img class="icon-btn recipe-fav-btn
        ${isFavourite ? "icon-gold" : ""}"
        data-id="${entry.id}"
        src="${
          isFavourite
            ? "data/assets/heart-minus.svg"
            : "data/assets/heart-plus.svg"
        }"
        alt="Favourite Recipe"
        title="${isFavourite ? "Remove from favourites" : "Add to favourites"}"
      >
      <img class="icon-btn owned-toggle ${ownedClass}"
        data-id="${entry.id}"
        src="${ownedIcon}"
        alt="Owned Status"
        title="Add to inventory"
      >
      <img class="icon-btn completion-toggle ${completedClass}"
        data-id="${entry.id}"
        src="${completionIcon}"
        alt="Collection Status"
        title="${completionTooltip}"
      >
    </div>
  </div>
        ${locationHtml}
        <p>
            <strong>Materials:</strong>
        </p>
        <div class="recipe-material-list">
          ${materialsHtml}
        </div>
        <button
            class="prep-add-btn"
            data-id="${entry.id}"
        >
            Add To Prep
        </button>
    `;

      container.appendChild(card);
      return;
    }

    // Normal item card
    const inv = appState.inventory[entry.id];
    const locationText = entry.locations?.join(", ");
    const sourceText =
      entry.sources?.join(", ") ||
      entry.source ||
      (entry.categoryId
        ? entry.categoryId.charAt(0).toUpperCase() + entry.categoryId.slice(1)
        : "Unknown");

    const card = document.createElement("div");
    card.className = "card";

    const completedClass = appState.completed[entry.id] ? "icon-gold" : "";

    const completionIcon = appState.completed[entry.id]
      ? "data/assets/circle-check.svg"
      : "data/assets/circle.svg";

    const completionTooltip = appState.completed[entry.id]
      ? "Remove from collection"
      : "Mark as collected";

    const ownedClass = inv?.owned ? "icon-gold" : "";

    const ownedIcon = "data/assets/check.svg";

    const isTimerItem = entry.growTimeMinutes || entry.respawnMinutes;
    const timerIcon = hasActiveTimer(entry.id)
      ? "data/assets/hourglass.svg"
      : "data/assets/bell.svg";

    const timerTooltip = hasActiveTimer(entry.id)
      ? "Timer active"
      : "Add timer";

    const timerButtonHtml = isTimerItem
      ? `
            <img
                class="icon-btn timer-toggle"
                data-id="${entry.id}"
                src="${timerIcon}"
                alt="Timer"
                title="${timerTooltip}"
            >
        `
      : "";

    const locationHtml = locationText
      ? `
  <p>
    <strong>Location:</strong><br>
      ${locationText}
  </p>
`
      : "";

    card.innerHTML = `
<div class="card-header">
  <h3>${entry.name}</h3>
  <div class="card-actions">
    ${timerButtonHtml}
    <img class="icon-btn owned-toggle ${ownedClass}"
      data-id="${entry.id}"
      src="${ownedIcon}"
      alt="Owned Status"
      title="Add to inventory"
    >
    <img class="icon-btn completion-toggle ${completedClass}"
      data-id="${entry.id}"
      src="${completionIcon}"
      alt="Collection Status"
      title="${completionTooltip}"
    >
  </div>
</div>

      ${locationHtml}

      <p>
        <strong>Source:</strong><br>
        ${sourceText}
      </p>

      <input type="text" class="stored-input" data-id="${entry.id}"
        placeholder="Stored at..." value="${inv?.storedAt || ""}">
    `;

    if (appState.completed[entry.id]) {
      card.classList.add("completed");
    }

    container.appendChild(card);
  });

  // Attach ingredient click handlers
  document.querySelectorAll(".meal-ingredient").forEach((span) => {
    span.addEventListener("click", () => {
      const id = span.dataset.id;
      openIngredientModal(id);
    });
  });

  // Attach inventory handlers for normal items
  document.querySelectorAll(".owned-toggle").forEach((icon) => {
    icon.addEventListener("click", () => {
      const id = icon.dataset.id;
      if (!appState.inventory[id]) {
        appState.inventory[id] = {
          owned: false,
          storedAt: "",
        };
      }
      appState.inventory[id].owned = !appState.inventory[id].owned;
      saveState();
      renderItemsPanel();
      renderInventoryPanel();
    });
  });

  document.querySelectorAll(".stored-input").forEach((input) => {
    input.addEventListener("input", () => {
      const id = input.dataset.id;
      if (!appState.inventory[id]) {
        appState.inventory[id] = { owned: false, storedAt: "" };
      }
      appState.inventory[id].storedAt = input.value;
      saveState();
      renderInventoryPanel();
    });
  });

  document.querySelectorAll(".completion-toggle").forEach((icon) => {
    icon.addEventListener("click", () => {
      toggleCompleted(icon.dataset.id);
    });
  });

  document.querySelectorAll(".prep-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToPrepQueue(btn.dataset.id);
    });
  });

  document.querySelectorAll(".recipe-item-link").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelector('[data-panel="items"]').click();
      document.getElementById("itemSearch").value = item.dataset.name;
      renderItemsPanel();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll(".gathering-add-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      addItemSound.currentTime = 0;
      addItemSound.play().catch(() => {});
      const item = findItemByName(btn.dataset.item);
      const location =
        item?.locations?.[0] || item?.location || item?.source || "";
      addToGathering(btn.dataset.item, Number(btn.dataset.qty), location);
    });
  });

  document.querySelectorAll(".recipe-fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleRecipeFavourite(btn.dataset.id);
      renderItemsPanel();
      renderPrepDrawer();
    });
  });
  document.querySelectorAll(".gathering-add-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const recipe = findItemById(btn.dataset.id);
      if (!recipe) {
        return;
      }

      if (recipe.materials) {
        recipe.materials.forEach((material) => {
          const item = findItemByName(material.item);
          const location =
            item?.locations?.[0] || item?.location || item?.source || "";

          addToGathering(material.item, material.quantity, location);
        });
      }

      if (recipe.ingredients) {
        recipe.ingredients.forEach((ingredient) => {
          const item = findItemByName(ingredient);
          const location =
            item?.locations?.[0] || item?.location || item?.source || "";

          addToGathering(ingredient, 1, location);
        });
      }
      addCardSound.currentTime = 0;
      addCardSound.play().catch(() => {});
    });
  });

  document.querySelectorAll(".timer-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = findItemById(btn.dataset.id);
      if (!item) {
        return;
      }

      if (item.locations && item.locations.length > 1) {
        openTimerLocationModal(item);
      } else {
        addTimer(item, item.locations?.[0] || "");
      }
    });
  });
}

document
  .getElementById("clearPrepQueue")
  .addEventListener("click", clearPrepQueue);
document
  .getElementById("clearTimers")
  .addEventListener("click", clearAllTimers);
document
  .getElementById("clearGatheringQueue")
  .addEventListener("click", clearGatheringQueue);
document.getElementById("categorySelect").addEventListener("change", () => {
  const search = document.getElementById("itemSearch");
  const clearSearch = document.getElementById("clearSearch");

  search.value = "";
  clearSearch.classList.add("hidden");

  renderItemsPanel();
});
document
  .getElementById("itemSearch")
  .addEventListener("input", renderItemsPanel);
document
  .getElementById("statusFilter")
  .addEventListener("change", renderItemsPanel);
document
  .getElementById("locationFilter")
  .addEventListener("change", renderItemsPanel);

const backToTop = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
  if (window.scrollY > 500) {
    backToTop.classList.remove("hidden");
  } else {
    backToTop.classList.add("hidden");
  }
});

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("toggleFavourites").addEventListener("click", () => {
  appState.ui.favouritesExpanded = !appState.ui.favouritesExpanded;
  saveState();
  renderPrepDrawer();
});

document.getElementById("toggleTimersDrawer").addEventListener("click", () => {
  const drawer = document.getElementById("timersDrawer");
  const opening = drawer.classList.contains("collapsed");
  drawer.classList.toggle("collapsed");
  if (opening) {
    drawerOpenSound.currentTime = 0;
    drawerOpenSound.play().catch(() => {});
  } else {
    drawerCloseSound.currentTime = 0;
    drawerCloseSound.play().catch(() => {});
  }
});

const clearSearch = document.getElementById("clearSearch");
const itemSearch = document.getElementById("itemSearch");
itemSearch.addEventListener("input", () => {
  clearSearch.classList.toggle("hidden", !itemSearch.value);
});

clearSearch.addEventListener("click", () => {
  itemSearch.value = "";
  clearSearch.classList.add("hidden");
  renderItemsPanel();
  itemSearch.focus();
});

document.getElementById("togglePrepDrawer").addEventListener("click", () => {
  const drawer = document.getElementById("prepDrawer");
  const opening = drawer.classList.contains("collapsed");
  drawer.classList.toggle("collapsed");
  if (opening) {
    drawerOpenSound.currentTime = 0;
    drawerOpenSound.play().catch(() => {});
  } else {
    drawerCloseSound.currentTime = 0;
    drawerCloseSound.play().catch(() => {});
  }
});
document
  .getElementById("toggleGatheringDrawer")
  .addEventListener("click", () => {
    const drawer = document.getElementById("gatheringDrawer");
    const opening = drawer.classList.contains("collapsed");
    drawer.classList.toggle("collapsed");
    if (opening) {
      drawerOpenSound.currentTime = 0;
      drawerOpenSound.play().catch(() => {});
    } else {
      drawerCloseSound.currentTime = 0;
      drawerCloseSound.play().catch(() => {});
    }
  });

/* ============================================================
   MEALS PANEL (legacy)
   ============================================================ */

function renderMealsPanel() {
  const container = document.getElementById("mealsList");
  container.innerHTML = "";

  mealsData.forEach((meal) => {
    const ingredients = meal.ingredients
      .map((ing) => {
        const inv = appState.inventory[ing.id];
        const owned = inv?.owned ? "✔" : "✖";
        return `${owned} ${ing.id} (x${ing.amount})`;
      })
      .join("<br>");

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
      <div class="card-header">
      <h3>${item.name}</h3>
      <img
        class="icon-btn inventory-remove-btn"
        data-id="${item.id}"
        src="data/assets/remove.svg"
        alt="Delete Item"
        title="Delete item"
      >
    </div>
  <p>
    Stored at: ${data.storedAt || "Unknown"}
  </p>
`;

    container.appendChild(card);
  });

  document.querySelectorAll(".inventory-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      plopSound.currentTime = 0;
      plopSound.play().catch(() => {});
      appState.inventory[id].owned = false;
      appState.inventory[id].storedAt = "";
      saveState();
      renderInventoryPanel();
      renderItemsPanel();
    });
  });
}

/* ============================================================
   HELPER
   ============================================================ */

function findItemByName(name) {
  return (
    ingredientsData.find((x) => x.name === name) ||
    foragingData.find((x) => x.name === name) ||
    fishingData.find((x) => x.name === name) ||
    gemsData.find((x) => x.name === name) ||
    miningData.find((x) => x.name === name) ||
    craftingData.find((x) => x.name === name)
  );
}

function findItemById(id) {
  return (
    ingredientsData.find((i) => i.id === id) ||
    fishingData.find((i) => i.id === id) ||
    gemsData.find((i) => i.id === id) ||
    foragingData.find((i) => i.id === id) ||
    miningData.find((i) => i.id === id) ||
    mealsData.find((i) => i.id === id) ||
    craftingData.find((i) => i.id === id)
  );
}

const modal = document.getElementById("ingredientModal");
const timerLocationModal = document.getElementById("timerLocationModal");
const timerLocationItemName = document.getElementById("timerLocationItemName");
const timerLocationSelect = document.getElementById("timerLocationSelect");
const timerLocationConfirm = document.getElementById("timerLocationConfirm");
const timerLocationClose = document.getElementById("timerLocationClose");
let pendingTimerItem = null;

function openTimerLocationModal(item) {
  pendingTimerItem = item;
  timerLocationItemName.textContent = item.name;
  timerLocationSelect.innerHTML = "";
  item.locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    timerLocationSelect.appendChild(option);
  });
  timerLocationModal.classList.remove("hidden");
}

function closeTimerLocationModal() {
  timerLocationModal.classList.add("hidden");
  pendingTimerItem = null;
}

timerLocationConfirm.addEventListener("click", () => {
  if (!pendingTimerItem) {
    return;
  }
  addTimer(pendingTimerItem, timerLocationSelect.value);
  closeTimerLocationModal();
});

timerLocationClose.addEventListener("click", closeTimerLocationModal);

timerLocationModal.addEventListener("click", (e) => {
  if (e.target === timerLocationModal) {
    closeTimerLocationModal();
  }
});

function populateLocationFilter(items) {
  const select = document.getElementById("locationFilter");
  const locations = new Set();
  items.forEach((item) => {
    const value = item.location || item.source;
    if (value) {
      locations.add(value);
    }
  });
  select.innerHTML = '<option value="all">All Locations</option>';
  [...locations].sort().forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    select.appendChild(option);
  });
}

function updateTimers() {
  appState.timers.forEach((timer) => {
    timer.remainingSeconds--;
    if (timer.remainingSeconds <= 0) {
      timerSound.currentTime = 0;
      timerSound.play().catch(() => {});
      timer.remainingSeconds = timer.durationMinutes * 60;
    }
  });
  renderTimersPanel();
}

function addToPrepQueue(id) {
  const isNewItem = !appState.prepQueue[id];
  if (isNewItem) {
    prepSound.currentTime = 0;
    prepSound.play().catch(() => {});
  } else {
    addSound.currentTime = 0;
    addSound.play().catch(() => {});
  }

  if (!appState.prepQueue[id]) {
    appState.prepQueue[id] = 0;
  }

  appState.prepQueue[id]++;
  saveState();
  renderPrepDrawer();
}

function addToGathering(name, quantity = 1, location = "") {
  if (!appState.gatheringQueue[name]) {
    appState.gatheringQueue[name] = { quantity: 0, location };
  }
  appState.gatheringQueue[name].quantity += quantity;
  saveState();
  renderGatheringDrawer();
}

function removeFromGathering(name) {
  delete appState.gatheringQueue[name];
  plopSound.currentTime = 0;
  plopSound.play().catch(() => {});
  saveState();
  renderGatheringDrawer();
}

function removeFromPrepQueue(id) {
  if (!appState.prepQueue[id]) {
    return;
  }
  reduceSound.currentTime = 0;
  reduceSound.play().catch(() => {});
  appState.prepQueue[id]--;
  if (appState.prepQueue[id] <= 0) {
    delete appState.prepQueue[id];
  }
  saveState();
  renderPrepDrawer();
}

function deleteFromPrepQueue(id) {
  plopSound.currentTime = 0;
  plopSound.play().catch(() => {});
  delete appState.prepQueue[id];
  saveState();
  renderPrepDrawer();
}

function clearPrepQueue() {
  if (!confirm("Clear the entire crafting queue?")) {
    return;
  }
  appState.prepQueue = {};
  trashSound.currentTime = 0;
  trashSound.play().catch(() => {});
  saveState();
  renderPrepDrawer();
}

function clearGatheringQueue() {
  if (!confirm("Clear the entire gathering list?")) {
    return;
  }
  appState.gatheringQueue = {};
  trashSound.currentTime = 0;
  trashSound.play().catch(() => {});
  saveState();
  renderGatheringDrawer();
}

function addTimer(item, location = "") {
  const durationMinutes = item.growTimeMinutes || item.respawnMinutes;
  if (!durationMinutes) {
    return;
  }
  const existingTimer = appState.timers.find(
    (timer) => timer.id === item.id && timer.location === location,
  );
  if (existingTimer) {
    return;
  }
  appState.timers.push({
    id: item.id,
    name: item.name,
    location,
    durationMinutes,
    remainingSeconds: durationMinutes * 60,
  });
  setSound.currentTime = 0;
  setSound.play().catch(() => {});
  saveState();
  renderItemsPanel();
  renderTimersPanel();
}

function removeTimer(id, location = "") {
  appState.timers = appState.timers.filter(
    (timer) => !(timer.id === id && timer.location === location),
  );
  plopSound.currentTime = 0;
  plopSound.play().catch(() => {});
  renderItemsPanel();
  renderTimersPanel();
}

function clearAllTimers() {
  appState.timers = [];
  trashSound.currentTime = 0;
  trashSound.play().catch(() => {});
  renderItemsPanel();
  renderTimersPanel();
}

function hasActiveTimer(id) {
  return appState.timers.some((timer) => timer.id === id);
}

function renderTimersPanel() {
  const container = document.getElementById("timersList");
  const timersTabLabel = document.getElementById("timersTabLabel");
  if (timersTabLabel) {
    timersTabLabel.textContent = `Timers (${appState.timers.length})`;
  }
  if (!container) {
    return;
  }
  container.innerHTML = "";

  const clearButton = document.getElementById("clearTimers");
  clearButton.style.display = appState.timers.length > 0 ? "block" : "none";

  if (appState.timers.length === 0) {
    container.innerHTML = `<div class="empty-state">
          No active timers
        </div>`;
    return;
  }

  [...appState.timers]
    .sort((a, b) => a.remainingSeconds - b.remainingSeconds)
    .forEach((timer) => {
      const row = document.createElement("div");
      row.className = "timer-row";
      row.innerHTML = `
          <span class="timer-name">
            ${timer.name}
          </span>

          <span class="timer-location">
            ${timer.location || "Unknown"}
          </span>

          <span class="timer-countdown">
            ${Math.floor(timer.remainingSeconds / 60)}:${String(
              timer.remainingSeconds % 60,
            ).padStart(2, "0")}
          </span>

          <button
            class="timer-remove-btn"
            data-id="${timer.id}"
            data-location="${timer.location}"
          >
            <img
              class="icon-btn"
              src="data/assets/remove.svg"
              alt="Remove Timer"
              title="Remove timer"
            >
          </button>
        `;
      container.appendChild(row);
    });
  document.querySelectorAll(".timer-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeTimer(btn.dataset.id, btn.dataset.location);
    });
  });
}

function renderPrepDrawer() {
  const container = document.getElementById("drawerCraftingQueue");
  const prepTabLabel = document.getElementById("prepTabLabel");
  if (prepTabLabel) {
    prepTabLabel.textContent = `Prep Queue (${Object.keys(appState.prepQueue).length})`;
  }
  if (!container) {
    return;
  }
  const entries = Object.entries(appState.prepQueue);
  container.innerHTML = "";
  Object.entries(appState.prepQueue).forEach(([id, qty]) => {
    const item = findItemById(id);
    if (!item) {
      return;
    }
    const card = document.createElement("div");
    card.className = "prep-row";
    card.innerHTML = `
      <span class="prep-name">
        ${item.name}
      </span>
      <div class="prep-controls">
        <button
          class="prep-minus-btn"
          data-id="${id}"
        >
          <img 
            class="icon-btn" 
            src="data/assets/minus.svg" 
            alt="Decrease Quantity"
            title="Decrease quantity"
          >
        </button>

        <span class="prep-qty">
            ${qty}
        </span>

        <button
            class="prep-plus-btn"
            data-id="${id}"
        >
            <img 
              class="icon-btn" 
              src="data/assets/plus.svg" 
              alt="Increase Quantity"
              title="Increase quantity"
            >
        </button>

        <button
            class="prep-remove-btn"
            data-id="${id}"
        >
            <img 
              class="icon-btn"
              src="data/assets/remove.svg"
              alt="Remove Recipe"
              title="Remove item"
            >
        </button>

    </div>
`;

    container.appendChild(card);
  });

  document.querySelectorAll(".prep-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteFromPrepQueue(btn.dataset.id);
    });
  });

  document.querySelectorAll(".prep-plus-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToPrepQueue(btn.dataset.id);
    });
  });

  document.querySelectorAll(".prep-minus-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromPrepQueue(btn.dataset.id);
    });
  });

  const requiredMaterials = {};
  entries.forEach(([id, qty]) => {
    const recipe = findItemById(id);
    if (!recipe?.materials) {
      return;
    }
    recipe.materials.forEach((material) => {
      const totalNeeded = material.quantity * qty;
      if (!requiredMaterials[material.item]) {
        requiredMaterials[material.item] = 0;
      }
      requiredMaterials[material.item] += totalNeeded;
    });
  });

  if (entries.length === 0) {
    container.innerHTML = `
    <div class="empty-state">
      No items queued
    </div>
  `;
  }

  const summaryContainer = document.getElementById("drawerQueueSummary");
  const totalRecipes = entries.length;
  const totalCrafts = entries.reduce((sum, [, qty]) => sum + qty, 0);

  const uniqueMaterials = Object.keys(requiredMaterials).length;

  summaryContainer.innerHTML = `
    <div class="summary-container">
        <div class="summary-stat">
            Recipes: ${totalRecipes}
        </div>

        <div class="summary-stat">
            Total Crafts: ${totalCrafts}
        </div>

        <div class="summary-stat">
            Materials: ${uniqueMaterials}
        </div>
    </div>
`;

  const materialsContainer = document.getElementById("drawerRequiredItems");
  const favouritesContainer = document.getElementById("drawerFavourites");
  const favourites = Object.keys(appState.favouriteRecipes || {}).filter(
    (id) => appState.favouriteRecipes[id],
  );
  const toggleButton = document.getElementById("toggleFavourites");

  toggleButton.textContent = appState.ui.favouritesExpanded
    ? "▼ Favourite Recipes"
    : "▶ Favourite Recipes";

  favouritesContainer.innerHTML = "";

  if (appState.ui.favouritesExpanded) {
    if (favourites.length === 0) {
      favouritesContainer.innerHTML = `
      <div class="empty-state">
        No favourites selected
      </div>
    `;
    } else {
      favourites.forEach((id) => {
        const recipe = findItemById(id);
        if (!recipe) return;
        const row = document.createElement("div");
        row.className = "prep-row";
        row.innerHTML = `
         <span>
            ${recipe.name}
          </span>
          <button
            class="fav-queue-btn"
            data-id="${id}"
          >
            <img
              class="icon-btn"
              src="data/assets/plus.svg"
              alt="Add To Queue"
              title="Add to prep list"
            >
          </button>
        `;
        favouritesContainer.appendChild(row);
      });
    }
  }

  materialsContainer.innerHTML = "";
  Object.entries(requiredMaterials)
    .sort()
    .forEach(([name, qty]) => {
      const row = document.createElement("div");
      row.className = "required-row";
      row.innerHTML = `
      <span
        class="required-material"
        data-name="${name}"
        title="View item details"
      >
        ${name}
      </span>
      <span>
        x${qty}
      </span>
    `;

      materialsContainer.appendChild(row);
    });

  document.querySelectorAll(".required-material").forEach((material) => {
    material.addEventListener("click", () => {
      document.querySelector('[data-panel="items"]').click();
      document.getElementById("itemSearch").value = material.dataset.name;
      console.log(material.dataset.name);
      renderItemsPanel();
    });
  });

  document.querySelectorAll(".fav-queue-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToPrepQueue(btn.dataset.id);
    });
  });

  const clearButton = document.getElementById("clearPrepQueue");
  clearButton.style.display = entries.length > 0 ? "block" : "none";
}

function renderGatheringDrawer() {
  const container = document.getElementById("drawerGatheringQueue");
  const gatheringTabLabel = document.getElementById("gatheringTabLabel");

  if (gatheringTabLabel) {
    gatheringTabLabel.textContent = `Gathering (${Object.keys(appState.gatheringQueue).length})`;
  }

  if (!container) {
    return;
  }

  const entries = Object.entries(appState.gatheringQueue);
  const summaryContainer = document.getElementById("drawerGatheringSummary");
  container.innerHTML = "";
  const clearButton = document.getElementById("clearGatheringQueue");
  clearButton.style.display = entries.length > 0 ? "block" : "none";
  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No items listed
      </div>
    `;
    return;
  }
  const grouped = {};
  entries.forEach(([name, data]) => {
    const location = data.location || "Other";
    if (!grouped[location]) {
      grouped[location] = [];
    }
    grouped[location].push({
      name,
      data,
    });
  });
  Object.keys(grouped)
    .sort()
    .forEach((location) => {
      const heading = document.createElement("div");
      heading.className = "gathering-location-header";
      heading.textContent = location;
      container.appendChild(heading);
      grouped[location].forEach((item) => {
        const row = document.createElement("div");
        row.className = "required-row";
        row.innerHTML = `
        <span class="gathering-name">
          ${item.name}
        </span>
        <span class="gathering-qty">
          x${item.data.quantity ?? item.data}
        </span>
        <button class="gathering-remove-btn" data-name="${item.name}" >
          <img class="icon-btn"
            src="data/assets/remove.svg"
            alt="Remove Item"
            title="Remove item"
          >
        </button>
      `;
        container.appendChild(row);
      });
    });

  document.querySelectorAll(".gathering-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromGathering(btn.dataset.name);
    });
  });

  const totalItems = entries.length;
  const totalQuantity = entries.reduce(
    (sum, [, data]) => sum + (data.quantity ?? data),
    0,
  );
  const uniqueLocations = new Set(
    entries.map(([, data]) => data.location).filter(Boolean),
  ).size;
  summaryContainer.innerHTML = `
    <div class="summary-container">
      <div class="summary-stat">
        Items: ${totalItems}
      </div>
      <div class="summary-stat">
        Quantity: ${totalQuantity}
      </div>
      <div class="summary-stat">
        Locations: ${uniqueLocations}
      </div>
    </div>
  `;
}

/* ============================================================
   INGREDIENT MODAL (editable)
   ============================================================ */

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
  const inv = appState.inventory[id] || { owned: false, storedAt: "" };

  modalCurrentId = id;

  modalName.textContent = item?.name || id;
  const sourceText = item?.source || item?.location || "Source: Unknown";
  modalSource.textContent = `Source: ${sourceText.replace(/^Source:\s*/, "")}`;
  modalCategory.textContent = item?.categoryId
    ? `Category: ${item.categoryId}`
    : "";

  modalOwned.checked = !!inv.owned;
  modalStoredAt.value = inv.storedAt || "";

  modal.classList.remove("hidden");
}

function closeIngredientModal() {
  modal.classList.add("hidden");
  modalCurrentId = null;
}

modalClose.addEventListener("click", closeIngredientModal);

modalSave.addEventListener("click", () => {
  if (!modalCurrentId) return;

  if (!appState.inventory[modalCurrentId]) {
    appState.inventory[modalCurrentId] = { owned: false, storedAt: "" };
  }

  appState.inventory[modalCurrentId].owned = modalOwned.checked;
  appState.inventory[modalCurrentId].storedAt = modalStoredAt.value;

  saveState();
  renderItemsPanel();
  renderInventoryPanel();
  closeIngredientModal();
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeIngredientModal();
  }
});

/* ============================================================
   RESTAURANT TIMER (NEXT HOUR)
   ============================================================ */

let lastBellHour = null;

function updateGuestTimer() {
  const textEl = document.getElementById("guestTimerText");
  if (!textEl) return;

  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);

  if (now >= nextHour) {
    nextHour.setHours(nextHour.getHours() + 1);
  }

  const diffMs = nextHour - now;
  const totalSeconds = Math.floor(diffMs / 1000);
  const currentHour = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

  if (now.getMinutes() === 0 && currentHour !== lastBellHour) {
    lastBellHour = currentHour;
    textEl.textContent = "New restaurant guests arriving now!";
    bellSound.currentTime = 0;
    bellSound.play().catch(() => {});
    setTimeout(updateGuestTimer, 1000);
    return;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  textEl.textContent = `Next restaurant guests in ${mm}:${ss}`;
  setTimeout(updateGuestTimer, 1000);
}

function startGuestTimer() {
  updateGuestTimer();
}

setInterval(() => {
  updateTimers();
}, 1000);

/* ============================================================
   INIT
   ============================================================ */

loadState();
loadData();
