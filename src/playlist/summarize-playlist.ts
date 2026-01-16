import {
  getPlaylistTranscripts,
  sanitizeFilename,
} from "../fetch-youtube-script";
import { summarizeTranscript } from "../summarize";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

const PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLNG_1j3cPCaZ-pYFoA9WUwDgvMmVUi1eu";

async function main() {
  const videosWithTranscript = (
    await getPlaylistTranscripts(PLAYLIST_URL)
  ).filter((video) => !video.title.includes("interview"));

  const downloadsFolder = path.join(os.homedir(), "Documents/youtube-script");

  for (const video of videosWithTranscript) {
    if (video.transcript === null) {
      continue;
    }

    const summary = await summarizeTranscript(video.transcript);
    const sanitizedTitle = sanitizeFilename(video.title);

    console.log(sanitizedTitle);

    await fs.writeFile(
      path.join(downloadsFolder, `${sanitizedTitle}_summary.txt`),
      summary
    );

    await fs.writeFile(
      path.join(downloadsFolder, `${sanitizedTitle}_transcript.txt`),
      video.transcript
    );
  }
}

main();
