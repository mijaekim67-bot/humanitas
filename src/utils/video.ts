import type { VideoSourceType } from '../types/archive.ts';

export interface ParsedVideoSource {
  sourceType: VideoSourceType;
  embedUrl: string | null;
  directUrl: string | null;
  suggestedThumbnail: string | null;
  youtubeId: string | null;
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function extractVimeoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function parseVideoUrl(url: string): ParsedVideoSource {
  const trimmed = url.trim();
  if (!trimmed) {
    return {
      sourceType: 'none',
      embedUrl: null,
      directUrl: null,
      suggestedThumbnail: null,
      youtubeId: null,
    };
  }

  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      sourceType: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0`,
      directUrl: null,
      suggestedThumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      youtubeId: ytId,
    };
  }

  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return {
      sourceType: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      directUrl: null,
      suggestedThumbnail: null,
      youtubeId: null,
    };
  }

  if (trimmed.startsWith('/uploads/')) {
    return {
      sourceType: 'upload',
      embedUrl: null,
      directUrl: trimmed,
      suggestedThumbnail: null,
      youtubeId: null,
    };
  }

  return {
    sourceType: 'direct',
    embedUrl: null,
    directUrl: trimmed,
    suggestedThumbnail: null,
    youtubeId: null,
  };
}

export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().split(':').map((n) => Number.parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] ?? 0;
}

export function parseDurationToMinutes(duration: string): number {
  const parts = duration.trim().split(':').map((n) => Number.parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60;
  }
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
  return 0;
}

export function formatKoreanDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}
