export interface TranscriptResult {
  transcript: string;
  title: string;
}

export interface PlaylistVideoInfo {
  videoId: string;
  title: string;
  index: number;
}

export interface PlaylistTranscriptResult {
  videoId: string;
  title: string;
  transcript: string | null;
  error?: string;
}
