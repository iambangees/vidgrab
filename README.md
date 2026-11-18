# VidGrab

**Paste a link. Keep the video.**

A video downloader for YouTube, X, TikTok, Facebook and Instagram links — built the honest way: the web page is only a front-end; the fetching is done by a **small server you deploy on your own account**, so your downloads never pass through ad-stuffed third-party downloader sites.

## Why a server at all?

Browsers cannot pull video files from those platforms directly (signed URLs + CORS). Every "paste link, download" site is quietly running a server — usually someone else's, monetised with ads and who-knows-what logging. VidGrab gives you your own.

## Parts

- `site/` — the static page (GitHub Pages). Paste a link → it asks your server what's available → download buttons stream the file from your server. The server address is set once in the page's settings card and remembered in your browser.
- `server/` — a tiny Node server wrapping [yt-dlp](https://github.com/yt-dlp/yt-dlp):
  - `GET /health`
  - `GET /api/info?url=…` → title, thumbnail, duration, MP4 format list
  - `GET /api/download?url=…&format=…` → streams the file as an attachment
  - URL allowlist (the five platforms), no shell interpolation, arguments passed as an array.

## Deploy the server (about 10 minutes, free tier works)

**Render:** New → Web Service → connect this repo → root directory `server` → environment **Docker** → create. When it's live, copy its `https://…onrender.com` address into the VidGrab page's server card and save.

**Railway:** New Project → Deploy from repo → set root directory to `server` (it picks up the Dockerfile) → copy the public URL into the page.

**Your own machine/VPS:** `docker build -t vidgrab server/ && docker run -p 3000:3000 vidgrab`, or `cd server && npm install && node server.js` with `yt-dlp` and `ffmpeg` installed.

## Fair use

Only download videos you own, that are licensed for keeping (Creative Commons, public domain, your own uploads), or where the platform offers saving. Respect creators and each platform's terms.
