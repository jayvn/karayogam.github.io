# Karayogam Website

Website for Karayogam, a cultural and social group in Munich.

Live at: [karayogam.de](https://karayogam.de)

## What's Inside

### Main Site
Static HTML/CSS/JS website with information about Karayogam.

**Features:**
- Interactive landing page
- Events listing
- Mobile responsive
- Dark theme
- Bilingual content (Malayalam, Tamil, English)

### ChoreoMarker (`/choreo/`)
Vanilla JavaScript PWA for marking choreography during dance rehearsals.

📖 **Full documentation:** [choreo/README.md](choreo/README.md)

## Development

### Main Site
```bash
# Start local server
python3 -m http.server 8000

# Edit HTML/CSS/JS directly
# Push to master → auto-deploys
```

### ChoreoMarker
```bash
cd choreo
python3 -m http.server 8000

# Edit app.js directly
# Push to master → auto-deploys
```

See [choreo/README.md](choreo/README.md) for details.

## Deployment

Automated via GitHub Actions - just push to master:
- Main site files → deployed as-is
- Choreo app → deployed as-is (no build step)

## File Structure

```
├── index.html           # Landing page
├── events/             # Events page
├── style.css           # Styles
├── script.js           # Interactions
├── images/             # Assets
└── choreo/             # ChoreoMarker app
    └── README.md       # Full documentation
```
