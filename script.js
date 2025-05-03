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
        '<tr><td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No entries yet. Add one above!</td></tr>';
      return;
    }

    // Sort entries by date descending for display
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedEntries.forEach((entry, index) => {
      const row = document.createElement("tr");
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button class="text-red-600 hover:text-red-900 delete-btn" data-index="${entries.findIndex(
                      e => e === entry
                    )}">Delete</button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach(button => {
      button.addEventListener("click", handleDeleteEntry);
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

  // --- Event Handlers ---
  function handleAddEntry(event) {
    event.preventDefault(); // Prevent page reload

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

    const newEntry = { date, description, hours };
    entries.push(newEntry);

    console.log("Added new entry:", newEntry);

    saveEntries();
    renderAll();

    // Clear form
    descriptionInput.value = "";
    hoursInput.value = "";
    dateInput.value = "";
    descriptionInput.focus(); // Set focus back to description
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

    // Confirmation dialog
    const entryToDelete = entries[indexToDelete];
    if (
      confirm(
        `Are you sure you want to delete the entry for "${entryToDelete.description}" on ${entryToDelete.date}?`
      )
    ) {
      console.log("Deleting entry at index:", indexToDelete, entryToDelete);
      entries.splice(indexToDelete, 1); // Remove the entry from the array
      saveEntries();
      renderAll(); // Re-render everything
    }
  }

  // --- Initialization ---
  function renderAll() {
    renderTable();
    renderProgress();
    renderChart();
  }

  form.addEventListener("submit", handleAddEntry);

  loadEntries();
  renderAll(); // Initial render on page load

  console.log("10k Hours Tracker initialized.");
});
