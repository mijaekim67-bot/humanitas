import { useEffect } from 'react';
import { X, FileText, Pencil } from 'lucide-react';
import type { ColumnArticle } from '../types/archive.ts';
import { formatKoreanDate } from '../utils/video.ts';
import { ArtFrame } from './ArtFrame.tsx';

interface ColumnReaderModalProps {
  column: ColumnArticle | null;
  onClose: () => void;
  onEditColumn: (column: ColumnArticle) => void;
}

export function ColumnReaderModal({
  column,
  onClose,
  onEditColumn,
}: ColumnReaderModalProps) {
  useEffect(() => {
    if (!column) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [column, onClose]);

  if (!column) return null;

  const paragraphs = column.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="column-reader-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[1060px] bg-[#FAF9F6] text-[#161616] border border-stone-300 shadow-2xl max-h-[100dvh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-stone-200 bg-[#F4F1EA] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs text-stone-500 tabular-nums truncate">
            <span>{column.seriesTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{column.publication}</span>
            <span aria-hidden="true">·</span>
            <span>{formatKoreanDate(column.publishedAt)}</span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {column.pdfUrl && (
              <a
                href={column.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>신문 PDF 원문</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditColumn(column);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 bg-white hover:bg-[#EFECE5] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>수정</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="원고 창 닫기"
              className="p-1.5 text-stone-600 hover:text-[#161616] hover:bg-stone-200/70 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Broadsheet Content */}
        <article className="overflow-y-auto flex-1 p-6 sm:p-10">
          <header className="pb-8 border-b border-stone-300">
            <p className="font-mono text-xs tracking-wider text-stone-500">
              {column.seriesTitle}
            </p>
            <h2
              id="column-reader-title"
              className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-[#161616] leading-[1.25] text-balance"
            >
              {column.title}
            </h2>
            {column.subtitle && (
              <p className="mt-3 text-base sm:text-lg text-stone-600 leading-relaxed max-w-3xl">
                {column.subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs text-stone-500 tabular-nums">
              <span>글 · 김미재 (미학박사 · 예술비평가 · 미술인문학 강사)</span>
              <span aria-hidden="true">|</span>
              <span>{column.publication}</span>
              <span aria-hidden="true">|</span>
              <span>{formatKoreanDate(column.publishedAt)}</span>
            </div>
          </header>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Main Essay Column */}
            <div className="lg:col-span-8 max-w-prose space-y-5 text-[15.5px] leading-[1.9] text-stone-800">
              {paragraphs.map((para, idx) => {
                const isSubheading = /^\d+\.\s+/.test(para) && para.length < 70;
                if (isSubheading) {
                  return (
                    <h3
                      key={idx}
                      className="pt-4 font-serif text-xl font-semibold text-[#161616]"
                    >
                      {para}
                    </h3>
                  );
                }
                const isFirstBodyPara =
                  idx === 1 || (idx === 0 && !/^\d+\.\s+/.test(paragraphs[0]));
                return (
                  <p
                    key={idx}
                    className={isFirstBodyPara ? 'editorial-dropcap' : undefined}
                  >
                    {para}
                  </p>
                );
              })}
            </div>

            {/* Marginalia & Newspaper Sidebar Box */}
            <aside className="lg:col-span-4 space-y-6">
              <div>
                <ArtFrame
                  src={column.coverImageUrl}
                  alt={column.title}
                  title={column.title}
                  aspectClass="aspect-[4/3]"
                />
                {column.figureCaption && (
                  <p className="mt-2 font-serif text-xs italic text-stone-500">
                    {column.figureCaption}
                  </p>
                )}
              </div>

              {column.sidebarTitle && (
                <div className="p-5 border border-stone-200 bg-[#F4F1EA]">
                  <h4 className="font-serif text-lg font-semibold text-[#161616] pb-3 border-b border-stone-300">
                    {column.sidebarTitle}
                  </h4>
                  <div className="mt-3 text-xs text-stone-700 leading-[1.8] whitespace-pre-line">
                    {column.sidebarBody}
                  </div>
                </div>
              )}

              {column.pdfUrl && (
                <div className="p-5 border border-stone-200 bg-white">
                  <p className="font-mono text-[11px] text-stone-500 uppercase">
                    NEWSPAPER TEARSHEET
                  </p>
                  <p className="mt-1.5 text-xs text-stone-700 leading-relaxed">
                    신문 지면 편집본을 원본 PDF로 열람하거나 내려받으실 수 있습니다.
                  </p>
                  <a
                    href={column.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>지면 PDF 열기</span>
                  </a>
                </div>
              )}
            </aside>
          </div>
        </article>
      </div>
    </div>
  );
}
