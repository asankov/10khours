document.addEventListener("DOMContentLoaded", () => {
  const goalHours = 10000;
  let entries = [];
  let chartInstance = null;
  let useTimeScale = true; // Default to time-based chart

  const form = document.getElementById("add-entry-form");
  const addEntryContainer = document.getElementById("add-entry-form-container");
  const showAddFormBtn = document.getElementById("show-add-form-btn");
  const cancelAddFormBtn = document.getElementById("cancel-add-form-btn");
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

  // Add check for marked library after variable declarations
  console.log(
    "Checking marked library on initial script load:",
    typeof marked,
    marked
  );

  // --- Data Persistence ---
  function loadEntries() {
    const storedEntries = localStorage.getItem("learningEntries");
    if (storedEntries) {
      entries = JSON.parse(storedEntries);
      // Ensure hours are numbers
      entries.forEach(entry => (entry.hours = parseFloat(entry.hours)));
    } else {
      entries = [];
    }
    console.log("Loaded entries:", entries);
  }

  function saveEntries() {
    localStorage.setItem("learningEntries", JSON.stringify(entries));
    console.log("Saved entries:", entries);
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
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
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
            borderColor: "black",
            backgroundColor: "transparent",
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
            borderColor: "black",
            backgroundColor: "transparent",
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
      saveEntries(); // Save to localStorage
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
      saveEntries(); // Save to localStorage
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

    saveEntries();
    showMainView(); // This will also destroy the EasyMDE instance
    renderAll();
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

    saveEntries();
    renderAll();
    hideAddEntryForm();
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
      entries.splice(indexToDelete, 1);
      saveEntries();
      renderAll();
    }
  }

  // Handle chart type toggle
  function handleChartTypeToggle() {
    useTimeScale = chartTypeToggle.checked;
    renderChart();
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

  form.addEventListener("submit", handleAddEntry);
  showAddFormBtn.addEventListener("click", showAddEntryForm);
  cancelAddFormBtn.addEventListener("click", hideAddEntryForm);
  chartTypeToggle.addEventListener("change", handleChartTypeToggle);

  // Add listeners for editor buttons
  saveNoteBtn.addEventListener("click", handleSaveNote);
  cancelEditBtn.addEventListener("click", handleCancelEdit);

  loadEntries();
  showMainView(); // Ensure main view is shown initially
  renderAll(); // Initial render on page load

  console.log("10k Hours Tracker initialized.");

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
    saveEntries();

    // Refresh the table to show updated values
    renderAll();
  }

  function cancelInlineEdit(cell, originalContent) {
    // Restore original content
    cell.innerHTML = originalContent;
  }
});
