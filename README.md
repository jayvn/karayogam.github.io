# Karayogam Website

Website for Karayogam, a cultural and social group in Munich.

Live at: [karayogam.de](https://karayogam.de)

## What's Inside

### Main Site
Modern, modular website with shared navigation system.

**Features:**
- Modern responsive navigation bar
- Interactive landing page with app gallery
- Events listing
- Mobile responsive with hamburger menu
- Dark theme
- Bilingual content (Malayalam, Tamil, English)
- Modular architecture for easy app additions

### Apps

**ChoreoMarker** (`/choreo/`)
Vanilla JavaScript PWA for marking choreography during dance rehearsals.
📖 [Full documentation](choreo/README.md)

**Anil's Library** (`/anils-library/`)
Plasma Physics Calculator with real-time visualizations for lab work.

**Shopping List** (`/shopping/`)
Simple offline PWA for managing shopping lists by category.

## Development

### Quick Start
```bash
# Start local server
python3 -m http.server 8000

# Visit http://localhost:8000
```

### Adding a New App

1. **Copy a template:**
   ```bash
   cp _templates/html-app-template.html my-app/index.html
   # or
   cp _templates/react-app-template.html my-app/index.html
   ```

2. **Edit the app** - Add your content, styles, and logic

3. **Add to homepage** - Edit `index.html`, add app card to `#apps` section

4. **Update navigation** (optional) - Edit `shared/nav.js`, add to apps array

📖 **Full guide:** [_templates/README.md](_templates/README.md)

### Navigation System

**Shared Components:**
- `/shared/nav.js` - Navigation component (auto-injected)
- `/shared/nav.css` - Navigation styles

**Features:**
- Sticky header with brand logo
- Responsive mobile menu
- Dropdown for apps
- Optional - apps can work standalone

**Usage:**
```html
<!-- In your HTML head -->
<link rel="stylesheet" href="/shared/nav.css">

<!-- Before closing body tag -->
<script src="/shared/nav.js"></script>
```

## Deployment

Automated via GitHub Actions - just push to master:
- All files deployed as-is (no build step)
- PWAs work offline after first visit
- Navigation updates automatically

## File Structure

```
├── index.html              # Landing page with app gallery
├── events/                 # Events page
├── shared/                 # 🆕 Shared components
│   ├── nav.js             # Navigation component
│   └── nav.css            # Navigation styles
├── _templates/            # 🆕 App templates
│   ├── README.md          # Guide to adding apps
│   ├── html-app-template.html
│   └── react-app-template.html
├── style.css              # Main site styles
├── script.js              # Main site interactions
├── images/                # Shared assets
├── shopping/              # 🆕 Shopping List PWA
│   ├── index.html
│   └── sw.js
├── choreo/                # ChoreoMarker PWA
│   ├── index.html
│   ├── app.js
│   ├── sw.js
│   └── README.md
└── anils-library/         # Plasma Physics Calculator
    ├── index.html
    ├── sw.js
    └── manifest.json
```

## Architecture

### Modular Design
- **Each app is self-contained** in its own folder
- **Navigation is optional** - apps work standalone
- **No build step required** - paste HTML/React and go
- **Shared navigation** provides consistent UX

### Adding Custom Apps
The site is designed for easy app additions:

1. **Vanilla HTML/JS** - Just paste and edit
2. **React (CDN)** - Single-file React apps via Babel
3. **External apps** - Paste build output from Vite/CRA
4. **PWAs** - Add manifest + service worker for offline

### Best Practices
- Keep apps in separate folders (`/my-app/`)
- Use templates from `/_templates/`
- Test standalone before adding navigation
- Update both homepage gallery and nav dropdown
- Use absolute paths for shared resources (`/shared/`, `/images/`)

## Examples

**Simple HTML app:**
```html
<!-- my-app/index.html -->
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="/shared/nav.css">
</head>
<body>
    <h1>My App</h1>
    <!-- Your content -->
    <script src="/shared/nav.js"></script>
</body>
</html>
```

**React app (single file):**
See `_templates/react-app-template.html`

---

📖 **New to the project?** Start with [_templates/README.md](_templates/README.md)
