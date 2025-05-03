document.addEventListener("DOMContentLoaded", () => {
  const goalHours = 10000;
  let entries = [];
  let chartInstance = null;

  const form = document.getElementById("add-entry-form");
  const descriptionInput = document.getElementById("description");
  const hoursInput = document.getElementById("hours");
  const dateInput = document.getElementById("date");
  const tableBody = document.getElementById("entries-tbody");
  const totalHoursDisplay = document.getElementById("total-hours");
  const progressBar = document.getElementById("progress-bar");
  const chartCanvas = document
    .getElementById("progress-chart")
    .getContext("2d");

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
        '<tr><td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No entries yet. Add one above!</td></tr>';
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
        const snippet =
          firstLine.substring(0, 50) +
          (firstLine.length > 50 || split.length > 1 ? "..." : "");
        // Basic escaping to prevent raw HTML in table
        const escapedSnippet = snippet
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        notesPreviewHtml = `<span class="font-mono text-xs">${escapedSnippet}</span>`;
      }

      row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                  entry.date
                }</td>
                <td class="px-6 py-4 whitespace-wrap text-sm text-gray-700">${
                  entry.description
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${entry.hours.toFixed(
                  1
                )}</td>
                <td class="px-6 py-4 whitespace-wrap text-sm text-gray-600">${notesPreviewHtml}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button class="text-indigo-600 hover:text-indigo-900 edit-btn" data-index="${originalIndex}">Edit Notes</button>
                    <button class="text-red-600 hover:text-red-900 delete-btn" data-index="${originalIndex}">Delete</button>
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
  }

  function renderProgress() {
    console.log("Rendering progress...");
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const percentage = Math.min((totalHours / goalHours) * 100, 100);

    totalHoursDisplay.textContent = totalHours.toFixed(1);
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage.toFixed(1)}%`; // Optional: show text on bar
    progressBar.classList.toggle("text-white", percentage > 10); // Make text visible on darker bar
    progressBar.classList.toggle("text-xs", true);
    progressBar.classList.toggle("text-center", true);
    progressBar.classList.toggle("font-medium", true);

    console.log(`Total hours: ${totalHours}, Percentage: ${percentage}%`);
  }

  function renderChart() {
    console.log("Rendering chart...");
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

    sortedDates.forEach(date => {
      runningTotal += dailyHours[date];
      labels.push(date);
      cumulativeHoursData.push(runningTotal);
    });

    if (chartInstance) {
      chartInstance.destroy(); // Destroy previous chart instance
    }

    chartInstance = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Cumulative Hours Spent",
            data: cumulativeHoursData,
            borderColor: "rgb(79, 70, 229)", // Indigo
            backgroundColor: "rgba(79, 70, 229, 0.1)",
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
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
        maintainAspectRatio: true, // Adjust as needed
      },
    });
    console.log("Chart rendered.");
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
    const indexToEdit = parseInt(event.target.getAttribute("data-index"), 10);
    if (
      isNaN(indexToEdit) ||
      indexToEdit < 0 ||
      indexToEdit >= entries.length
    ) {
      console.error(
        "Invalid index for editing notes:",
        event.target.getAttribute("data-index")
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

  // --- Event Handlers ---
  function handleAddEntry(event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const hours = parseFloat(hoursInput.value);
    const selectedDate = dateInput.value;
    const date = selectedDate
      ? selectedDate
      : new Date().toISOString().split("T")[0];
    // Note: We removed the direct notes input from this form

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

    descriptionInput.value = "";
    hoursInput.value = "";
    dateInput.value = "";
    descriptionInput.focus();
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
  // Add listeners for editor buttons (textarea listener removed)
  saveNoteBtn.addEventListener("click", handleSaveNote);
  cancelEditBtn.addEventListener("click", handleCancelEdit);

  loadEntries();
  showMainView(); // Ensure main view is shown initially
  renderAll(); // Initial render on page load

  console.log("10k Hours Tracker initialized.");
});
