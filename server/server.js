// VidGrab server — a tiny yt-dlp wrapper you deploy on your own account.
// Endpoints:
//   GET /health
//   GET /api/info?url=<video page URL>          -> title, thumbnail, duration, formats
//   GET /api/download?url=<...>&format=<id|best> -> streams the file as an attachment
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const ALLOWED = /(youtube\.com|youtu\.be|twitter\.com|x\.com|tiktok\.com|facebook\.com|fb\.watch|instagram\.com)/i;
function validUrl(u) {
  try { const x = new URL(u); return (x.protocol === "https:" || x.protocol === "http:") && ALLOWED.test(x.hostname + x.pathname); }
  catch { return false; }
}
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("yt-dlp", args, { shell: false });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err.slice(-300) || "yt-dlp failed"))));
  });
}

app.get("/health", (req, res) => res.json({ ok: true, service: "vidgrab" }));

app.get("/api/info", async (req, res) => {
  const url = req.query.url || "";
  if (!validUrl(url)) return res.status(400).json({ ok: false, error: "Unsupported or invalid URL" });
  try {
    const raw = await runYtDlp(["-j", "--no-warnings", "--no-playlist", url]);
    const info = JSON.parse(raw);
    const formats = (info.formats || [])
      .filter((f) => f.vcodec && f.vcodec !== "none" && f.ext === "mp4")
      .map((f) => ({
        id: f.format_id,
        label: `${f.height ? f.height + "p" : f.format_note || "video"} MP4${f.filesize || f.filesize_approx ? " · ~" + Math.round((f.filesize || f.filesize_approx) / 1048576) + " MB" : ""}${f.acodec && f.acodec !== "none" ? " · with audio" : " · video only"}`,
        height: f.height || 0,
      }))
      .sort((a, b) => b.height - a.height)
      .slice(0, 6);
    formats.unshift({ id: "best", label: "Best quality (MP4, with audio)" });
    res.json({ ok: true, title: info.title, thumbnail: info.thumbnail, duration: info.duration, formats });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e).slice(0, 200) });
  }
});

app.get("/api/download", (req, res) => {
  const url = req.query.url || "";
  const format = (req.query.format || "best").replace(/[^a-zA-Z0-9+[\]/_-]/g, "");
  if (!validUrl(url)) return res.status(400).json({ ok: false, error: "Unsupported or invalid URL" });
  const fmt = format === "best" ? "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" : format;
  res.setHeader("Content-Disposition", 'attachment; filename="vidgrab.mp4"');
  res.setHeader("Content-Type", "video/mp4");
  const p = spawn("yt-dlp", ["-f", fmt, "--no-warnings", "--no-playlist", "-o", "-", url], { shell: false });
  p.stdout.pipe(res);
  p.stderr.on("data", () => {});
  p.on("error", () => { if (!res.headersSent) res.status(502).json({ ok: false, error: "yt-dlp failed to start" }); });
  req.on("close", () => p.kill("SIGKILL"));
});

app.listen(PORT, () => console.log(`VidGrab server listening on ${PORT}`));
