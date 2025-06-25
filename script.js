document.addEventListener("DOMContentLoaded", () => {
  const goalHours = 10000;
  let entries = [];
  let chartInstance = null;
  let useTimeScale = true; // Default to time-based chart
  let darkMode = false; // Will be loaded from IndexedDB
  let dbReady = false; // Track if database is initialized

  const form = document.getElementById("add-entry-form");
  const addEntryContainer = document.getElementById("add-entry-form-container");
  const showAddFormBtn = document.getElementById("show-add-form-btn");
  const cancelAddFormBtn = document.getElementById("cancel-add-form-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsDropdown = document.getElementById("settings-dropdown");
  const projectBtn = document.getElementById("project-btn");
  const projectDropdown = document.getElementById("project-dropdown");
  const currentProjectName = document.getElementById("current-project-name");
  const projectList = document.getElementById("project-list");
  const createProjectBtn = document.getElementById("create-project-btn");
  const importBtn = document.getElementById("import-btn");
  const importFileInput = document.getElementById("import-file-input");
  const exportBtn = document.getElementById("export-btn");
  const descriptionInput = document.getElementById("description");
  const hoursInput = document.getElementById("hours");
  const dateInput = document.getElementById("date");
  const tableBody = document.getElementById("entries-tbody");
  const totalHoursDisplay = document.getElementById("total-hours");
  const progressBar = document.getElementById("progress-bar");
  const chartCanvas = document
    .getElementById("progress-chart")
    .getContext("2d");
  const chartTypeToggle = document.getElementById("chart-type-toggle");
  const themeToggle = document.getElementById("theme-toggle");

  // New elements for note editor
  const mainContentDiv = document.getElementById("main-content");
  const noteEditorSection = document.getElementById("note-editor-section");
  const noteTextarea = document.getElementById("note-textarea");
  const editNoteForTitleSpan = document.getElementById("editor-title");
  const editNoteForDateSpan = document.getElementById("editor-date");
  const saveNoteBtn = document.getElementById("save-note-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  let currentlyEditingIndex = null; // Index of the entry being edited
  let easyMDEInstance = null; // To hold the EasyMDE editor instance
  let currentProjectId = "default"; // Current active project
  let projects = {}; // Store all projects data

  // Add check for marked library after variable declarations
  console.log(
    "Checking marked library on initial script load:",
    typeof marked,
    marked
  );

  // --- IndexedDB Management ---
  let db = null;
  const DB_NAME = "LearningTrackerDB";
  const DB_VERSION = 2; // Increased version for project support
  const STORE_NAME = "entries";
  const SETTINGS_STORE = "settings";
  const PROJECTS_STORE = "projects";

  // Initialize IndexedDB
  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log("IndexedDB initialized successfully");
        dbReady = true;
        resolve(db);
      };

      request.onupgradeneeded = event => {
        db = event.target.result;
        const oldVersion = event.oldVersion;
        console.log(
          `Upgrading IndexedDB schema from version ${oldVersion} to ${DB_VERSION}...`
        );

        // Create entries store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const entriesStore = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          // Create indexes for better querying
          entriesStore.createIndex("date", "date", { unique: false });
          entriesStore.createIndex("description", "description", {
            unique: false,
          });
          entriesStore.createIndex("projectId", "projectId", { unique: false });
        } else if (oldVersion < 2) {
          // Add projectId index to existing entries store
          const transaction = event.target.transaction;
          const entriesStore = transaction.objectStore(STORE_NAME);
          if (!entriesStore.indexNames.contains("projectId")) {
            entriesStore.createIndex("projectId", "projectId", {
              unique: false,
            });
          }
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          const settingsStore = db.createObjectStore(SETTINGS_STORE, {
            keyPath: "key",
          });
        }

        // Create projects store
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectsStore = db.createObjectStore(PROJECTS_STORE, {
            keyPath: "id",
          });
        }

        console.log("IndexedDB schema created/updated");
      };
    });
  }

  // Load entries from IndexedDB for current project
  function loadEntries() {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        console.warn("Database not ready, waiting...");
        resolve([]);
        return;
      }

      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);

      // If we have project support, filter by project ID
      if (store.indexNames.contains("projectId")) {
        const index = store.index("projectId");
        const request = index.getAll(currentProjectId);

        request.onsuccess = () => {
          const loadedEntries = request.result || [];
          entries = loadedEntries.map(entry => ({
            date: entry.date,
            description: entry.description,
            hours: parseFloat(entry.hours),
            notes: entry.notes,
            _id: entry.id,
          }));
          console.log(
            `Loaded ${entries.length} entries for project ${currentProjectId}:`,
            entries
          );
          resolve(entries);
        };

        request.onerror = () => {
          console.error("Failed to load entries:", request.error);
          reject(request.error);
        };
      } else {
        // Backward compatibility - load all entries and assign to default project
        const request = store.getAll();

        request.onsuccess = () => {
          const loadedEntries = request.result || [];
          entries = loadedEntries
            .filter(
              entry => !entry.projectId || entry.projectId === currentProjectId
            )
            .map(entry => ({
              date: entry.date,
              description: entry.description,
              hours: parseFloat(entry.hours),
              notes: entry.notes,
              _id: entry.id,
            }));
          console.log("Loaded entries (backward compatibility):", entries);
          resolve(entries);
        };

        request.onerror = () => {
          console.error("Failed to load entries:", request.error);
          reject(request.error);
        };
      }
    });
  }

  // Save entries to IndexedDB
  function saveEntries() {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        console.warn("Database not ready, cannot save entries");
        reject(new Error("Database not ready"));
        return;
      }

      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing entries and add current ones
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Add all current entries
        let addCount = 0;
        const totalEntries = entries.length;

        if (totalEntries === 0) {
          console.log("No entries to save");
          resolve();
          return;
        }

        entries.forEach((entry, index) => {
          // Create a clean entry without the internal _id but with projectId
          const cleanEntry = {
            date: entry.date,
            description: entry.description,
            hours: entry.hours,
            notes: entry.notes,
            projectId: currentProjectId,
          };

          const addRequest = store.add(cleanEntry);

          addRequest.onsuccess = () => {
            // Update the entry with the new ID
            entries[index]._id = addRequest.result;
            addCount++;

            if (addCount === totalEntries) {
              console.log("All entries saved to IndexedDB:", entries);
              resolve();
            }
          };

          addRequest.onerror = () => {
            console.error("Failed to save entry:", addRequest.error);
            reject(addRequest.error);
          };
        });
      };

      clearRequest.onerror = () => {
        console.error("Failed to clear entries:", clearRequest.error);
        reject(clearRequest.error);
      };
    });
  }

  // Load settings from IndexedDB
  function loadSettings() {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        console.warn("Database not ready for settings");
        resolve({ darkMode: false, currentProject: "default" });
        return;
      }

      const transaction = db.transaction([SETTINGS_STORE], "readonly");
      const store = transaction.objectStore(SETTINGS_STORE);

      // Load all settings
      const request = store.getAll();

      request.onsuccess = () => {
        const settings = request.result || [];
        const settingsMap = {};

        settings.forEach(setting => {
          settingsMap[setting.key] = setting.value;
        });

        const result = {
          darkMode: settingsMap.darkMode || false,
          currentProject: settingsMap.currentProject || "default",
        };

        console.log("Loaded settings:", result);
        resolve(result);
      };

      request.onerror = () => {
        console.error("Failed to load settings:", request.error);
        resolve({ darkMode: false, currentProject: "default" });
      };
    });
  }

  // Save settings to IndexedDB
  function saveSettings(settings) {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        console.warn("Database not ready, cannot save settings");
        reject(new Error("Database not ready"));
        return;
      }

      const transaction = db.transaction([SETTINGS_STORE], "readwrite");
      const store = transaction.objectStore(SETTINGS_STORE);

      // Save all settings
      const settingsKeys = Object.keys(settings);
      let saveCount = 0;

      settingsKeys.forEach(key => {
        const request = store.put({
          key: key,
          value: settings[key],
        });

        request.onsuccess = () => {
          saveCount++;
          if (saveCount === settingsKeys.length) {
            console.log("Settings saved to IndexedDB:", settings);
            resolve();
          }
        };

        request.onerror = () => {
          console.error(`Failed to save setting ${key}:`, request.error);
          reject(request.error);
        };
      });
    });
  }

  // --- Project Management ---
  // Load all projects from IndexedDB
  async function loadProjects() {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        console.warn("Database not ready for projects");
        resolve({});
        return;
      }

      const transaction = db.transaction([PROJECTS_STORE], "readonly");
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const projectsArray = request.result || [];
        const projectsMap = {};

        projectsArray.forEach(project => {
          projectsMap[project.id] = project;
        });

        // Ensure default project exists
        if (!projectsMap["default"]) {
          projectsMap["default"] = {
            id: "default",
            name: "Default",
            createdAt: new Date().toISOString(),
          };
        }

        console.log("Loaded projects:", projectsMap);
        resolve(projectsMap);
      };

      request.onerror = () => {
        console.error("Failed to load projects:", request.error);
        reject(request.error);
      };
    });
  }

  // Save projects to IndexedDB
  async function saveProjects(projectsData) {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        console.warn("Database not ready, cannot save projects");
        reject(new Error("Database not ready"));
        return;
      }

      const transaction = db.transaction([PROJECTS_STORE], "readwrite");
      const store = transaction.objectStore(PROJECTS_STORE);

      // Clear and add all projects
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        const projectIds = Object.keys(projectsData);
        let addCount = 0;

        if (projectIds.length === 0) {
          resolve();
          return;
        }

        projectIds.forEach(projectId => {
          const addRequest = store.add(projectsData[projectId]);

          addRequest.onsuccess = () => {
            addCount++;
            if (addCount === projectIds.length) {
              console.log("All projects saved to IndexedDB");
              resolve();
            }
          };

          addRequest.onerror = () => {
            console.error("Failed to save project:", addRequest.error);
            reject(addRequest.error);
          };
        });
      };

      clearRequest.onerror = () => {
        console.error("Failed to clear projects:", clearRequest.error);
        reject(clearRequest.error);
      };
    });
  }

  // Create a new project
  async function createProject(name) {
    const projectId = `project_${Date.now()}`;
    const newProject = {
      id: projectId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    projects[projectId] = newProject;
    await saveProjects(projects);

    return projectId;
  }

  // Switch to a different project
  async function switchProject(projectId) {
    if (!projects[projectId]) {
      console.error("Project not found:", projectId);
      return;
    }

    // Save current project's entries
    if (entries.length > 0) {
      await saveEntries();
    }

    // Switch to new project
    currentProjectId = projectId;
    currentProjectName.textContent = projects[projectId].name;

    // Load new project's entries
    await loadEntries();
    renderAll();

    // Save current project setting
    await saveSettings({
      darkMode: darkMode,
      currentProject: currentProjectId,
    });

    console.log("Switched to project:", projects[projectId].name);
  }

  // --- Theme Management ---
  function setTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      if (themeToggle) themeToggle.checked = true;
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (themeToggle) themeToggle.checked = false;
    }

    // If chart exists, update it to match the theme
    if (chartInstance) {
      updateChartTheme();
    }

    // Save preference to IndexedDB
    darkMode = isDark;
    saveSettings({ darkMode }).catch(err => {
      console.error("Failed to save theme setting:", err);
    });
  }

  // Will apply theme after loading settings

  // --- Data Persistence ---
  function updateChartTheme() {
    if (!chartInstance) return;

    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--text-color")
      .trim();
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg-color")
      .trim();

    // Update chart text colors
    chartInstance.options.scales.x.ticks.color = textColor;
    chartInstance.options.scales.y.ticks.color = textColor;
    chartInstance.options.scales.x.title.color = textColor;
    chartInstance.options.scales.y.title.color = textColor;
    chartInstance.options.plugins.legend.labels.color = textColor;

    // Update the chart
    chartInstance.update();
  }

  // --- Rendering ---
  function renderTable() {
    console.log("Rendering table...");
    tableBody.innerHTML = ""; // Clear existing rows

    if (entries.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-gray-500">No entries yet. Add one above!</td></tr>';
      return;
    }

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedEntries.forEach((entry, index) => {
      const originalIndex = entries.findIndex(e => e === entry);
      const row = document.createElement("tr");

      // Simplified notes preview (just first ~50 chars, plain text)
      let notesPreviewHtml =
        '<span class="text-gray-400 italic">No notes</span>';
      if (entry.notes) {
        const split = entry.notes.split("\n");
        const firstLine = split[0];
        // Instead of appending "..." we'll use a CSS class to create a fade effect
        const snippet = firstLine.substring(0, 50);
        // Basic escaping to prevent raw HTML in table
        const escapedSnippet = snippet
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        // Add 'notes-preview' class for styling the fade effect
        const hasContinuation = firstLine.length > 50 || split.length > 1;
        notesPreviewHtml = `<span class="font-mono text-xs ${
          hasContinuation ? "notes-preview" : ""
        }">${escapedSnippet}</span>`;
      }

      // Make cells clickable by adding data attributes and editable class
      row.innerHTML = `
        <td class="editable-cell" data-field="date" data-index="${originalIndex}">${
        entry.date
      }</td>
        <td class="editable-cell" data-field="description" data-index="${originalIndex}">${
        entry.description
      }</td>
        <td class="editable-cell" data-field="hours" data-index="${originalIndex}">${entry.hours.toFixed(
        1
      )}</td>
        <td class="editable-cell" data-field="notes" data-index="${originalIndex}">${notesPreviewHtml}</td>
        <td class="space-x-2">
          <button class="text-black-600 hover:text-gray-400 edit-btn" data-index="${originalIndex}"><i class="fas fa-edit"></i></button>
          <button class="text-black-600 hover:text-red-600 delete-btn" data-index="${originalIndex}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Add event listeners to buttons
    document.querySelectorAll(".delete-btn").forEach(button => {
      button.addEventListener("click", handleDeleteEntry);
    });
    document.querySelectorAll(".edit-btn").forEach(button => {
      button.addEventListener("click", handleEditNoteClick);
    });

    // Add event listeners to editable cells
    document.querySelectorAll(".editable-cell").forEach(cell => {
      cell.addEventListener("click", handleCellClick);
    });
  }

  function renderProgress() {
    console.log("Rendering progress...");
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const percentage = Math.min((totalHours / goalHours) * 100, 100);

    totalHoursDisplay.textContent = totalHours.toFixed(1);
    progressBar.style.width = `${percentage}%`;

    console.log(`Total hours: ${totalHours}, Percentage: ${percentage}%`);
  }

  function renderChart() {
    console.log(
      "Rendering chart with " +
        (useTimeScale ? "time-based" : "evenly-spaced") +
        " scale..."
    );

    // Get theme colors
    const textColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--text-color")
        .trim() || "#111827";
    const primaryColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-color")
        .trim() || "#111827";

    // Sort entries by date ascending for the chart
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const labels = [];
    const cumulativeHoursData = [];
    let cumulativeHours = 0;

    // Aggregate hours per day for cleaner chart
    const dailyHours = {};
    sortedEntries.forEach(entry => {
      cumulativeHours += entry.hours;
      dailyHours[entry.date] = (dailyHours[entry.date] || 0) + entry.hours; // Sum hours for the same day
    });

    // Create chart data points based on aggregated daily hours
    let runningTotal = 0;
    const sortedDates = Object.keys(dailyHours).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // Format data for chart based on selected type
    const dataPoints = [];

    sortedDates.forEach(date => {
      runningTotal += dailyHours[date];
      labels.push(date);
      cumulativeHoursData.push(runningTotal);

      // Also prepare time-based data points
      dataPoints.push({
        x: new Date(date),
        y: runningTotal,
      });
    });

    if (chartInstance) {
      chartInstance.destroy(); // Destroy previous chart instance
    }

    // Configure options based on chart type
    const chartOptions = {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: false,
            text: "Cumulative Hours",
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            color: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            color: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
      },
    };

    // Add time scale specific options if needed
    if (useTimeScale) {
      chartOptions.scales.x.type = "time";
      chartOptions.scales.x.time = {
        unit: "day",
        displayFormats: {
          day: "MMM dd",
        },
        tooltipFormat: "MMM dd, yyyy",
      };
    }

    // Create the appropriate chart configuration
    const chartConfig = {
      type: "line",
      options: chartOptions,
    };

    // Set data based on chart type
    if (useTimeScale) {
      chartConfig.data = {
        datasets: [
          {
            label: "Cumulative Hours Spent",
            data: dataPoints,
            borderColor: primaryColor,
            backgroundColor: darkMode
              ? "rgba(99, 102, 241, 0.1)"
              : "rgba(17, 24, 39, 0.05)",
            tension: 0.1,
            fill: true,
          },
        ],
      };
    } else {
      chartConfig.data = {
        labels: labels,
        datasets: [
          {
            label: "Cumulative Hours Spent",
            data: cumulativeHoursData,
            borderColor: primaryColor,
            backgroundColor: darkMode
              ? "rgba(99, 102, 241, 0.1)"
              : "rgba(17, 24, 39, 0.05)",
            tension: 0.1,
            fill: true,
          },
        ],
      };
    }

    // Create chart instance
    chartInstance = new Chart(chartCanvas, chartConfig);
    console.log(
      "Chart rendered with " +
        (useTimeScale ? "time-based" : "evenly-spaced") +
        " scale."
    );
  }

  // --- View Switching & Editor Handling ---
  function destroyEasyMDE() {
    if (easyMDEInstance) {
      easyMDEInstance.toTextArea(); // Detach editor
      easyMDEInstance = null;
      // Ensure the textarea is completely empty after destroying the instance
      if (noteTextarea) {
        noteTextarea.value = "";
      }
      console.log("EasyMDE instance destroyed and textarea cleared.");
    }
  }

  function showMainView() {
    destroyEasyMDE(); // Destroy editor when leaving editor view
    mainContentDiv.classList.remove("hidden");
    noteEditorSection.classList.add("hidden");
    currentlyEditingIndex = null;
  }

  function showEditorView() {
    mainContentDiv.classList.add("hidden");
    noteEditorSection.classList.remove("hidden");
  }

  // --- Note Editor Logic ---

  // Make title editable when clicked
  function setupEditableTitle() {
    // Only set up once
    if (
      editNoteForTitleSpan.getAttribute("data-editable-initialized") === "true"
    ) {
      return;
    }

    editNoteForTitleSpan.addEventListener("click", function () {
      // Don't do anything if we're already editing
      if (
        document.activeElement &&
        document.activeElement.classList.contains("editable-title-input")
      ) {
        return;
      }

      const currentTitle = editNoteForTitleSpan.textContent;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "editable-title-input";
      input.value = currentTitle;

      // Save the original text in case we need to cancel
      input.setAttribute("data-original-text", currentTitle);

      // Replace the span text with the input
      editNoteForTitleSpan.textContent = "";
      editNoteForTitleSpan.appendChild(input);

      // Focus the input
      input.focus();

      // Set up event handlers
      input.addEventListener("blur", saveEditableTitle);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          saveEditableTitle.call(this, e);
        } else if (e.key === "Escape") {
          cancelEditableTitle.call(this, e);
        }
      });
    });

    // Mark as initialized
    editNoteForTitleSpan.setAttribute("data-editable-initialized", "true");
  }

  // Make date editable when clicked
  function setupEditableDate() {
    // Only set up once
    if (
      editNoteForDateSpan.getAttribute("data-editable-initialized") === "true"
    ) {
      return;
    }

    editNoteForDateSpan.addEventListener("click", function () {
      // Don't do anything if we're already editing
      if (
        document.activeElement &&
        document.activeElement.classList.contains("editable-date-input")
      ) {
        return;
      }

      const currentDate = editNoteForDateSpan.textContent.trim();
      const input = document.createElement("input");
      input.type = "date"; // Use native date picker
      input.className = "editable-date-input";

      // Convert displayed date to YYYY-MM-DD format for input
      try {
        if (currentDate) {
          input.value = currentDate;
        } else {
          // Default to today if no date
          input.value = new Date().toISOString().split("T")[0];
        }
      } catch (e) {
        console.error("Error parsing date:", e);
        input.value = new Date().toISOString().split("T")[0];
      }

      // Save the original text in case we need to cancel
      input.setAttribute("data-original-text", currentDate);

      // Replace the span text with the input
      editNoteForDateSpan.textContent = "";
      editNoteForDateSpan.appendChild(input);

      // Focus the input
      input.focus();

      // Set up event handlers
      input.addEventListener("blur", saveEditableDate);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          saveEditableDate.call(this, e);
        } else if (e.key === "Escape") {
          cancelEditableDate.call(this, e);
        }
      });
    });

    // Mark as initialized
    editNoteForDateSpan.setAttribute("data-editable-initialized", "true");
  }

  function saveEditableTitle(event) {
    const input = event.target;
    const newTitle = input.value.trim();

    // Update the entry's description if we're editing an entry
    if (currentlyEditingIndex !== null && entries[currentlyEditingIndex]) {
      entries[currentlyEditingIndex].description = newTitle;
      saveEntries().catch(err => {
        console.error("Failed to save title change:", err);
      }); // Save to IndexedDB
    }

    // Replace the input with the new text
    const span = input.parentNode;
    span.textContent = newTitle;

    console.log("Title updated to:", newTitle);
  }

  function saveEditableDate(event) {
    const input = event.target;
    const newDate = input.value;

    // Update the entry's date if we're editing an entry
    if (
      currentlyEditingIndex !== null &&
      entries[currentlyEditingIndex] &&
      newDate
    ) {
      entries[currentlyEditingIndex].date = newDate;
      saveEntries().catch(err => {
        console.error("Failed to save date change:", err);
      }); // Save to IndexedDB
    }

    // Replace the input with the new text (formatted date)
    const span = input.parentNode;
    span.textContent = newDate; // Could format this differently if needed

    console.log("Date updated to:", newDate);
  }

  function cancelEditableTitle(event) {
    const input = event.target;
    const originalText = input.getAttribute("data-original-text") || "";

    // Replace the input with the original text
    const span = input.parentNode;
    span.textContent = originalText;
  }

  function cancelEditableDate(event) {
    const input = event.target;
    const originalText = input.getAttribute("data-original-text") || "";

    // Replace the input with the original text
    const span = input.parentNode;
    span.textContent = originalText;
  }

  function handleEditNoteClick(event) {
    // Find the button element that was clicked (could be the i tag inside the button)
    let target = event.target;

    // If the user clicked on the icon inside the button, navigate up to the button
    if (target.tagName.toLowerCase() === "i") {
      target = target.parentElement;
    }

    const indexToEdit = parseInt(target.getAttribute("data-index"), 10);
    console.log("Attempting to edit notes for index:", indexToEdit);

    if (
      isNaN(indexToEdit) ||
      indexToEdit < 0 ||
      indexToEdit >= entries.length
    ) {
      console.error(
        "Invalid index for editing notes:",
        target.getAttribute("data-index")
      );
      return;
    }

    // Destroy any existing instance before creating a new one
    destroyEasyMDE();

    currentlyEditingIndex = indexToEdit;
    const entry = entries[currentlyEditingIndex];

    console.log("Editing notes for entry index:", currentlyEditingIndex, entry);

    // Set both title and date in the editor header
    editNoteForTitleSpan.textContent = entry.description;
    editNoteForDateSpan.textContent = entry.date;

    // Clear textarea content first before showing editor view
    noteTextarea.value = "";

    showEditorView();

    // Setup both editable fields
    setupEditableTitle();
    setupEditableDate();

    // Initialize EasyMDE *after* the section is visible
    try {
      // Make sure the textarea is completely empty
      if (noteTextarea.value !== "") {
        noteTextarea.value = "";
      }

      // Create a new instance with proper content for this specific entry
      const notesContent = entry.notes !== undefined ? entry.notes : "";

      easyMDEInstance = new EasyMDE({
        element: noteTextarea,
        initialValue: notesContent,
        spellChecker: false,
        status: false,
        autoDownloadFontAwesome: false,
      });
      console.log(
        "EasyMDE instance created for entry notes:",
        notesContent || "(empty)"
      );

      // Add custom paste handler for the smart-link feature
      // This uses CodeMirror's underlying editor instance
      const cm = easyMDEInstance.codemirror;
      cm.on("paste", function (_, e) {
        // Only process if there's selected text
        const sel = cm.somethingSelected();
        console.log("something selected", sel);
        if (sel) {
          // Get clipboard data
          const clipboardData = e.clipboardData || window.clipboardData;
          const pastedData = clipboardData.getData("text");

          // Check if pasted content looks like a URL
          const urlRegex = /^(https?:\/\/[^\s]+)$/;
          if (urlRegex.test(pastedData)) {
            // Prevent the default paste behavior
            e.preventDefault();

            // Get the selected text
            const selectedText = cm.getSelection();

            // Replace the selection with a markdown link
            cm.replaceSelection(`[${selectedText}](${pastedData})`);

            console.log(
              `Transformed "${selectedText}" into a link with URL: ${pastedData}`
            );
          }
          // If not a URL, let the default paste behavior happen
        }
        // If nothing selected, let the default paste behavior happen
      });
    } catch (error) {
      console.error("Failed to initialize EasyMDE:", error);
      // Fallback or error message if needed
    }
  }

  function handleSaveNote() {
    if (currentlyEditingIndex === null || !easyMDEInstance) {
      console.error(
        "Cannot save: No entry selected or editor not initialized."
      );
      return;
    }

    const newNotes = easyMDEInstance.value(); // Get content from EasyMDE
    entries[currentlyEditingIndex].notes = newNotes.trim()
      ? newNotes.trim()
      : undefined;

    console.log(
      "Saving notes for index:",
      currentlyEditingIndex,
      entries[currentlyEditingIndex]
    );

    saveEntries()
      .then(() => {
        showMainView(); // This will also destroy the EasyMDE instance
        renderAll();
      })
      .catch(err => {
        console.error("Failed to save notes:", err);
        alert("Failed to save notes. Please try again.");
      });
  }

  function handleCancelEdit() {
    console.log("Cancelling note edit for index:", currentlyEditingIndex);
    showMainView(); // This will also destroy the EasyMDE instance
  }

  // --- Form Handling ---
  function showAddEntryForm() {
    addEntryContainer.classList.remove("hidden");
    descriptionInput.focus();
    showAddFormBtn.classList.add("hidden");
  }

  function hideAddEntryForm() {
    addEntryContainer.classList.add("hidden");
    showAddFormBtn.classList.remove("hidden");
    resetForm();
  }

  function resetForm() {
    form.reset();
  }

  // --- Event Handlers ---
  function handleAddEntry(event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const hours = parseFloat(hoursInput.value);
    const selectedDate = dateInput.value;
    const date = selectedDate
      ? selectedDate
      : new Date().toISOString().split("T")[0];

    if (!description || isNaN(hours) || hours <= 0) {
      alert("Please enter a valid description and positive number of hours.");
      return;
    }

    // Add entry without notes initially; notes are added/edited separately
    const newEntry = { date, description, hours, notes: undefined };

    entries.push(newEntry);
    console.log("Added new entry:", newEntry);

    saveEntries()
      .then(() => {
        renderAll();
        hideAddEntryForm();
      })
      .catch(err => {
        console.error("Failed to save new entry:", err);
        alert("Failed to save entry. Please try again.");
        // Remove the entry from local array if save failed
        entries.pop();
      });
  }

  function handleDeleteEntry(event) {
    const button = event.target;
    const indexToDelete = parseInt(button.getAttribute("data-index"), 10);

    if (
      isNaN(indexToDelete) ||
      indexToDelete < 0 ||
      indexToDelete >= entries.length
    ) {
      console.error(
        "Invalid index for deletion:",
        button.getAttribute("data-index")
      );
      return;
    }

    const entryToDelete = entries[indexToDelete];
    if (
      confirm(
        `Are you sure you want to delete the entry for "${entryToDelete.description}" on ${entryToDelete.date}?`
      )
    ) {
      console.log("Deleting entry at index:", indexToDelete, entryToDelete);
      const deletedEntry = entries.splice(indexToDelete, 1)[0];

      saveEntries()
        .then(() => {
          renderAll();
        })
        .catch(err => {
          console.error("Failed to delete entry:", err);
          alert("Failed to delete entry. Please try again.");
          // Restore the entry if delete failed
          entries.splice(indexToDelete, 0, deletedEntry);
          renderAll();
        });
    }
  }

  // Handle chart type toggle
  function handleChartTypeToggle() {
    useTimeScale = chartTypeToggle.checked;
    renderChart();
  }

  // --- Settings Dropdown ---
  function toggleSettingsDropdown() {
    settingsDropdown.classList.toggle("hidden");
  }

  function hideSettingsDropdown() {
    settingsDropdown.classList.add("hidden");
  }

  // --- Project Dropdown ---
  function toggleProjectDropdown() {
    projectDropdown.classList.toggle("hidden");
    if (!projectDropdown.classList.contains("hidden")) {
      renderProjectDropdown();
    }
  }

  function hideProjectDropdown() {
    projectDropdown.classList.add("hidden");
  }

  function renderProjectDropdown() {
    projectList.innerHTML = "";

    Object.values(projects).forEach(project => {
      const projectItem = document.createElement("button");
      projectItem.className = `project-item ${
        project.id === currentProjectId ? "active" : ""
      }`;

      const projectActions =
        project.id !== "default"
          ? `<span class="project-rename" onclick="event.stopPropagation(); renameProject('${project.id}')">✏️</span>
           <span class="project-delete" onclick="event.stopPropagation(); deleteProject('${project.id}')">🗑️</span>`
          : `<span class="project-rename" onclick="event.stopPropagation(); renameProject('${project.id}')">✏️</span>`;

      projectItem.innerHTML = `
        <span class="project-name">${project.name}</span>
        <span class="project-actions">${projectActions}</span>
      `;

      projectItem.addEventListener("click", () => {
        if (project.id !== currentProjectId) {
          switchProject(project.id);
        }
        hideProjectDropdown();
      });
      projectList.appendChild(projectItem);
    });
  }

  async function handleCreateProject() {
    hideProjectDropdown();

    const projectName = prompt("Enter project name:");
    if (!projectName || !projectName.trim()) {
      return;
    }

    try {
      const newProjectId = await createProject(projectName);
      await switchProject(newProjectId);
      console.log("Created and switched to new project:", projectName);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    }
  }

  async function renameProject(projectId) {
    if (!projects[projectId]) {
      alert("Project not found.");
      return;
    }

    const currentProject = projects[projectId];
    const newName = prompt(
      `Rename project "${currentProject.name}" to:`,
      currentProject.name
    );

    if (!newName || !newName.trim()) {
      return; // User cancelled or entered empty name
    }

    const trimmedName = newName.trim();
    if (trimmedName === currentProject.name) {
      return; // No change needed
    }

    try {
      // Update project name
      projects[projectId].name = trimmedName;
      await saveProjects(projects);

      // Update UI if this is the current project
      if (projectId === currentProjectId) {
        currentProjectName.textContent = trimmedName;
      }

      console.log(`Renamed project ${projectId} to: ${trimmedName}`);

      // Refresh the dropdown to show the new name
      if (!projectDropdown.classList.contains("hidden")) {
        renderProjectDropdown();
      }
    } catch (error) {
      console.error("Failed to rename project:", error);
      alert("Failed to rename project. Please try again.");
    }
  }

  async function deleteProject(projectId) {
    if (projectId === "default") {
      alert("Cannot delete the default project.");
      return;
    }

    const project = projects[projectId];
    if (
      !confirm(
        `Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const wasCurrentProject = projectId === currentProjectId;

      // If deleting the current project, we need to switch to another one first
      if (wasCurrentProject) {
        // Find another project to switch to (prefer default, then any other)
        const availableProjects = Object.keys(projects).filter(
          id => id !== projectId
        );
        let targetProjectId = "default";

        // If we're somehow deleting default (shouldn't happen), pick the first available
        if (projectId === "default" && availableProjects.length > 0) {
          targetProjectId = availableProjects[0];
        } else if (availableProjects.length > 0) {
          // Prefer default, but if it doesn't exist, pick the first available
          targetProjectId = availableProjects.includes("default")
            ? "default"
            : availableProjects[0];
        }

        // If this is the only project, create a new default before deleting
        if (availableProjects.length === 0) {
          projects["default"] = {
            id: "default",
            name: "Default",
            createdAt: new Date().toISOString(),
          };
          await saveProjects(projects);
          targetProjectId = "default";
        }

        // Switch to the target project first
        await switchProject(targetProjectId);
      }

      // Delete project from memory and database
      delete projects[projectId];
      await saveProjects(projects);

      // Also delete all entries for this project
      if (dbReady && db) {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        if (store.indexNames.contains("projectId")) {
          const index = store.index("projectId");
          const request = index.getAllKeys(projectId);

          request.onsuccess = () => {
            const keys = request.result;
            keys.forEach(key => {
              store.delete(key);
            });
          };
        }
      }

      console.log("Deleted project:", project.name);

      if (wasCurrentProject) {
        console.log(`Switched to project: ${projects[currentProjectId].name}`);
      }

      hideProjectDropdown();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    }
  }

  // Close dropdowns when clicking outside
  function handleDocumentClick(event) {
    if (
      !settingsBtn.contains(event.target) &&
      !settingsDropdown.contains(event.target)
    ) {
      hideSettingsDropdown();
    }

    if (
      !projectBtn.contains(event.target) &&
      !projectDropdown.contains(event.target)
    ) {
      hideProjectDropdown();
    }
  }

  // --- Export Functionality ---
  function handleExport() {
    // Close dropdown
    hideSettingsDropdown();

    try {
      // Get all data from localStorage
      const learningEntries = localStorage.getItem("learningEntries");

      // Create export data object
      const exportData = {
        entries: learningEntries ? JSON.parse(learningEntries) : [],
        metadata: {
          exportDate: new Date().toISOString(),
          totalEntries: learningEntries
            ? JSON.parse(learningEntries).length
            : 0,
          totalHours: learningEntries
            ? JSON.parse(learningEntries)
                .reduce((sum, entry) => sum + parseFloat(entry.hours), 0)
                .toFixed(1)
            : "0",
        },
      };

      // Create blob and download
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = `10k-hours-tracker-export-${
        new Date().toISOString().split("T")[0]
      }.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL object
      URL.revokeObjectURL(url);

      console.log("Export completed successfully");

      // Optional: Show success message
      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = '<span class="btn-icon">✅</span> Exported!';
      exportBtn.disabled = true;

      setTimeout(() => {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  }

  // --- Import Functionality ---
  function handleImport() {
    // Close dropdown
    hideSettingsDropdown();
    // Trigger file input click
    importFileInput.click();
  }

  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".json")) {
      alert("Please select a valid JSON file.");
      return;
    }

    try {
      // Show loading state
      const originalText = importBtn.innerHTML;
      importBtn.innerHTML = '<span class="btn-icon">⏳</span> Importing...';
      importBtn.disabled = true;

      // Read file content
      const fileContent = await readFileAsText(file);
      const importData = JSON.parse(fileContent);

      // Validate import data structure
      if (!validateImportData(importData)) {
        throw new Error(
          "Invalid file format. Please select a valid export file."
        );
      }

      // Confirm import (will replace all existing data)
      const confirmMessage = `This will replace all existing data with the imported data.\n\nImport contains:\n- ${
        importData.entries?.length || 0
      } entries\n- ${
        importData.metadata?.totalHours || 0
      } total hours\n\nAre you sure you want to continue?`;

      if (!confirm(confirmMessage)) {
        // Reset button state
        importBtn.innerHTML = originalText;
        importBtn.disabled = false;
        importFileInput.value = ""; // Clear file input
        return;
      }

      // Import entries
      entries = importData.entries.map(entry => ({
        date: entry.date,
        description: entry.description,
        hours: parseFloat(entry.hours),
        notes: entry.notes,
      }));

      // Save entries to IndexedDB
      await saveEntries();

      // Import settings if available
      if (importData.settings) {
        await saveSettings(importData.settings);
        // Apply dark mode setting immediately
        if (importData.settings.darkMode !== undefined) {
          darkMode = importData.settings.darkMode;
          setTheme(darkMode);
        }
      }

      // Refresh the UI
      renderAll();

      console.log("Import completed successfully:", {
        entriesImported: entries.length,
        totalHours: entries.reduce((sum, entry) => sum + entry.hours, 0),
      });

      // Show success message
      importBtn.innerHTML = '<span class="btn-icon">✅</span> Imported!';

      setTimeout(() => {
        importBtn.innerHTML = originalText;
        importBtn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("Import failed:", error);
      alert(`Failed to import data: ${error.message}`);

      // Reset button state
      const originalText = importBtn.innerHTML;
      importBtn.innerHTML = originalText;
      importBtn.disabled = false;
    } finally {
      // Clear file input
      importFileInput.value = "";
    }
  }

  // Helper function to read file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  // Helper function to validate import data structure
  function validateImportData(data) {
    // Check if data has the expected structure
    if (!data || typeof data !== "object") {
      return false;
    }

    // Check if entries array exists and is valid
    if (!Array.isArray(data.entries)) {
      return false;
    }

    // Validate each entry has required fields
    for (const entry of data.entries) {
      if (
        !entry.date ||
        !entry.description ||
        typeof entry.hours !== "number"
      ) {
        return false;
      }
    }

    return true;
  }

  // --- Initialization ---
  function renderAll() {
    // Only render main view components if not editing
    if (currentlyEditingIndex === null) {
      renderTable();
      renderProgress();
      renderChart();
    } else {
      // If somehow renderAll is called while editing, just ensure table is updated
      // This might happen if an error occurs during save/cancel
      renderTable();
    }
  }

  // --- Event Listeners ---
  form.addEventListener("submit", handleAddEntry);
  showAddFormBtn.addEventListener("click", showAddEntryForm);
  cancelAddFormBtn.addEventListener("click", hideAddEntryForm);
  settingsBtn.addEventListener("click", toggleSettingsDropdown);
  projectBtn.addEventListener("click", toggleProjectDropdown);
  createProjectBtn.addEventListener("click", handleCreateProject);
  importBtn.addEventListener("click", handleImport);
  importFileInput.addEventListener("change", handleFileImport);
  exportBtn.addEventListener("click", handleExport);
  chartTypeToggle.addEventListener("change", handleChartTypeToggle);
  saveNoteBtn.addEventListener("click", handleSaveNote);
  cancelEditBtn.addEventListener("click", handleCancelEdit);

  // Close dropdowns when clicking outside
  document.addEventListener("click", handleDocumentClick);

  // Theme toggle event listener
  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      setTheme(themeToggle.checked);
    });
  }

  // Initialize the application
  async function initializeApp() {
    try {
      // Initialize IndexedDB first
      await initDB();

      // Load projects
      projects = await loadProjects();

      // Ensure default project exists and save if needed
      if (!projects["default"]) {
        projects["default"] = {
          id: "default",
          name: "Default",
          createdAt: new Date().toISOString(),
        };
        await saveProjects(projects);
      }

      // Load settings and apply theme
      const settings = await loadSettings();
      darkMode = settings.darkMode;
      currentProjectId = settings.currentProject || "default";

      // Ensure current project exists
      if (!projects[currentProjectId]) {
        currentProjectId = "default";
        await saveSettings({
          darkMode: darkMode,
          currentProject: currentProjectId,
        });
      }

      // Update UI
      currentProjectName.textContent = projects[currentProjectId].name;
      setTheme(darkMode);

      // Migrate legacy data to default project if needed
      await migrateLegacyData();

      // Load entries for current project
      await loadEntries();

      // Show main view and render
      showMainView();
      renderAll();

      console.log(
        "10k Hours Tracker initialized successfully with multi-project support."
      );
    } catch (error) {
      console.error("Failed to initialize app:", error);
      alert(
        "Failed to initialize the application. Some features may not work properly."
      );

      // Fallback: continue with empty data
      entries = [];
      showMainView();
      renderAll();
    }
  }

  // Migrate legacy data (entries without projectId) to default project
  async function migrateLegacyData() {
    if (!dbReady || !db) return;

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Check if we have the projectId index
    if (!store.indexNames.contains("projectId")) {
      return; // No migration needed for very old versions
    }

    const request = store.getAll();

    request.onsuccess = () => {
      const allEntries = request.result || [];
      let migrationNeeded = false;

      allEntries.forEach(entry => {
        if (!entry.projectId) {
          entry.projectId = "default";
          migrationNeeded = true;
          store.put(entry);
        }
      });

      if (migrationNeeded) {
        console.log("Migrated legacy entries to default project");
      }
    };
  }

  // Start the application
  initializeApp();

  // Make project functions globally accessible for inline onclick
  window.renameProject = renameProject;
  window.deleteProject = deleteProject;

  // Handle clicks on table cells for inline editing
  function handleCellClick(event) {
    const cell = event.currentTarget;
    const field = cell.getAttribute("data-field");
    const index = parseInt(cell.getAttribute("data-index"), 10);

    if (isNaN(index) || index < 0 || index >= entries.length) {
      console.error(
        "Invalid index for cell editing:",
        cell.getAttribute("data-index")
      );
      return;
    }

    // Get the current value from the entry
    const entry = entries[index];

    // Don't create editor if already editing this cell
    if (cell.querySelector("input, textarea")) {
      return;
    }

    // Handle different field types
    switch (field) {
      case "date":
        createDateEditor(cell, entry, index);
        break;
      case "description":
        createTextEditor(cell, entry, index, "description");
        break;
      case "hours":
        createNumberEditor(cell, entry, index);
        break;
      case "notes":
        // For notes, we'll use the full editor view
        handleEditNoteClick({
          target: document.querySelector(`.edit-btn[data-index="${index}"]`),
          preventDefault: () => {}, // Add a dummy preventDefault method
          stopPropagation: () => {}, // Add a dummy stopPropagation method
        });
        break;
      default:
        break;
    }
  }

  function createTextEditor(cell, entry, index, field) {
    const currentValue = entry[field];

    // Store original content for cancellation
    const originalContent = cell.innerHTML;

    // Create input element
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentValue;
    input.className = "inline-edit-input";

    // Clear cell and add input
    cell.innerHTML = "";
    cell.appendChild(input);

    // Focus the input
    input.focus();

    // Handle save on blur and enter key
    input.addEventListener("blur", () =>
      saveInlineEdit(cell, input, index, field, originalContent)
    );
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        saveInlineEdit(cell, input, index, field, originalContent);
      } else if (e.key === "Escape") {
        cancelInlineEdit(cell, originalContent);
      }
    });
  }

  function createNumberEditor(cell, entry, index) {
    const currentValue = entry.hours;

    // Store original content for cancellation
    const originalContent = cell.innerHTML;

    // Create input element
    const input = document.createElement("input");
    input.type = "number";
    input.value = currentValue;
    input.step = "0.1";
    input.min = "0.1";
    input.className = "inline-edit-input";

    // Clear cell and add input
    cell.innerHTML = "";
    cell.appendChild(input);

    // Focus the input
    input.focus();

    // Handle save on blur and enter key
    input.addEventListener("blur", () =>
      saveInlineEdit(cell, input, index, "hours", originalContent)
    );
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        saveInlineEdit(cell, input, index, "hours", originalContent);
      } else if (e.key === "Escape") {
        cancelInlineEdit(cell, originalContent);
      }
    });
  }

  function createDateEditor(cell, entry, index) {
    const currentValue = entry.date;

    // Store original content for cancellation
    const originalContent = cell.innerHTML;

    // Create input element
    const input = document.createElement("input");
    input.type = "date";
    input.value = currentValue;
    input.className = "inline-edit-input";

    // Clear cell and add input
    cell.innerHTML = "";
    cell.appendChild(input);

    // Focus the input
    input.focus();

    // Handle save on blur and enter key
    input.addEventListener("blur", () =>
      saveInlineEdit(cell, input, index, "date", originalContent)
    );
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        saveInlineEdit(cell, input, index, "date", originalContent);
      } else if (e.key === "Escape") {
        cancelInlineEdit(cell, originalContent);
      }
    });
  }

  function saveInlineEdit(cell, input, index, field, originalContent) {
    const newValue = input.value.trim();

    // Validate input based on field type
    if (field === "hours") {
      const numValue = parseFloat(newValue);
      if (isNaN(numValue) || numValue <= 0) {
        alert("Please enter a valid positive number for hours.");
        input.focus();
        return;
      }
      entries[index].hours = numValue;
    } else if (field === "description" && newValue === "") {
      alert("Description cannot be empty.");
      input.focus();
      return;
    } else {
      entries[index][field] = newValue;
    }

    // Save changes
    saveEntries()
      .then(() => {
        // Refresh the table to show updated values
        renderAll();
      })
      .catch(err => {
        console.error("Failed to save inline edit:", err);
        alert("Failed to save changes. Please try again.");
        // Refresh to restore original values
        renderAll();
      });
  }

  function cancelInlineEdit(cell, originalContent) {
    // Restore original content
    cell.innerHTML = originalContent;
  }
});
