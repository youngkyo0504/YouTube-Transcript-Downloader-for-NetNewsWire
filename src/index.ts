import {
  extractVideoId,
  getVideoTranscript,
  sanitizeFilename,
} from "./fetch-youtube-script";
import { red, blue, bold, green, cyan } from "yoctocolors";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { getTodayArticles } from "./article";
import { summarizeTranscript } from "./summarize";
import yoctoSpinner from "yocto-spinner";

try {
  const todayYoutubes = getTodayArticles().filter(
    (article) =>
      article.url.includes("youtube.com") &&
      !article.url.includes("https://www.youtube.com/shorts")
  );
  const downloadsFolder = path.join(os.homedir(), "Documents/youtube-script");

  for (const youtube of todayYoutubes) {
    const videoId = extractVideoId(youtube.url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid URL.");
    }

    const transcriptSpinner = yoctoSpinner({
      text: cyan(`Fetching transcript for "${youtube.title}"`),
    }).start();

    const { transcript, title } = await getVideoTranscript(videoId, "en");

    transcriptSpinner.success(
      green(`Transcript fetched for "${youtube.title}"`)
    );

    // Create filename and save
    const sanitizedTitle = sanitizeFilename(title);

    const filename = path.join(
      downloadsFolder,
      `${sanitizedTitle}_transcript.txt`
    );
    await fs.writeFile(filename, transcript);

    const summarySpinner = yoctoSpinner({
      text: cyan(`Generating summary for "${youtube.title}"`),
    }).start();

    const summary = await summarizeTranscript(transcript);

    await fs.writeFile(
      path.join(downloadsFolder, `${sanitizedTitle}_summary.txt`),
      summary
    );

    summarySpinner.success(green(`Summary generated for "${youtube.title}"`));
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(errorMessage);
}
