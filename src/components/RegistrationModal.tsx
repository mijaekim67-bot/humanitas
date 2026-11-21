import { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { Lecture, LectureSeries } from '../types/archive.ts';

interface RegistrationModalProps {
  isOpen: boolean;
  lectures: Lecture[];
  seriesList: LectureSeries[];
  initialSelection?: string;
  affiliationTitle: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

function formatKoreanPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function RegistrationModal({
  isOpen,
  lectures,
  seriesList,
  initialSelection,
  affiliationTitle,
  onClose,
  onSubmitted,
}: RegistrationModalProps) {
  const publishedLectures = lectures.filter((l) => l.status === 'published');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState<{
    name: string;
    phone: string;
    lectureTitle: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSubmittedRecord(null);
    if (initialSelection) {
      setSelectedValue(initialSelection);
    } else if (publishedLectures.length > 0) {
      setSelectedValue(`lec:${publishedLectures[0].id}`);
    } else if (seriesList.length > 0) {
      setSelectedValue(`series:${seriesList[0].id}`);
    }
  }, [isOpen, initialSelection, publishedLectures.length, seriesList.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolveSelection = (val: string): { lectureId: string; lectureTitle: string } => {
    if (val.startsWith('series:')) {
      const id = val.replace('series:', '');
      const s = seriesList.find((item) => item.id === id);
      return {
        lectureId: id,
        lectureTitle: s ? `[정기 강좌] ${s.title}` : '정기 강좌',
      };
    }
    if (val.startsWith('lec:')) {
      const id = val.replace('lec:', '');
      const lec = lectures.find((item) => item.id === id);
      return {
        lectureId: id,
        lectureTitle: lec ? `${lec.accessionCode} · ${lec.title}` : '선택한 강의',
      };
    }
    return { lectureId: '', lectureTitle: val };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const digits = cleanPhone.replace(/[^0-9]/g, '');

    if (!cleanName) {
      setError('성함을 입력해 주세요.');
      return;
    }
    if (digits.length < 9) {
      setError('연락 가능한 휴대 번호를 정확히 입력해 주세요.');
      return;
    }

    const { lectureId, lectureTitle } = resolveSelection(selectedValue);
    if (!lectureTitle) {
      setError('원하시는 강의를 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          lectureId,
          lectureTitle,
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || '강의 신청 접수 중 오류가 발생했습니다.');
      }

      setSubmittedRecord({
        name: cleanName,
        phone: cleanPhone,
        lectureTitle,
      });
      setName('');
      setPhone('');
      setNote('');
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청 접수에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#FAF9F6] text-[#161616] border border-stone-300 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-[#F4F1EA] flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-widest text-stone-500 uppercase">
              LECTURE APPLICATION
            </p>
            <h2
              id="registration-modal-title"
              className="font-serif text-xl font-semibold text-[#161616]"
            >
              강의 신청
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="강의 신청 창 닫기"
            className="p-1.5 text-stone-600 hover:text-[#161616] hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedRecord ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#1D3557] mx-auto mb-4 stroke-[1.5]" />
            <h3 className="font-serif text-2xl font-semibold text-[#161616]">
              강의 신청이 접수되었습니다
            </h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              {affiliationTitle}에서 신청 내역을 확인한 후 안내 연락을 드리겠습니다.
            </p>

            <dl className="mt-6 text-left border border-stone-200 bg-white divide-y divide-stone-200 text-sm">
              <div className="px-4 py-3 flex justify-between gap-4">
                <dt className="text-stone-500 shrink-0">성함</dt>
                <dd className="font-medium text-[#161616]">{submittedRecord.name}</dd>
              </div>
              <div className="px-4 py-3 flex justify-between gap-4">
                <dt className="text-stone-500 shrink-0">휴대 번호</dt>
                <dd className="font-mono tabular-nums text-[#161616]">
                  {submittedRecord.phone}
                </dd>
              </div>
              <div className="px-4 py-3 flex justify-between gap-4">
                <dt className="text-stone-500 shrink-0">신청 강의</dt>
                <dd className="font-medium text-[#161616] text-right">
                  {submittedRecord.lectureTitle}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors cursor-pointer"
            >
              확인하고 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <p className="text-xs text-stone-600 leading-relaxed">
              수강을 원하시는 강의를 선택하고 성함과 휴대 번호를 남겨주시면 수강 안내를 드립니다.
            </p>

            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                이름 *
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 text-[#161616] placeholder:text-stone-400 focus:outline-none focus:border-[#1D3557]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                휴대 번호 *
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(formatKoreanPhone(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-stone-300 text-[#161616] placeholder:text-stone-400 focus:outline-none focus:border-[#1D3557]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-lecture"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                원하는 강의 선택 *
              </label>
              <select
                id="reg-lecture"
                required
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 text-[#161616] focus:outline-none focus:border-[#1D3557] cursor-pointer"
              >
                {seriesList.length > 0 && (
                  <optgroup label="정기 강좌 시리즈 전체 수강">
                    {seriesList.map((s) => (
                      <option key={s.id} value={`series:${s.id}`}>
                        [강좌] {s.title} ({s.semester})
                      </option>
                    ))}
                  </optgroup>
                )}
                {publishedLectures.length > 0 && (
                  <optgroup label="개별 영상 강의">
                    {publishedLectures.map((lec) => (
                      <option key={lec.id} value={`lec:${lec.id}`}>
                        {lec.accessionCode} · {lec.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="reg-note"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                문의 사항 (선택)
              </label>
              <textarea
                id="reg-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="수강 목적이나 궁금한 점이 있으시면 적어주세요."
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 text-[#161616] placeholder:text-stone-400 focus:outline-none focus:border-[#1D3557]"
              />
            </div>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                {error}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium border border-stone-300 text-stone-700 hover:bg-[#EFECE5] transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSubmitting ? '제출 중...' : '신청서 제출하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
