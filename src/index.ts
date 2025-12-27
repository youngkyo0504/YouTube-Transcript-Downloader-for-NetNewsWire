import {
  extractVideoId,
  getVideoTranscript,
  sanitizeFilename,
} from "./fetch-youtube-script";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { getTodayArticles } from "./article";

try {
  const todayYoutubes = getTodayArticles().filter(
    (article) =>
      article.url.includes("youtube.com") &&
      !article.url.includes("https://www.youtube.com/shorts")
  );
  const downloadsFolder = path.join(os.homedir(), "Downloads");

  for (const youtube of todayYoutubes) {
    const videoId = extractVideoId(youtube.url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid URL.");
    }
    const { transcript, title } = await getVideoTranscript(videoId, "en");
    // Create filename and save
    const sanitizedTitle = sanitizeFilename(title);
    const filename = path.join(
      downloadsFolder,
      `${sanitizedTitle}_transcript.txt`
    );
    await fs.writeFile(filename, transcript);
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const title = errorMessage.includes("yt-dlp")
    ? "yt-dlp not found"
    : "Failed to fetch transcript";
  console.error(title);
}
