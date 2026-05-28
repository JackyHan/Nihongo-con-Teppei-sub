# Nihongo con Teppei Player

Fan-made web player for studying with **Nihongo con Teppei** in a more readable way.

This site lets you:

- play podcast episodes in the browser
- read synchronized subtitles while listening
- view **Japanese + English + Simplified Chinese** together
- toggle **furigana** on and off
- browse episodes with a simple study-friendly interface

## What This Is

This repository contains the static website used for the public player.

It is designed for learners who want a lightweight way to:

- listen to an episode
- follow along with subtitles
- review Japanese line by line

The audio is loaded from the original podcast source, and the subtitle data is generated separately with a local transcription and translation pipeline.

## Features

- synchronized trilingual subtitles
- furigana toggle
- episode list with pagination
- mobile-friendly layout
- direct link back to each original episode page

## Live Site

If GitHub Pages is enabled for this repository, the player is available from the repository's Pages URL.

## Local Development

This is a static site, so you can run it locally with a simple HTTP server.

From this repository:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000
```

## Repository Structure

- `index.html`
  Main page structure
- `styles.css`
  Layout and visual styling
- `app.js`
  Audio sync, episode loading, pagination, and subtitle behavior
- `data/episodes.json`
  Episode catalog used by the sidebar
- `data/*.json`
  Per-episode subtitle payloads

## Updating Episode Data

New episode subtitle files are generated outside this repository and then committed into `data/`.

Each episode JSON contains:

- episode id
- title
- source page URL
- audio URL
- timestamped subtitle entries

## Notes

- This is an unofficial study tool.
- The player interface is intentionally simple and focused on listening + reading.
- Some subtitle or translation lines may still contain small recognition artifacts because the content is produced through an automated local pipeline.
