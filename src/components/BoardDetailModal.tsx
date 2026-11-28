import { useEffect, useState } from 'react';
import {
  X,
  FileDown,
  ExternalLink,
  Pencil,
  Trash2,
  Pin,
  Film,
} from 'lucide-react';
import type { BoardCategory, BoardPost } from '../types/archive.ts';
import {
  formatKoreanDate,
  isSafeHttpOrRelativeUrl,
  parseVideoUrl,
} from '../utils/video.ts';

interface BoardDetailModalProps {
  post: BoardPost | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (post: BoardPost) => void;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORY_LABEL: Record<BoardCategory, string> = {
  video: '영상 자료',
  material: '강의안·PDF',
  notice: '공지사항',
};

export function BoardDetailModal({
  post,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
}: BoardDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setConfirmDelete(false);
    setDeleteError('');
    if (!post) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [post, onClose]);

  if (!post) return null;

  const videoSource = parseVideoUrl(post.videoUrl || '');
  const hasSafeVideo =
    Boolean(post.videoUrl?.trim()) && isSafeHttpOrRelativeUrl(post.videoUrl);
  const hasSafeAttachment =
    Boolean(post.attachmentUrl?.trim()) && isSafeHttpOrRelativeUrl(post.attachmentUrl);
  const hasSafeExternalUrl =
    Boolean(post.externalUrl?.trim()) && isSafeHttpOrRelativeUrl(post.externalUrl);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(post.id);
      onClose();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-detail-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[920px] bg-[#FAF9F6] text-[#161616] border border-stone-300 shadow-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-[#F4F1EA] flex items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-stone-600 tabular-nums">
            {post.pinned && (
              <>
                <span className="inline-flex items-center gap-1 text-[#1D3557] font-semibold">
                  <Pin className="w-3 h-3" />
                  <span>상단 고정</span>
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{CATEGORY_LABEL[post.category]}</span>
            <span aria-hidden="true">·</span>
            <span>{formatKoreanDate(post.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>조회 {post.viewCount.toLocaleString('ko-KR')}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="게시물 창 닫기"
            className="p-1.5 text-stone-600 hover:text-[#161616] hover:bg-stone-200/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
          <header className="pb-6 border-b border-stone-200">
            <h2
              id="board-detail-title"
              className="font-serif text-2xl sm:text-3xl font-semibold text-[#161616] leading-snug text-balance"
            >
              {post.title}
            </h2>
            {post.summary && (
              <p className="mt-2.5 text-sm sm:text-base text-stone-600 leading-relaxed">
                {post.summary}
              </p>
            )}
            <p className="mt-3 font-mono text-xs text-stone-500">
              작성자 · {post.author}
            </p>
          </header>

          {/* Embedded Video Player (if present) */}
          {hasSafeVideo && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-xs text-stone-600">
                <Film className="w-3.5 h-3.5 text-[#1D3557]" />
                <span>게시 영상 자료</span>
              </div>
              <div className="aspect-video w-full bg-[#111111] border border-stone-300 overflow-hidden">
                {videoSource.embedUrl ? (
                  <iframe
                    src={videoSource.embedUrl}
                    title={post.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={videoSource.directUrl || post.videoUrl}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain bg-black"
                  />
                )}
              </div>
            </div>
          )}

          {/* Attachments & Reference Links */}
          {(hasSafeAttachment || hasSafeExternalUrl) && (
            <div className="p-4 border border-stone-200 bg-[#F4F1EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-stone-500 uppercase">
                  ATTACHED MATERIALS
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#161616] truncate">
                  {post.attachmentName ||
                    (hasSafeAttachment ? '첨부 문서 자료' : '외부 참고 링크')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {hasSafeAttachment && (
                  <a
                    href={post.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors whitespace-nowrap"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>자료 열기 · 다운로드</span>
                  </a>
                )}
                {hasSafeExternalUrl && (
                  <a
                    href={post.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-stone-300 bg-white text-[#161616] hover:bg-[#EFECE5] transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>참고 링크 열기</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="max-w-prose text-[15px] leading-[1.85] text-stone-800 whitespace-pre-line">
            {post.content || '등록된 본문 설명이 없습니다.'}
          </div>

          {deleteError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              {deleteError}
            </p>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-stone-200 bg-[#F4F1EA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(post);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-300 bg-white text-[#161616] hover:bg-[#EFECE5] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>수정하기</span>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-300 bg-white text-stone-600 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleConfirmDelete()}
                    className="px-3.5 py-2 text-xs font-medium bg-red-700 text-white hover:bg-red-800 cursor-pointer whitespace-nowrap"
                  >
                    {deleting ? '삭제 중...' : '정말 삭제하기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 text-xs border border-stone-300 bg-white cursor-pointer whitespace-nowrap"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="font-mono text-[11px] text-stone-500">
              열람 전용 게시물
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-[#161616] text-[#FAF9F6] hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
