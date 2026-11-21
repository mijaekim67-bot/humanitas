import { Play, BookOpen } from 'lucide-react';
import type { Lecture, LectureSeries, ProfessorProfile } from '../types/archive.ts';
import { formatKoreanDate, parseDurationToMinutes } from '../utils/video.ts';
import { ArtFrame } from './ArtFrame.tsx';

interface HeroSectionProps {
  profile: ProfessorProfile;
  featuredLecture: Lecture | undefined;
  seriesList: LectureSeries[];
  allPublishedLectures: Lecture[];
  onWatchLecture: (lecture: Lecture) => void;
  onOpenStudio: () => void;
}

export function HeroSection({
  profile,
  featuredLecture,
  seriesList,
  allPublishedLectures,
  onWatchLecture,
  onOpenStudio,
}: HeroSectionProps) {
  const featuredSeries = seriesList.find((s) => s.id === featuredLecture?.seriesId);

  const totalMinutes = allPublishedLectures.reduce(
    (acc, lec) => acc + parseDurationToMinutes(lec.duration),
    0
  );
  const totalHoursText = `${Math.floor(totalMinutes / 60)}시간 ${Math.round(totalMinutes % 60)}분`;
  const latestDate =
    allPublishedLectures
      .map((l) => l.publishedAt)
      .sort()
      .reverse()[0] ?? '';

  return (
    <section id="featured" className="border-b border-stone-200">
      <div className="max-w-[1200px] mx-auto px-6 pt-12 pb-10 lg:pt-16 lg:pb-14">
        {/* Institutional Intro Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 mb-10 border-b border-stone-200">
          <div>
            <p className="font-mono text-xs tracking-widest text-stone-500 uppercase">
              {profile.affiliation} {profile.professorName} {profile.professorTitle}
            </p>
            <p className="mt-2 text-sm text-stone-600 max-w-2xl">
              {profile.siteSubtitle}
            </p>
          </div>
          <p className="font-mono text-xs text-stone-500 tabular-nums shrink-0">
            REGULAR VIDEO MONOGRAPHS &amp; LECTURE ARCHIVE
          </p>
        </div>

        {/* 2-Column Exhibition Hero Split */}
        {featuredLecture ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left: Curatorial Editorial Lead */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-stone-500 tabular-nums mb-4">
                  <span>대표 특강</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredLecture.accessionCode}</span>
                  {featuredSeries && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{featuredSeries.title}</span>
                    </>
                  )}
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold leading-[1.2] tracking-tight text-[#161616] text-balance">
                  {featuredLecture.title}
                </h1>

                {featuredLecture.subtitle && (
                  <p className="mt-3 text-base font-medium text-stone-700 leading-relaxed">
                    {featuredLecture.subtitle}
                  </p>
                )}

                <p className="mt-5 text-[15px] text-stone-600 leading-[1.75]">
                  {featuredLecture.summary}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-200">
                <div className="flex items-center gap-3 font-mono text-xs text-stone-500 tabular-nums mb-5">
                  <span>게시일 {formatKoreanDate(featuredLecture.publishedAt)}</span>
                  <span aria-hidden="true">/</span>
                  <span>러닝타임 {featuredLecture.duration}</span>
                  <span aria-hidden="true">/</span>
                  <span>목차 {featuredLecture.chapters.length}개 장</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onWatchLecture(featuredLecture)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>강의 영상 시청하기</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onWatchLecture(featuredLecture)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-stone-300 text-[#161616] bg-transparent hover:bg-[#EFECE5] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>해설 노트 보기</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Museum Frame Visual Showcase */}
            <div className="lg:col-span-7 flex flex-col">
              <button
                type="button"
                onClick={() => onWatchLecture(featuredLecture)}
                className="group relative block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D3557]"
                aria-label={`${featuredLecture.title} 영상 재생`}
              >
                <div className="relative overflow-hidden">
                  <ArtFrame
                    src={featuredLecture.thumbnailUrl}
                    alt={featuredLecture.title}
                    title={featuredLecture.title}
                    className="w-full"
                    aspectClass="aspect-video lg:aspect-[16/10]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-200" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 flex items-center justify-center rounded-full bg-[#FAF9F6]/95 text-[#161616] shadow-md transform group-hover:scale-105 transition-transform duration-200">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs font-mono text-[#FAF9F6] tabular-nums">
                    <span>
                      {featuredLecture.videoUrl ? '영상 스트리밍 준비됨' : '아카이브 프리뷰 · 해설 수록'}
                    </span>
                    <span>{featuredLecture.duration}</span>
                  </div>
                </div>
              </button>
              {featuredLecture.figureCaption && (
                <p className="mt-2.5 font-serif text-xs italic text-stone-500">
                  {featuredLecture.figureCaption}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center border border-stone-200 bg-[#F3EFE6]/60">
            <h1 className="font-serif text-3xl font-semibold text-[#161616]">
              아직 게시된 강의 영상이 없습니다
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              교수자 스튜디오에서 첫 번째 미술·미학 강의를 등록하고 공개해 보세요.
            </p>
            <button
              type="button"
              onClick={onOpenStudio}
              className="mt-6 px-5 py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors cursor-pointer"
            >
              첫 강의 등록하기
            </button>
          </div>
        )}

        {/* Full-Width Operational Archive Ribbon */}
        <div className="mt-12 pt-8 border-t border-stone-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="pr-4">
            <p className="text-xs font-mono text-stone-500">공개된 영상 강의</p>
            <p className="mt-1.5 font-serif text-2xl font-semibold text-[#161616] tabular-nums">
              {allPublishedLectures.length}편
            </p>
          </div>
          <div className="pr-4 lg:border-l lg:border-stone-200 lg:pl-6">
            <p className="text-xs font-mono text-stone-500">정기 개설 시리즈</p>
            <p className="mt-1.5 font-serif text-2xl font-semibold text-[#161616] tabular-nums">
              {seriesList.length}개 강좌
            </p>
          </div>
          <div className="pr-4 lg:border-l lg:border-stone-200 lg:pl-6">
            <p className="text-xs font-mono text-stone-500">누적 아카이브 분량</p>
            <p className="mt-1.5 font-serif text-2xl font-semibold text-[#161616] tabular-nums">
              {totalHoursText}
            </p>
          </div>
          <div className="lg:border-l lg:border-stone-200 lg:pl-6">
            <p className="text-xs font-mono text-stone-500">최근 정기 게시일</p>
            <p className="mt-1.5 font-serif text-2xl font-semibold text-[#161616] tabular-nums">
              {latestDate ? formatKoreanDate(latestDate) : '—'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
