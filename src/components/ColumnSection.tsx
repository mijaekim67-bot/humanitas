import { BookOpen, FileText, Plus, Pencil } from 'lucide-react';
import type { ColumnArticle } from '../types/archive.ts';
import { formatKoreanDate } from '../utils/video.ts';
import { ArtFrame } from './ArtFrame.tsx';

interface ColumnSectionProps {
  columns: ColumnArticle[];
  onReadColumn: (column: ColumnArticle) => void;
  onAddColumn: () => void;
  onEditColumn: (column: ColumnArticle) => void;
}

export function ColumnSection({
  columns,
  onReadColumn,
  onAddColumn,
  onEditColumn,
}: ColumnSectionProps) {
  const published = columns
    .filter((c) => c.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const lead = published[0];
  const rest = published.slice(1);

  return (
    <section id="columns" className="border-b border-stone-200 bg-[#FAF9F6]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-stone-300">
          <div>
            <p className="font-mono text-xs tracking-widest text-stone-500 uppercase">
              MONTHLY ESSAY SERIES · 따옴뉴스 월간 기고
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-[#161616] text-balance">
              미재의 미술인문학산책 | 길 위에서 마음을 묻다
            </h2>
            <p className="mt-2 text-sm text-stone-600 max-w-2xl">
              매달 1회 따옴뉴스에 연재하는 미술·건축·인문학 기고 원고와 지면 PDF 아카이브입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddColumn}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-stone-300 bg-white text-[#161616] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 기고 원고 등록</span>
          </button>
        </div>

        {/* Lead Broadsheet Column */}
        {!lead ? (
          <div className="py-16 text-center border-b border-stone-200">
            <p className="font-serif text-xl text-stone-700">
              아직 공개된 기고 원고가 없습니다.
            </p>
            <button
              type="button"
              onClick={onAddColumn}
              className="mt-4 px-4 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] cursor-pointer"
            >
              첫 원고 등록하기
            </button>
          </div>
        ) : (
          <article className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch pb-10 border-b border-stone-200">
            <div className="lg:col-span-5">
              <button
                type="button"
                onClick={() => onReadColumn(lead)}
                className="group block w-full text-left cursor-pointer"
                aria-label={`${lead.title} 원고 읽기`}
              >
                <div className="overflow-hidden">
                  <div className="transform group-hover:scale-[1.02] transition-transform duration-200">
                    <ArtFrame
                      src={lead.coverImageUrl}
                      alt={lead.title}
                      title={lead.title}
                      aspectClass="aspect-[4/3]"
                    />
                  </div>
                </div>
              </button>
              {lead.figureCaption && (
                <p className="mt-2.5 font-serif text-xs italic text-stone-500">
                  {lead.figureCaption}
                </p>
              )}
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-stone-500 tabular-nums">
                  <span>{lead.issueNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lead.publication}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatKoreanDate(lead.publishedAt)}</span>
                </div>

                <h3 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-[#161616] leading-snug text-balance">
                  <button
                    type="button"
                    onClick={() => onReadColumn(lead)}
                    className="text-left hover:text-[#1D3557] transition-colors cursor-pointer"
                  >
                    {lead.title}
                  </button>
                </h3>

                {lead.subtitle && (
                  <p className="mt-2 text-base font-medium text-stone-700 leading-relaxed">
                    {lead.subtitle}
                  </p>
                )}

                <p className="mt-4 text-[15px] text-stone-600 leading-[1.8] max-w-prose">
                  {lead.summary}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onReadColumn(lead)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>원고 전문 읽기</span>
                  </button>
                  {lead.pdfUrl && (
                    <a
                      href={lead.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-stone-300 text-[#161616] hover:bg-[#EFECE5] transition-colors whitespace-nowrap"
                    >
                      <FileText className="w-4 h-4" />
                      <span>따옴뉴스 지면 PDF</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onEditColumn(lead)}
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#161616] cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>원고 수정</span>
                </button>
              </div>
            </div>
          </article>
        )}

        {/* Archive List for Additional Monthly Columns */}
        {rest.length > 0 && (
          <div className="mt-8 divide-y divide-stone-200">
            {rest.map((col) => (
              <article
                key={col.id}
                className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-xs text-stone-500 tabular-nums">
                    <span>{col.issueNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{col.publication}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatKoreanDate(col.publishedAt)}</span>
                  </div>
                  <h4 className="mt-1 font-serif text-xl font-semibold text-[#161616]">
                    <button
                      type="button"
                      onClick={() => onReadColumn(col)}
                      className="text-left hover:text-[#1D3557] transition-colors cursor-pointer"
                    >
                      {col.title}
                    </button>
                  </h4>
                  {col.subtitle && (
                    <p className="mt-1 text-xs text-stone-600 line-clamp-1">{col.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {col.pdfUrl && (
                    <a
                      href={col.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-stone-600 hover:text-[#161616] underline underline-offset-4"
                    >
                      PDF 보기
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onReadColumn(col)}
                    className="px-3.5 py-1.5 text-xs font-medium border border-stone-300 bg-white hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    전문 읽기
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditColumn(col)}
                    className="text-xs text-stone-500 hover:text-[#161616] cursor-pointer"
                  >
                    수정
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
