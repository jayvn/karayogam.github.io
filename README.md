## Project Overview

Karayogam website for a cultural and social group in Munich. The project has two parts:
1. **Main site** - Static HTML/CSS/JS (KISS principle)
2. **ChoreoMarker** - React PWA for choreography marking

## Architecture

### Main Site (Static)
- Pure HTML, CSS, vanilla JavaScript
- No build process or dependencies
- Files served directly from repository

### ChoreoMarker App (`/choreo/`)
- React 18 PWA for choreography marking
- See [choreo/README.md](choreo/README.md) for details

### File Structure
```
├── index.html              # Landing page
├── events/index.html       # Events listing
├── style.css, script.js    # Styles and interactions
├── images/                 # Assets
├── CNAME                   # Domain config (karayogam.de)
└── choreo/                 # React app (see choreo/README.md)
```

## Development Workflow

### Main Site
Edit HTML/CSS/JS directly:
```bash
python3 -m http.server 8000  # Local testing
# Push to master → auto-deploys
```

### ChoreoMarker App
See [choreo/README.md](choreo/README.md) for full details.

**Quick start:**
```bash
cd choreo
npm install && npm run dev
```

**Deployment:** Fully automated via GitHub Actions - just push to master.

## Key Features

**Main Site:**
- Interactive reveal ("What is Karayogam?")
- Mobile responsive
- Dark theme
- Bilingual text (Malayalam, Tamil, English)

**ChoreoMarker:**
- Choreography marking tool for dance rehearsals
- PWA with offline support and data persistence
- See [choreo/README.md](choreo/README.md) for full feature list

## Deployment

**Automated via GitHub Actions** (`.github/workflows/deploy-choreo.yml`):
- Triggers on push to master
- Builds choreo app in CI
- Deploys entire site to GitHub Pages
- Main site files copied as-is
- Choreo app built and deployed from `dist/`

**Manual intervention NOT needed** - Just push your changes.

## Local Development

**Main Site:**
```bash
python3 -m http.server 8000
# or use any static file server
```

**ChoreoMarker:**
```bash
cd choreo
bun run dev  # or npm run dev
```

**View:**
- Main site: `http://localhost:8000`
- Choreo app: `http://localhost:5173/choreo/`
