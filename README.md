## Project Overview

This is a static website for Karayogam, a cultural and social group based in Munich. The site is a simple, minimal HTML/CSS/JavaScript website with no build process or package manager dependencies.
Keep it simple and stupid (KISS)

## Architecture

- **Static HTML Site**: Pure HTML, CSS, and vanilla JavaScript
- **File Structure**:
  - `index.html` - Main landing page with interactive reveal feature
  - `events/index.html` - Events listing page
  - `style.css` - Global styles with mobile responsiveness
  - `script.js` - Simple JavaScript for interactive elements
  - `images/` - Logo and favicon assets
  - `CNAME` - GitHub Pages domain configuration (karayogam.de)

## Development

Since this is a static site with no build process:

- **No package.json or build commands** - Files are served directly
- **No testing framework** - Manual testing in browser
- **No linting setup** - Code follows basic web standards
- **Deployment**: Hosted on GitHub Pages with custom domain

## Key Features

- **Interactive reveal**: Click "What is Karayogam?" to show hidden message
- **Mobile responsive**: Optimized for mobile devices with media queries
- **Dark theme**: Custom dark color scheme with hover effects
- **Bilingual text**: Malayalam and Tamil scripts alongside English

## Making Changes

- Edit HTML, CSS, or JS files directly
- Test by opening `index.html` in a browser or using local server
- Changes are deployed automatically via GitHub Pages when pushed to master branch
- The site uses absolute paths (`/style.css`, `/images/`) for GitHub Pages compatibility

## Local Development

- **Start local server**: `python3 -m http.server 8000`
- **View site**: Navigate to `http://localhost:8000`
- **Stop server**: Use Ctrl+C or kill the background process
