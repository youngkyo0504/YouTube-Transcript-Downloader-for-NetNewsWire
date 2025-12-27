# YouTube Transcript Downloader for NetNewsWire

A tool that automatically identifies YouTube videos from your "read" list in NetNewsWire (RSS Reader) for the current day, extracts their transcripts, and saves them as text files.

## Key Features

- **NetNewsWire Integration**: Reads recent articles directly from the local SQLite database.
- **YouTube Filtering**: Selects only YouTube links from your articles (excludes Shorts).
- **Transcript Extraction**: Uses `yt-dlp` to download auto-generated captions (default: English).
- **Text Conversion**: Converts VTT subtitle formats into readable plain text.
- **Auto-Save**: Saves the extracted transcripts to your `~/Downloads` folder with the filename format `[Video_Title]_transcript.txt`.

## Prerequisites

To run this project, you need the following tools installed:

1. **Bun**: JavaScript/TypeScript runtime

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **yt-dlp**: YouTube download tool

   ```bash
   brew install yt-dlp
   ```

   (If you don't use Homebrew, check the [yt-dlp official repository](https://github.com/yt-dlp/yt-dlp))

3. **NetNewsWire (macOS)**: RSS Reader App
   - This script is hardcoded to look for the NetNewsWire iCloud sync database path on macOS (`~/Library/Containers/...`).

## Installation & Usage

1. Clone the repository and install dependencies

   ```bash
   git clone <repository-url>
   cd summarize-article
   bun install
   ```

2. Run the script
   ```bash
   bun start
   ```

## Environment Variables (Optional)

The script looks for `yt-dlp` in your system PATH by default. If it cannot be found, you can specify the path manually using the `YT_DLP_PATH` environment variable.

```bash
YT_DLP_PATH=/usr/local/bin/yt-dlp bun start
```

## How It Works

1. **`src/article.ts`**: Connects to NetNewsWire's SQLite DB and queries articles published today (adjusted for KST +9h).
2. **`src/index.ts`**: Filters the fetched articles for YouTube URLs and iterates through them.
3. **`src/fetch-youtube-script.ts`**: Executes `yt-dlp` as a child process to download subtitles, then cleans up timestamps and tags using regex to produce plain text.
4. **Result**: The final text file is saved to the user's Downloads folder.

## Notes

- This tool is designed for **macOS** environments (due to file paths).
- NetNewsWire must be using **iCloud Sync** for the database to be found at the default path.
- Videos without captions/subtitles cannot be processed.
