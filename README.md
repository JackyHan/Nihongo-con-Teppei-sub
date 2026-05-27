# Nihongo con Teppei Player Export

This directory contains only the static web player files needed for a separate GitHub Pages repository.

## Contents

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`
- `data/episodes.json`
- `data/1519.json`
- `.github/workflows/deploy-pages.yml`

## What to do next

1. Create a new GitHub repository for the web player only.
2. Copy the contents of this directory into that repository root.
3. Push to the `main` branch.
4. In GitHub, enable Pages for the repository if needed.

The included workflow is already prepared to deploy the static site from the repository to GitHub Pages.

## Note about audio

The player currently uses the original remote podcast audio URL.
When served over HTTPS, the web app will automatically try the HTTPS version of that audio URL to avoid mixed-content blocking.
