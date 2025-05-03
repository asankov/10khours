# 10,000 Hours Tracker

A simple single-page application to track time spent learning a topic, aiming for the 10,000-hour mastery goal.

## Features

- Log learning sessions with date, description, and hours spent.
- Visualizes cumulative progress over time with a line chart (using Chart.js).
- Displays total hours logged and percentage completion towards the 10k goal.
- Shows a table of all logged entries, sorted by most recent first.
- Allows deleting individual entries.
- Persists data using the browser's local storage.
- Styled with Tailwind CSS.

## Setup

No build process needed. Simply open the `index.html` file in your web browser.

## Deployment to GitHub Pages

1.  **Create a GitHub Repository:** If you haven't already, create a new repository on GitHub to host your project.
2.  **Push Code:** Add the `index.html` and `script.js` files to the repository and push them.
3.  **Enable GitHub Pages:**
    - Go to your repository's **Settings** tab.
    - Navigate to the **Pages** section in the left sidebar.
    - Under **Source**, select the branch you pushed your code to (e.g., `main`).
    - Choose the `/ (root)` folder.
    - Click **Save**.
4.  **Access Your Site:** GitHub will provide a URL (usually `https://<your-username>.github.io/<repository-name>/`) where your live tracker will be accessible. It might take a minute or two to deploy initially.

## How it Works

- **HTML (`index.html`):** Defines the structure of the page, including the chart canvas, form, table, and progress bar. Includes CDN links for Tailwind CSS and Chart.js.
- **JavaScript (`script.js`):** Handles all the logic:
  - Loading and saving entries to local storage (`localStorage`).
  - Handling form submissions to add new entries.
  - Handling button clicks to delete entries.
  - Rendering the table with entries.
  - Calculating total hours and updating the progress bar.
  - Generating and updating the progress chart using Chart.js.
- **Styling:** Primarily uses utility classes from Tailwind CSS for a clean look.
