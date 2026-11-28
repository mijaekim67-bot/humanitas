import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import type { ArchiveData } from '../types/archive.ts';

interface AdminAuthModalProps {
  isOpen: boolean;
  isConfigured: boolean;
  onClose: () => void;
  onAuthenticated: (token: string, archive: ArchiveData) => void;
}

export function AdminAuthModal({
  isOpen,
  isConfigured,
  onClose,
  onAuthenticated,
}: AdminAuthModalProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPasscode('');
    setConfirmPasscode('');
    setError('');

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = passcode.trim();
    if (!isConfigured) {
      if (trimmed.length < 4) {
        setError('관리자 비밀번호는 최소 4자 이상으로 설정해 주세요.');
        return;
      }
      if (trimmed !== confirmPasscode.trim()) {
        setError('비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    } else if (!trimmed) {
      setError('관리자 비밀번호를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isConfigured ? '/api/auth/login' : '/api/auth/setup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        token?: string;
        archive?: ArchiveData;
        error?: string;
      };

      if (!res.ok || !data.token || !data.archive) {
        setError(data.error || '관리자 인증에 실패했습니다.');
        return;
      }

      onAuthenticated(data.token, data.archive);
      onClose();
    } catch {
      setError('서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[440px] bg-[#FAF9F6] text-[#161616] border border-stone-300 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-[#F4F1EA] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <Lock className="w-4 h-4 text-[#1D3557]" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#1D3557]" />
            )}
            <span className="font-mono text-xs tracking-wider text-stone-600 uppercase">
              {isConfigured ? 'ADMINISTRATOR ACCESS' : 'INITIAL ADMIN SETUP'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="관리자 인증 창 닫기"
            className="p-1.5 text-stone-600 hover:text-[#161616] hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          <h2
            id="admin-auth-title"
            className="font-serif text-2xl font-semibold text-[#161616]"
          >
            {isConfigured ? '관리자 모드 로그인' : '관리자 비밀번호 최초 설정'}
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            {isConfigured
              ? '일반 열람자는 영상과 자료를 열람만 할 수 있습니다. 강의 영상, 게시판 자료, 기고 원고를 등록하거나 수정하려면 관리자 비밀번호를 입력하세요.'
              : '아직 관리자 비밀번호가 설정되지 않았습니다. 교수님께서 사용하실 관리자 비밀번호를 한 번 설정하시면 이후 관리자 모드에서만 게시물을 올리고 관리할 수 있습니다.'}
          </p>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              {isConfigured ? '관리자 비밀번호' : '새 관리자 비밀번호 (4자 이상)'}
            </label>
            <input
              type="password"
              required
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
            />
          </div>

          {!isConfigured && (
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                비밀번호 확인
              </label>
              <input
                type="password"
                required
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력하세요"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-stone-300 bg-white hover:bg-[#EFECE5] cursor-pointer whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting
                ? '확인 중...'
                : isConfigured
                ? '관리자 모드 입장'
                : '비밀번호 설정 후 입장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
