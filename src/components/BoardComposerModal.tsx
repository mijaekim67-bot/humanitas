import { useEffect, useState } from 'react';
import { X, Upload, Film, Paperclip } from 'lucide-react';
import type { BoardCategory, BoardPost } from '../types/archive.ts';
import { parseVideoUrl } from '../utils/video.ts';

interface BoardComposerModalProps {
  isOpen: boolean;
  editingPost: BoardPost | null;
  defaultAuthor: string;
  adminToken: string;
  onClose: () => void;
  onSavePost: (post: Partial<BoardPost>, isNew: boolean) => Promise<void>;
}

export function BoardComposerModal({
  isOpen,
  editingPost,
  defaultAuthor,
  adminToken,
  onClose,
  onSavePost,
}: BoardComposerModalProps) {
  const [category, setCategory] = useState<BoardCategory>('video');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(defaultAuthor);
  const [publishedAt, setPublishedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [pinned, setPinned] = useState(false);

  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setUploadStatus('');
    if (editingPost) {
      setCategory(editingPost.category);
      setTitle(editingPost.title);
      setAuthor(editingPost.author);
      setPublishedAt(editingPost.publishedAt);
      setSummary(editingPost.summary);
      setContent(editingPost.content);
      setVideoUrl(editingPost.videoUrl || '');
      setAttachmentUrl(editingPost.attachmentUrl || '');
      setAttachmentName(editingPost.attachmentName || '');
      setExternalUrl(editingPost.externalUrl || '');
      setPinned(editingPost.pinned);
    } else {
      setCategory('video');
      setTitle('');
      setAuthor(defaultAuthor);
      setPublishedAt(new Date().toISOString().slice(0, 10));
      setSummary('');
      setContent('');
      setVideoUrl('');
      setAttachmentUrl('');
      setAttachmentName('');
      setExternalUrl('');
      setPinned(false);
    }
  }, [isOpen, editingPost, defaultAuthor]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUploadFile = async (file: File, target: 'video' | 'attachment') => {
    setErrorMsg('');
    setUploadStatus(
      target === 'video'
        ? `영상 파일 업로드 중 (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`
        : `자료 파일 업로드 중 (${file.name})...`
    );

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name),
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: file,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || '파일 업로드에 실패했습니다.');
      }

      const data = (await res.json()) as {
        url: string;
        originalName?: string;
        filename: string;
      };
      if (target === 'video') {
        setVideoUrl(data.url);
      } else {
        setAttachmentUrl(data.url);
        setAttachmentName(data.originalName || file.name);
      }
      setUploadStatus(
        target === 'video'
          ? '영상 파일이 성공적으로 첨부되었습니다.'
          : `자료 파일(${file.name})이 첨부되었습니다.`
      );
    } catch (err) {
      setUploadStatus('');
      setErrorMsg(
        err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('게시글 제목을 입력해 주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const videoSource = parseVideoUrl(videoUrl);
      const payload: Partial<BoardPost> = {
        ...(editingPost ? { id: editingPost.id } : {}),
        category,
        title: title.trim(),
        author: author.trim() || defaultAuthor,
        publishedAt,
        summary: summary.trim(),
        content: content.trim(),
        videoUrl: videoUrl.trim(),
        sourceType: videoSource.sourceType,
        attachmentUrl: attachmentUrl.trim(),
        attachmentName: attachmentName.trim(),
        externalUrl: externalUrl.trim(),
        pinned,
      };
      await onSavePost(payload, !editingPost);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '게시글을 저장하지 못했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-composer-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[780px] bg-[#FAF9F6] text-[#161616] border border-stone-300 shadow-2xl max-h-[100dvh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-[#F4F1EA] flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="font-mono text-[11px] text-stone-500 uppercase tracking-wider">
              {editingPost ? 'EDIT BOARD ENTRY' : 'NEW BOARD ENTRY'}
            </p>
            <h2
              id="board-composer-title"
              className="font-serif text-xl font-semibold text-[#161616]"
            >
              {editingPost ? '게시글 수정하기' : '영상 · 자료 게시판 글쓰기'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="작성 창 닫기"
            className="p-1.5 text-stone-600 hover:text-[#161616] hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                게시글 분류
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BoardCategory)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300"
              >
                <option value="video">영상 자료</option>
                <option value="material">강의안 · PDF · 문서</option>
                <option value="notice">공지사항</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                작성자
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                게시일
              </label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              제목 *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: [특강 영상] 현대미술과 미니멀리즘의 공간 경험"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              한 줄 요약 (게시판 목록에 표시)
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="수강생이나 방문자가 목록에서 바로 확인할 수 있는 짧은 요약"
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300"
            />
          </div>

          {/* Video Link or Direct Video Upload */}
          <div className="p-4 border border-stone-200 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#161616]">
                <Film className="w-3.5 h-3.5 text-[#1D3557]" />
                <span>영상 연결 (유튜브 · 비메오 링크 또는 동영상 파일 업로드)</span>
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 bg-[#FAF9F6] hover:bg-[#EFECE5] cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>영상 파일 선택</span>
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadFile(file, 'video');
                  }}
                />
              </label>
            </div>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... 또는 업로드 시 자동 입력"
              className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-stone-300"
            />
          </div>

          {/* Document Attachment or External URL */}
          <div className="p-4 border border-stone-200 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#161616]">
                <Paperclip className="w-3.5 h-3.5 text-[#1D3557]" />
                <span>자료 파일 첨부 (PDF, PPT, 한글, 워드, 이미지 등)</span>
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 bg-[#FAF9F6] hover:bg-[#EFECE5] cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>자료 파일 선택</span>
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.xls,.xlsx,.zip,.txt,.csv,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadFile(file, 'attachment');
                  }}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="표시할 첨부 파일 이름"
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300"
              />
              <input
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="파일 경로 (/uploads/...) 또는 PDF URL"
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-stone-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">
                외부 참고 링크 (선택 — 기사, 전시관 페이지, 구글 드라이브 등)
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-stone-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              본문 내용
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="자료 설명, 강의 안내, 읽을거리 등을 자유롭게 작성하세요."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 leading-relaxed"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-[#1D3557]"
            />
            <span>게시판 최상단에 공지·주요 자료로 고정하기</span>
          </label>

          {uploadStatus && (
            <p className="text-xs text-[#1D3557] bg-[#EEF2F7] border border-[#1D3557]/20 px-3 py-2">
              {uploadStatus}
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-stone-300 bg-white hover:bg-[#EFECE5] cursor-pointer whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors cursor-pointer whitespace-nowrap"
            >
              {isSaving
                ? '저장 중...'
                : editingPost
                ? '수정 내용 저장하기'
                : '게시판에 등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
