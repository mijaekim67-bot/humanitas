import { useMemo, useState } from 'react';
import { Play, Search, ArrowUpRight, Pencil } from 'lucide-react';
import type { Lecture, LectureSeries } from '../types/archive.ts';
import { formatKoreanDate, parseDurationToMinutes } from '../utils/video.ts';
import { ArtFrame } from './ArtFrame.tsx';

interface LectureCatalogProps {
  lectures: Lecture[];
  seriesList: LectureSeries[];
  selectedSeriesId: string;
  isAdmin: boolean;
  onSelectSeries: (id: string) => void;
  onWatchLecture: (lecture: Lecture) => void;
  onEditLecture: (lecture: Lecture) => void;
}

type SortOption = 'newest' | 'code' | 'duration';

export function LectureCatalog({
  lectures,
  seriesList,
  selectedSeriesId,
  isAdmin,
  onSelectSeries,
  onWatchLecture,
  onEditLecture,
}: LectureCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const publishedLectures = useMemo(
    () => lectures.filter((l) => l.status === 'published'),
    [lectures]
  );

  const filteredLectures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = publishedLectures.filter((l) => {
      if (selectedSeriesId !== 'all' && l.seriesId !== selectedSeriesId) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.subtitle.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.accessionCode.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'code') {
        return a.accessionCode.localeCompare(b.accessionCode);
      }
      if (sortBy === 'duration') {
        return parseDurationToMinutes(b.duration) - parseDurationToMinutes(a.duration);
      }
      return b.publishedAt.localeCompare(a.publishedAt);
    });
  }, [publishedLectures, selectedSeriesId, searchQuery, sortBy]);

  const activeSeries = seriesList.find((s) => s.id === selectedSeriesId);

  return (
    <section id="catalog" className="border-b border-stone-200 bg-[#FAF9F6]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        {/* Section Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-stone-200">
          <div>
            <p className="font-mono text-xs tracking-widest text-stone-500 uppercase">
              CURATED LECTURE SERIES
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-[#161616] text-balance">
              정기 영상 강좌 및 미학 특강
            </h2>
            <p className="mt-2 text-sm text-stone-600 max-w-2xl">
              {activeSeries
                ? `${activeSeries.code} · ${activeSeries.semester} — ${activeSeries.description}`
                : '강좌별 주제에 따라 분류된 미술사 및 미학 영상 자료를 선택하여 시청할 수 있습니다.'}
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="강의 제목·주제 검색"
                aria-label="강의 제목 또는 주제 검색"
                className="pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 text-[#161616] placeholder:text-stone-400 focus:outline-none focus:border-[#1D3557] w-56"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="정렬 기준"
              className="px-3 py-2 text-sm bg-white border border-stone-300 text-[#161616] focus:outline-none focus:border-[#1D3557] cursor-pointer"
            >
              <option value="newest">최신 게시순</option>
              <option value="code">아카이브 번호순</option>
              <option value="duration">강의 시간순</option>
            </select>
          </div>
        </div>

        {/* Interactive Series Filter Tabs */}
        <div
          role="tablist"
          aria-label="강좌 시리즈 분류"
          className="flex items-center gap-2 overflow-x-auto py-5 border-b border-stone-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedSeriesId === 'all'}
            onClick={() => onSelectSeries('all')}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSeriesId === 'all'
                ? 'bg-[#1D3557] text-[#FAF9F6]'
                : 'bg-[#F3EFE6] text-stone-700 hover:bg-[#E7E0D3]'
            }`}
          >
            전체 강좌 ({publishedLectures.length})
          </button>
          {seriesList.map((series) => {
            const count = publishedLectures.filter((l) => l.seriesId === series.id).length;
            const isActive = selectedSeriesId === series.id;
            return (
              <button
                key={series.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectSeries(series.id)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  isActive
                    ? 'bg-[#1D3557] text-[#FAF9F6]'
                    : 'bg-[#F3EFE6] text-stone-700 hover:bg-[#E7E0D3]'
                }`}
              >
                {series.title} ({count})
              </button>
            );
          })}
        </div>

        {/* Lecture Cards Grid */}
        {filteredLectures.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-xl text-stone-700">
              선택한 조건에 해당하는 공개 강의가 없습니다.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              검색어를 지우거나 다른 강좌 시리즈를 선택해 보세요.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {filteredLectures.map((lecture) => {
              const series = seriesList.find((s) => s.id === lecture.seriesId);
              return (
                <article key={lecture.id} className="group flex flex-col">
                  {/* 16:9 Thumbnail Frame */}
                  <button
                    type="button"
                    onClick={() => onWatchLecture(lecture)}
                    className="relative block w-full text-left overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D3557]"
                    aria-label={`${lecture.title} 시청하기`}
                  >
                    <div className="transform group-hover:scale-[1.02] transition-transform duration-200">
                      <ArtFrame
                        src={lecture.thumbnailUrl}
                        alt={lecture.title}
                        title={lecture.title}
                        aspectClass="aspect-video"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-200" />
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-xs font-mono text-[#FAF9F6] tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{lecture.videoUrl ? '영상 재생' : '해설 열람'}</span>
                      </span>
                      <span>{lecture.duration}</span>
                    </div>
                  </button>

                  {/* Quiet Unboxed Metadata */}
                  <div className="mt-4 flex items-center gap-2 font-mono text-xs text-stone-500 tabular-nums">
                    <span>{lecture.accessionCode}</span>
                    {series && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{series.title}</span>
                      </>
                    )}
                  </div>

                  {/* Title & Summary */}
                  <h3 className="mt-2 font-serif text-xl font-semibold leading-snug text-[#161616] group-hover:text-[#1D3557] transition-colors duration-150">
                    <button
                      type="button"
                      onClick={() => onWatchLecture(lecture)}
                      className="text-left cursor-pointer"
                    >
                      {lecture.title}
                    </button>
                  </h3>

                  <p className="mt-2 text-sm text-stone-600 leading-relaxed line-clamp-2 flex-1">
                    {lecture.summary}
                  </p>

                  {/* Footer Line */}
                  <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 font-mono tabular-nums">
                    <span>
                      {formatKoreanDate(lecture.publishedAt)} · {lecture.chapters.length}개 장
                    </span>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onEditLecture(lecture)}
                          className="inline-flex items-center gap-1 text-stone-500 hover:text-[#161616] transition-colors cursor-pointer"
                          title="강의 정보 수정"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>편집</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onWatchLecture(lecture)}
                        className="inline-flex items-center gap-0.5 font-sans font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer"
                      >
                        <span>입장</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
