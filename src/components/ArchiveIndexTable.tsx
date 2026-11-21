import { Play, Pencil } from 'lucide-react';
import type { Lecture, LectureSeries, LectureStatus } from '../types/archive.ts';
import { formatKoreanDate } from '../utils/video.ts';

interface ArchiveIndexTableProps {
  lectures: Lecture[];
  seriesList: LectureSeries[];
  onWatchLecture: (lecture: Lecture) => void;
  onEditLecture: (lecture: Lecture) => void;
}

const STATUS_LABEL: Record<LectureStatus, string> = {
  published: '공개 중',
  draft: '초안',
  scheduled: '게시 예정',
};

export function ArchiveIndexTable({
  lectures,
  seriesList,
  onWatchLecture,
  onEditLecture,
}: ArchiveIndexTableProps) {
  const sortedLectures = [...lectures].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );

  return (
    <section id="index" className="border-b border-stone-200 bg-[#F4F1EA]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-300">
          <div>
            <p className="font-mono text-xs tracking-widest text-stone-500 uppercase">
              SYLLABUS &amp; ACCESSION LEDGER
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#161616]">
              전체 강의 아카이브 색인
            </h2>
          </div>
          <p className="text-xs font-mono text-stone-600 tabular-nums">
            총 {lectures.length}건 기록됨 (초안 및 예정 포함)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-xs font-mono text-stone-500">
                <th className="py-3.5 pr-4 font-medium whitespace-nowrap">등록 번호</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap">시리즈</th>
                <th className="py-3.5 px-4 font-medium">강의명 및 논제</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap">게시일</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap">분량</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap">상태</th>
                <th className="py-3.5 pl-4 font-medium text-right whitespace-nowrap">열람</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-sm">
              {sortedLectures.map((lecture) => {
                const series = seriesList.find((s) => s.id === lecture.seriesId);
                return (
                  <tr
                    key={lecture.id}
                    className="hover:bg-[#FAF9F6]/80 transition-colors duration-100"
                  >
                    <td className="py-4 pr-4 font-mono text-xs text-stone-600 tabular-nums whitespace-nowrap">
                      {lecture.accessionCode}
                    </td>
                    <td className="py-4 px-4 text-xs text-stone-600 whitespace-nowrap">
                      {series ? series.title : '미분류'}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => onWatchLecture(lecture)}
                        className="font-serif text-base font-medium text-[#161616] hover:text-[#1D3557] text-left cursor-pointer"
                      >
                        {lecture.title}
                      </button>
                      {lecture.subtitle && (
                        <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                          {lecture.subtitle}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-stone-600 tabular-nums whitespace-nowrap">
                      {formatKoreanDate(lecture.publishedAt)}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-stone-600 tabular-nums whitespace-nowrap">
                      {lecture.duration}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs whitespace-nowrap">
                      <span
                        className={
                          lecture.status === 'published'
                            ? 'text-[#1D3557] font-medium'
                            : 'text-stone-500'
                        }
                      >
                        {STATUS_LABEL[lecture.status]}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onWatchLecture(lecture)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>보기</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditLecture(lecture)}
                          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#161616] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>수정</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
