import { unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  type TranscriptResult,
  type PlaylistVideoInfo,
  type PlaylistTranscriptResult,
} from "./type";

// 1. 영상 ID 추출 (로직 동일)
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

let cachedYtDlpPath: string | null = null;

// 2. yt-dlp 경로 찾기 (Bun.which 사용)
export async function resolveYtDlpPath(): Promise<string> {
  if (cachedYtDlpPath) return cachedYtDlpPath;

  // 환경 변수 확인
  const envPath = Bun.env.YT_DLP_PATH;
  if (envPath) {
    cachedYtDlpPath = envPath;
    return envPath;
  }

  // Bun.which로 시스템 PATH에서 검색
  const systemPath = await Bun.which("yt-dlp");
  if (systemPath) {
    cachedYtDlpPath = systemPath;
    return systemPath;
  }

  // 일반적인 설치 경로 수동 확인
  const commonPaths = [
    "/opt/homebrew/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
  ];

  for (const p of commonPaths) {
    if (await Bun.file(p).exists()) {
      cachedYtDlpPath = p;
      return p;
    }
  }

  throw new Error("yt-dlp를 찾을 수 없습니다. 설치 후 PATH를 확인해주세요.");
}

// 3. 커맨드 실행 (Bun.spawn 사용)
async function execCommand(args: string[]) {
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Command failed: ${args.join(" ")}\n${stderr}`);
  }

  return { stdout, stderr };
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 255);
}

// 4. VTT 처리 로직 (최적화)
export function processVttContent(rawContent: string): string {
  const lines = rawContent.split(/\r?\n/);
  const transcriptLines: string[] = [];
  let previousLine = "";

  const timestampPattern = /^\d{2}:\d{2}:\d{2}\.\d{3}/;
  const metadataPattern = /^(Kind:|Language:)/i;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.includes("WEBVTT") ||
      /^\d+$/.test(trimmed) ||
      timestampPattern.test(trimmed) ||
      metadataPattern.test(trimmed)
    ) {
      continue;
    }

    const cleaned = trimmed.replace(/<[^>]*>/g, "").trim();

    if (cleaned && cleaned !== previousLine) {
      transcriptLines.push(cleaned);
      previousLine = cleaned;
    }
  }

  return transcriptLines.join(" ");
}

// 5. 메인 텍스트 추출 함수
export async function getYouTubeTranscriptAsPlainText(
  videoUrl: string,
  language: string = "en"
): Promise<{ transcript: string | null; videoTitle: string | null }> {
  const ytDlpPath = await resolveYtDlpPath();
  const timestamp = Date.now();
  const baseOutputPath = path.join(os.tmpdir(), `temp_transcript_${timestamp}`);
  const tempFilePath = `${baseOutputPath}.${language}.vtt`;

  let videoTitle: string | null = null;

  try {
    // 제목 가져오기
    const titleRes = await execCommand([ytDlpPath, "--get-title", videoUrl]);
    videoTitle = titleRes.stdout.trim();

    // 자막 다운로드
    const { stdout } = await execCommand([
      ytDlpPath,
      "--write-auto-subs",
      "--skip-download",
      "--sub-lang",
      language,
      "--output",
      baseOutputPath,
      videoUrl,
    ]);

    if (
      stdout.includes("No captions found") ||
      stdout.includes("no subtitles")
    ) {
      return { transcript: null, videoTitle };
    }

    // Bun.file을 사용하여 파일 읽기
    const file = Bun.file(tempFilePath);
    if (!(await file.exists())) {
      return { transcript: null, videoTitle };
    }

    const rawContent = await file.text();
    const finalTranscript = processVttContent(rawContent);

    return { transcript: finalTranscript, videoTitle };
  } catch (error) {
    console.error(`Error: ${error}`);
    throw error;
  } finally {
    // 파일 삭제 (Node 호환 API 사용)
    try {
      await unlink(tempFilePath);
    } catch {}
  }
}

export async function getVideoTranscript(
  videoId: string,
  language: string = "en"
): Promise<TranscriptResult> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const { transcript, videoTitle } = await getYouTubeTranscriptAsPlainText(
    videoUrl,
    language
  );

  if (!transcript) {
    throw new Error("자막을 찾을 수 없습니다.");
  }

  return {
    transcript,
    title: videoTitle || `YouTube Video ${videoId}`,
  };
}

// ============ 재생목록 관련 함수들 ============

// 재생목록 URL에서 playlist ID 추출
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

// 재생목록의 모든 비디오 정보 가져오기
export async function getPlaylistVideos(
  playlistUrl: string
): Promise<PlaylistVideoInfo[]> {
  const ytDlpPath = await resolveYtDlpPath();

  // --flat-playlist: 비디오 다운로드 없이 메타데이터만 가져옴
  // -J: JSON 형식으로 출력
  const { stdout } = await execCommand([
    ytDlpPath,
    "--flat-playlist",
    "-J",
    playlistUrl,
  ]);

  const playlistData = JSON.parse(stdout);
  const videos: PlaylistVideoInfo[] = [];

  if (playlistData.entries && Array.isArray(playlistData.entries)) {
    for (let i = 0; i < playlistData.entries.length; i++) {
      const entry = playlistData.entries[i];
      videos.push({
        videoId: entry.id,
        title: entry.title || `Video ${i + 1}`,
        index: i + 1,
      });
    }
  }

  return videos;
}

// 재생목록의 모든 비디오 transcript 가져오기
export async function getPlaylistTranscripts(
  playlistUrl: string,
  language: string = "en",
  options?: {
    concurrency?: number; // 동시 처리 개수 (기본: 3)
    onProgress?: (current: number, total: number, title: string) => void;
  }
): Promise<PlaylistTranscriptResult[]> {
  const { concurrency = 3, onProgress } = options || {};

  // 1. 재생목록의 모든 비디오 정보 가져오기
  console.log("📋 재생목록 정보를 가져오는 중...");
  const videos = await getPlaylistVideos(playlistUrl);
  console.log(`📹 총 ${videos.length}개의 비디오를 찾았습니다.`);

  const results: PlaylistTranscriptResult[] = [];

  // 2. 배치 단위로 처리 (동시성 제한)
  for (const video of videos) {
    onProgress?.(video.index, videos.length, video.title);
    console.log(
      `🎬 [${video.index}/${videos.length}] "${video.title}" 처리 중...`
    );

    try {
      const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
      const { transcript, videoTitle } = await getYouTubeTranscriptAsPlainText(
        videoUrl,
        language
      );

      results.push({
        videoId: video.videoId,
        title: videoTitle || video.title,
        transcript,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ "${video.title}" 처리 실패: ${errorMessage}`);

      results.push({
        videoId: video.videoId,
        title: video.title,
        transcript: null,
        error: errorMessage,
      });
    }
  }

  // 3. 결과 요약
  const successCount = results.filter((r) => r.transcript !== null).length;
  console.log(
    `\n✅ 완료: ${successCount}/${videos.length}개 비디오의 자막을 가져왔습니다.`
  );

  return results;
}

// 간단한 사용을 위한 헬퍼 함수
export async function getPlaylistTranscriptsCombined(
  playlistUrl: string,
  language: string = "en"
): Promise<{ title: string; transcript: string }[]> {
  const results = await getPlaylistTranscripts(playlistUrl, language);

  return results
    .filter((r) => r.transcript !== null)
    .map((r) => ({
      title: r.title,
      transcript: r.transcript!,
    }));
}
