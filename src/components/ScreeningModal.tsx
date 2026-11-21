import { useEffect, useRef, useState } from 'react';
import { X, Pencil, BookOpen, Clock, Film, Upload } from 'lucide-react';
import type { Lecture, LectureSeries } from '../types/archive.ts';
import {
  formatKoreanDate,
  parseTimestampToSeconds,
  parseVideoUrl,
} from '../utils/video.ts';
import { ArtFrame } from './ArtFrame.tsx';

interface ScreeningModalProps {
  lecture: Lecture | null;
  seriesList: LectureSeries[];
  onClose: () => void;
  onEditLecture: (lecture: Lecture) => void;
}

export function ScreeningModal({
  lecture,
  seriesList,
  onClose,
  onEditLecture,
}: ScreeningModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (!lecture) return;
    setActiveChapterId(lecture.chapters[0]?.id ?? null);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lecture, onClose]);

  if (!lecture) return null;

  const series = seriesList.find((s) => s.id === lecture.seriesId);
  const parsed = parseVideoUrl(lecture.videoUrl);
  const hasPlayableVideo = parsed.sourceType !== 'none';

  const handleChapterClick = (chapterId: string, timestamp: string) => {
    setActiveChapterId(chapterId);
    if (videoRef.current && (parsed.sourceType === 'direct' || parsed.sourceType === 'upload')) {
      videoRef.current.currentTime = parseTimestampToSeconds(timestamp);
      void videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="screening-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[1140px] bg-[#FAF9F6] text-[#161616] border border-stone-300 shadow-2xl max-h-[100dvh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 bg-[#FAF9F6] shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs text-stone-500 tabular-nums truncate">
            <span>{lecture.accessionCode}</span>
            {series && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{series.title}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatKoreanDate(lecture.publishedAt)}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditLecture(lecture);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 text-stone-700 hover:bg-[#EFECE5] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>강의 수정</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="강의실 창 닫기"
              className="p-1.5 text-stone-600 hover:text-[#161616] hover:bg-[#EFECE5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1">
          {/* Screening Stage */}
          <div className="bg-[#111111] text-[#FAF9F6] border-b border-stone-800">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Video Player Viewport */}
              <div className="lg:col-span-8 bg-black flex items-center justify-center">
                {parsed.embedUrl ? (
                  <div className="w-full aspect-video">
                    <iframe
                      src={parsed.embedUrl}
                      title={lecture.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : parsed.directUrl ? (
                  <div className="w-full aspect-video bg-black">
                    <video
                      ref={videoRef}
                      src={parsed.directUrl}
                      poster={lecture.thumbnailUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="relative w-full aspect-video overflow-hidden">
                    <ArtFrame
                      src={lecture.thumbnailUrl}
                      alt={lecture.title}
                      title={lecture.title}
                      aspectClass="aspect-video"
                      className="border-0"
                    />
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center p-6 text-center">
                      <Film className="w-9 h-9 text-stone-300 mb-3 stroke-[1.5]" />
                      <p className="font-serif text-xl sm:text-2xl font-medium text-[#FAF9F6]">
                        아직 영상 파일 또는 스트리밍 URL이 연결되지 않았습니다
                      </p>
                      <p className="mt-2 text-xs sm:text-sm text-stone-300 max-w-md leading-relaxed">
                        이 견본 강의에 교수님께서 제작하신 YouTube, Vimeo 링크나 직접 녹화한 MP4 영상 파일을 연결하면 바로 재생됩니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditLecture(lecture);
                        }}
                        className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#FAF9F6] text-[#161616] hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>영상 파일 · URL 연결하기</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Chapter Timecode Rail */}
              <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-stone-800 p-5 flex flex-col justify-between max-h-[420px] lg:max-h-none overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <span className="font-mono text-xs tracking-wider text-stone-400 uppercase">
                      강의 목차 · CHAPTERS
                    </span>
                    <span className="font-mono text-xs text-stone-400 tabular-nums inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lecture.duration}
                    </span>
                  </div>

                  {lecture.chapters.length === 0 ? (
                    <p className="mt-4 text-xs text-stone-400">
                      등록된 목차가 없습니다.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {lecture.chapters.map((ch, idx) => {
                        const isActive = activeChapterId === ch.id;
                        return (
                          <li key={ch.id}>
                            <button
                              type="button"
                              onClick={() => handleChapterClick(ch.id, ch.timestamp)}
                              className={`w-full text-left p-2.5 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-stone-800 text-[#FAF9F6]'
                                  : 'hover:bg-stone-900 text-stone-300'
                              }`}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-medium leading-snug">
                                  {String(idx + 1).padStart(2, '0')}. {ch.title}
                                </span>
                                <span className="font-mono text-[11px] text-stone-400 tabular-nums shrink-0">
                                  {ch.timestamp}
                                </span>
                              </div>
                              {ch.note && (
                                <p className="mt-1 text-[11px] text-stone-400 leading-relaxed">
                                  {ch.note}
                                </p>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {hasPlayableVideo && (parsed.sourceType === 'youtube' || parsed.sourceType === 'vimeo') && (
                  <p className="mt-4 pt-3 border-t border-stone-800 text-[11px] text-stone-400">
                    외부 스트리밍 영상({parsed.sourceType === 'youtube' ? 'YouTube' : 'Vimeo'})이 재생 중입니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Editorial Lecture Notes & References */}
          <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8">
              <h2
                id="screening-modal-title"
                className="font-serif text-2xl sm:text-3xl font-semibold text-[#161616] text-balance"
              >
                {lecture.title}
              </h2>
              {lecture.subtitle && (
                <p className="mt-2 text-base text-stone-600">{lecture.subtitle}</p>
              )}

              <div className="mt-6 pt-6 border-t border-stone-200 max-w-prose">
                <h3 className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-stone-500 uppercase mb-4">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>강의 해설 및 미학적 논점</span>
                </h3>
                <div className="space-y-4 text-[15px] leading-[1.85] text-stone-700 whitespace-pre-line">
                  {lecture.lectureNotes || lecture.summary}
                </div>
              </div>
            </div>

            <aside className="lg:col-span-4 lg:border-l lg:border-stone-200 lg:pl-8">
              <h3 className="font-mono text-xs tracking-wider text-stone-500 uppercase pb-3 border-b border-stone-200">
                참고 도판 및 문헌
              </h3>
              {lecture.references.length === 0 ? (
                <p className="mt-4 text-xs text-stone-500">
                  등록된 참고 문헌이 없습니다.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {lecture.references.map((ref) => (
                    <li key={ref.id} className="pb-4 border-b border-stone-200 last:border-b-0">
                      <p className="text-xs font-mono text-stone-500 tabular-nums">
                        {ref.creatorOrAuthor} · {ref.year}
                      </p>
                      <p className="mt-1 font-serif text-sm font-medium text-[#161616] leading-relaxed">
                        {ref.citation}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {lecture.figureCaption && (
                <div className="mt-6 pt-4 border-t border-stone-200">
                  <p className="font-mono text-[11px] text-stone-500 uppercase">대표 도판 주석</p>
                  <p className="mt-1.5 font-serif text-xs italic text-stone-600 leading-relaxed">
                    {lecture.figureCaption}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
