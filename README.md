# 10,000 Hours Tracker - React Edition

A modern React-based single-page application to track your learning progress toward the 10,000-hour mastery goal. This is a complete rewrite of the original vanilla JavaScript version using React + Vite.

## Features

- **Learning Tracking**: Log learning sessions with date, description, and hours spent
- **Progress Visualization**: Interactive line chart showing cumulative progress over time (Chart.js)
- **Project Management**: Multiple project support with easy project switching
- **Task Management**: TODO list functionality with markdown integration
- **Calendar View**: Monthly calendar showing learning activity
- **Rich Notes**: Markdown editor (EasyMDE) for detailed session notes with smart-link features
- **Data Persistence**: Uses IndexedDB for robust local data storage
- **Dark Mode**: Toggle between light and dark themes
- **Import/Export**: Data backup and restore functionality
- **Responsive Design**: Works great on desktop and mobile

## Technical Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Data visualization
- **EasyMDE** - Markdown editor
- **IndexedDB** - Client-side database
- **GitHub Pages** - Deployment platform

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/10khours.git
   cd 10khours
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Deployment

### GitHub Pages (Automatic)

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

1. **Push to main branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions will automatically:**
   - Install dependencies
   - Build the project
   - Deploy to GitHub Pages

3. **Your site will be available at:**
   `https://yourusername.github.io/10khours/`

### Manual Deployment

If you prefer manual deployment:

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy using gh-pages**
   ```bash
   npm run deploy
   ```

### Other Hosting Platforms

The built files in the `dist/` folder can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your GitHub repository
- **Firebase Hosting**: Use `firebase deploy`
- **AWS S3**: Upload the `dist` contents to an S3 bucket

## Configuration

### Vite Configuration

The base URL is configured for GitHub Pages in `vite.config.js`:

```javascript
export default defineConfig({
  base: '/10khours/', // Change this to match your repository name
  // ... other config
})
```

### Environment Variables

No environment variables are required for basic functionality. All data is stored locally in the browser.

## Project Structure

```
10khours/
├── src/
│   ├── components/          # React components
│   │   ├── Header.jsx       # Header with navigation and settings
│   │   ├── ProgressSection.jsx  # Progress chart and stats
│   │   ├── TabSection.jsx   # Tab container
│   │   ├── EntriesTab.jsx   # Learning entries management
│   │   ├── TasksTab.jsx     # Task management
│   │   ├── CalendarTab.jsx  # Calendar view
│   │   └── NoteEditor.jsx   # Markdown note editor
│   ├── contexts/            # React contexts
│   │   └── AppContext.jsx   # Main application state
│   ├── services/            # Business logic
│   │   └── database.js      # IndexedDB wrapper
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── .github/workflows/      # GitHub Actions
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

## Data Migration

If you're migrating from the vanilla JavaScript version:

1. **Export your data** from the old version using the export feature
2. **Import the data** in the new React version using the import feature
3. The new version will automatically migrate old data structures to the new format

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

IndexedDB support is required for data persistence.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Changelog

### v2.0.0 (React Migration)
- Complete rewrite using React + Vite
- Improved component architecture
- Better state management with React Context
- Enhanced TypeScript support
- Automated deployment with GitHub Actions
- Improved mobile responsiveness

### v1.0.0 (Original)
- Vanilla JavaScript implementation
- Basic functionality for tracking learning hours