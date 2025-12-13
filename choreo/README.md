# ChoreoMarker

ChoreoMarker is a choreography marking tool for dance rehearsals, designed to help dancers and choreographers mark timings and sections during practice sessions.

## Features

- **Audio Playback** - Waveform visualization with timeline scrubbing
- **Dancer Positioning** - Drag-and-drop dancers on a virtual stage
- **Timeline Marking** - Mark movements and notes at specific timestamps
- **Data Persistence** - Auto-saves to local storage (works offline)
  - IndexedDB for audio files (handles files > 10MB)
  - localStorage for dancers, marks, and positions
- **PWA Support** - Installable on mobile devices, works offline
- **Export/Import** - Save and load choreography data as JSON

## Architecture

Built with modern web technologies:
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (CDN in dev, bundled in production)
- **IndexedDB + localStorage** - Client-side data persistence
- **PWA** - Service worker for offline support

## Local Development

### Prerequisites
- Node.js v18+ or Bun
- npm or bun

### Setup and Run

```bash
cd choreo
npm install      # or: bun install
npm run dev      # or: bun run dev
```

Visit `http://localhost:5173/choreo/`

## Deployment

**Fully automated via GitHub Actions** - No manual build or deployment needed.

### How It Works

1. Edit source files in `choreo/src/`
2. Push to master branch
3. GitHub Actions automatically:
   - Installs dependencies
   - Builds the app (`npm run build`)
   - Deploys built files to GitHub Pages
   - Preserves source files for development

### What NOT to Do

❌ Do NOT manually run `npm run build` and copy files
❌ Do NOT copy `dist/*` to `choreo/` root
❌ Do NOT commit built files from `dist/`

The `index.html` in `choreo/` is the **dev template** - keep it in the repo. GitHub Actions generates the production version during deployment.

## File Structure

```
choreo/
├── src/
│   ├── App.jsx          # Main React component with all features
│   └── main.jsx         # React entry point
├── public/              # Static assets
├── dist/                # Built files (git-ignored, CI-generated)
├── index.html           # Dev template (kept in repo)
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite config (base: '/choreo/')
└── README.md            # This file
```

## Storage & Persistence

Data persists across browser sessions (even after closing):

**IndexedDB** (for large files):
- Audio file blobs
- Handles files > 10MB with no issues

**localStorage** (for app data):
- Dancers list
- Bookmarks/marks
- Dancer positions
- Audio filename

**Clear Storage:**
Use the "Clear Storage" button in the app to wipe all saved data.

## Configuration

- **Base Path**: `/choreo/` in `vite.config.js` for GitHub Pages routing
- **Build Output**: `dist/` directory (git-ignored)
- **PWA Manifest**: `manifest.json` for installability
- **Service Worker**: `sw.js` for offline support

## Troubleshooting

**Dev server won't start:**
- Ensure you're using the dev template `index.html` (references `src/main.jsx`)
- Run `npm install` to ensure dependencies are installed

**Data not persisting:**
- Check browser console for storage errors
- Ensure you're not in private/incognito mode
- Storage works in all modern browsers with IndexedDB support

**Build errors in GitHub Actions:**
- Verify `choreo/index.html` is the dev template, not production build
- Check the Actions tab for detailed error logs
