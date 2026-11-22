import { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Check,
  Download,
  FileUp,
  Lock,
  Film,
  FolderOpen,
  Settings,
  ListVideo,
  Pencil,
  Table2,
  Copy,
  ExternalLink,
  RefreshCw,
  Newspaper,
} from 'lucide-react';
import type {
  ApplicationStatus,
  ArchiveData,
  ColumnArticle,
  Lecture,
  LectureApplication,
  LectureChapter,
  LectureSeries,
  LectureStatus,
  ProfessorProfile,
  ReferenceItem,
} from '../types/archive.ts';
import { COVER_PRESETS } from '../data/defaultArchive.ts';
import { formatKoreanDate, parseVideoUrl } from '../utils/video.ts';

export type StudioTab = 'editor' | 'lectures' | 'series' | 'columns' | 'applications' | 'settings';

const APPS_SCRIPT_SNIPPET = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['신청일시', '이름', '휴대 번호', '원하는 강의', '메모', '처리 상태']);
  }
  var data = JSON.parse(e.postData.contents);
  var dt = new Date(data.createdAt || new Date()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  sheet.appendRow([dt, data.name || '', data.phone || '', data.lectureTitle || '', data.note || '', '접수됨']);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}`;

interface StudioDrawerProps {
  isOpen: boolean;
  initialTab: StudioTab;
  editingLecture: Lecture | null;
  editingColumn: ColumnArticle | null;
  archive: ArchiveData;
  applications: LectureApplication[];
  passcodeHeader: string;
  onPasscodeVerified: (code: string) => void;
  onClose: () => void;
  onSaveLecture: (lecture: Partial<Lecture>, isNew: boolean) => Promise<void>;
  onDeleteLecture: (id: string) => Promise<void>;
  onSaveSeries: (series: Partial<LectureSeries>, isNew: boolean) => Promise<void>;
  onDeleteSeries: (id: string) => Promise<void>;
  onSaveColumn: (column: Partial<ColumnArticle>, isNew: boolean) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
  onSaveProfile: (profile: Partial<ProfessorProfile>) => Promise<void>;
  onImportArchive: (data: ArchiveData) => Promise<void>;
  onFetchApplications: () => Promise<void>;
  onUpdateApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  onSyncApplicationsToSheet: () => Promise<number>;
  onEditSelect: (lecture: Lecture) => void;
  onClearEditing: () => void;
  onClearEditingColumn: () => void;
}

function createEmptyLecture(seriesList: LectureSeries[], count: number): Partial<Lecture> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    accessionCode: `LEC-${new Date().getFullYear()}-${String(count + 1).padStart(2, '0')}`,
    title: '',
    subtitle: '',
    seriesId: seriesList[0]?.id ?? '',
    status: 'published',
    publishedAt: today,
    duration: '35:00',
    videoUrl: '',
    sourceType: 'none',
    thumbnailUrl: COVER_PRESETS[0].url,
    figureCaption: '',
    summary: '',
    lectureNotes: '',
    chapters: [
      { id: `ch-${Date.now()}`, timestamp: '00:00', title: '도입 및 문제 제기', note: '' },
    ],
    references: [],
    featured: false,
  };
}

export function StudioDrawer({
  isOpen,
  initialTab,
  editingLecture,
  editingColumn,
  archive,
  applications,
  passcodeHeader,
  onPasscodeVerified,
  onClose,
  onSaveLecture,
  onDeleteLecture,
  onSaveSeries,
  onDeleteSeries,
  onSaveColumn,
  onDeleteColumn,
  onSaveProfile,
  onImportArchive,
  onFetchApplications,
  onUpdateApplicationStatus,
  onDeleteApplication,
  onSyncApplicationsToSheet,
  onEditSelect,
  onClearEditing,
  onClearEditingColumn,
}: StudioDrawerProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [unlocked, setUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Lecture Editor Form State
  const [form, setForm] = useState<Partial<Lecture>>(() =>
    createEmptyLecture(archive.series, archive.lectures.length)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Series Form State
  const [seriesForm, setSeriesForm] = useState<Partial<LectureSeries>>({
    code: '',
    title: '',
    semester: '',
    description: '',
  });
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);

  // Column Form State
  const createEmptyColumn = (): Partial<ColumnArticle> => {
    const nextNum = (archive.columns?.length ?? 0) + 1;
    return {
      issueNumber: `제${nextNum}회`,
      seriesTitle: `미재의 미술인문학산책 | 길 위에서 마음을 묻다`,
      publication: '따옴뉴스',
      publishedAt: new Date().toISOString().slice(0, 10),
      title: '',
      subtitle: '',
      summary: '',
      body: '',
      sidebarTitle: '',
      sidebarBody: '',
      coverImageUrl: COVER_PRESETS[3].url,
      figureCaption: '',
      pdfUrl: '',
      status: 'published',
    };
  };
  const [columnForm, setColumnForm] = useState<Partial<ColumnArticle>>(createEmptyColumn);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(editingColumn?.id ?? null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState<ProfessorProfile>(archive.profile);
  const [newPasscode, setNewPasscode] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setFeedback(null);
    setConfirmDeleteId(null);

    if (!archive.profile.hasPasscode || passcodeHeader) {
      setUnlocked(true);
      void onFetchApplications();
    } else {
      setUnlocked(false);
    }
  }, [isOpen, initialTab, archive.profile.hasPasscode, passcodeHeader, onFetchApplications]);

  useEffect(() => {
    if (editingLecture) {
      setForm({
        ...editingLecture,
        chapters: editingLecture.chapters.map((c) => ({ ...c })),
        references: editingLecture.references.map((r) => ({ ...r })),
      });
      setActiveTab('editor');
    } else {
      setForm(createEmptyLecture(archive.series, archive.lectures.length));
    }
  }, [editingLecture, archive.series, archive.lectures.length]);

  useEffect(() => {
    if (editingColumn) {
      setEditingColumnId(editingColumn.id);
      setColumnForm({ ...editingColumn });
      setActiveTab('columns');
    } else {
      setEditingColumnId(null);
      setColumnForm(createEmptyColumn());
    }
  }, [editingColumn, archive.columns?.length]);

  useEffect(() => {
    setProfileForm(archive.profile);
  }, [archive.profile]);

  if (!isOpen) return null;

  const parsedPreview = parseVideoUrl(form.videoUrl || '');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      if (!res.ok) {
        setAuthError('스튜디오 비밀번호가 일치하지 않습니다.');
        return;
      }
      onPasscodeVerified(passcodeInput);
      setUnlocked(true);
      setPasscodeInput('');
      void onFetchApplications();
    } catch {
      setAuthError('인증 확인 중 오류가 발생했습니다.');
    }
  };

  const handleFileUpload = async (
    file: File,
    target: 'video' | 'thumbnail' | 'column-cover' | 'column-pdf'
  ) => {
    setUploadProgress(
      target === 'video'
        ? `영상 파일 업로드 중 (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`
        : target === 'column-pdf'
        ? '신문 지면 PDF 업로드 중...'
        : '커버 이미지 업로드 중...'
    );
    setFeedback(null);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name),
          ...(passcodeHeader ? { 'x-studio-passcode': passcodeHeader } : {}),
        },
        body: file,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || '파일 업로드에 실패했습니다.');
      }

      const data = (await res.json()) as { url: string };
      if (target === 'video') {
        setForm((prev) => ({
          ...prev,
          videoUrl: data.url,
          sourceType: 'upload',
        }));
      } else if (target === 'thumbnail') {
        setForm((prev) => ({
          ...prev,
          thumbnailUrl: data.url,
        }));
      } else if (target === 'column-cover') {
        setColumnForm((prev) => ({
          ...prev,
          coverImageUrl: data.url,
        }));
      } else {
        setColumnForm((prev) => ({
          ...prev,
          pdfUrl: data.url,
        }));
      }
      setFeedback({
        type: 'ok',
        text:
          target === 'video'
            ? '영상 파일이 서버에 업로드되었습니다.'
            : target === 'column-pdf'
            ? 'PDF 파일이 서버에 업로드되었습니다.'
            : '커버 이미지가 업로드되었습니다.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : '업로드 오류',
      });
    } finally {
      setUploadProgress('');
    }
  };

  const handleSubmitLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      setFeedback({ type: 'err', text: '강의 제목을 반드시 입력해 주세요.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const videoSource = parseVideoUrl(form.videoUrl || '');
      const payload: Partial<Lecture> = {
        ...form,
        sourceType: videoSource.sourceType,
      };
      const isNew = !editingLecture;
      await onSaveLecture(payload, isNew);
      setFeedback({
        type: 'ok',
        text: isNew ? '새 강의 영상이 아카이브에 등록되었습니다.' : '강의 정보가 저장되었습니다.',
      });
      if (isNew) {
        setForm(createEmptyLecture(archive.series, archive.lectures.length + 1));
      }
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : '저장에 실패했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addChapter = () => {
    const next: LectureChapter = {
      id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: '00:00',
      title: '',
      note: '',
    };
    setForm((prev) => ({
      ...prev,
      chapters: [...(prev.chapters ?? []), next],
    }));
  };

  const updateChapter = (id: string, patch: Partial<LectureChapter>) => {
    setForm((prev) => ({
      ...prev,
      chapters: (prev.chapters ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeChapter = (id: string) => {
    setForm((prev) => ({
      ...prev,
      chapters: (prev.chapters ?? []).filter((c) => c.id !== id),
    }));
  };

  const addReference = () => {
    const next: ReferenceItem = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creatorOrAuthor: '',
      citation: '',
      year: '',
    };
    setForm((prev) => ({
      ...prev,
      references: [...(prev.references ?? []), next],
    }));
  };

  const updateReference = (id: string, patch: Partial<ReferenceItem>) => {
    setForm((prev) => ({
      ...prev,
      references: (prev.references ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeReference = (id: string) => {
    setForm((prev) => ({
      ...prev,
      references: (prev.references ?? []).filter((r) => r.id !== id),
    }));
  };

  const handleSaveSeriesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesForm.title?.trim()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await onSaveSeries(
        editingSeriesId ? { ...seriesForm, id: editingSeriesId } : seriesForm,
        !editingSeriesId
      );
      setSeriesForm({ code: '', title: '', semester: '', description: '' });
      setEditingSeriesId(null);
      setFeedback({ type: 'ok', text: '강좌 시리즈가 저장되었습니다.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : '시리즈 저장 실패' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnForm.title?.trim()) {
      setFeedback({ type: 'err', text: '원고 제목을 입력해 주세요.' });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const isNew = !editingColumnId;
      await onSaveColumn(
        editingColumnId ? { ...columnForm, id: editingColumnId } : columnForm,
        isNew
      );
      setFeedback({
        type: 'ok',
        text: isNew ? '새 기고 원고가 아카이브에 등록되었습니다.' : '기고 원고가 수정되었습니다.',
      });
      if (isNew) {
        setColumnForm(createEmptyColumn());
      }
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : '원고 저장 실패' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload: Partial<ProfessorProfile> = {
        ...profileForm,
      };
      if (newPasscode !== '') {
        payload.studioPasscode = newPasscode;
      }
      await onSaveProfile(payload);
      if (newPasscode) {
        onPasscodeVerified(newPasscode);
        setNewPasscode('');
      }
      setFeedback({ type: 'ok', text: '교수자 정보 및 사이트 설정이 저장되었습니다.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : '설정 저장 실패' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aesthetics-archive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ArchiveData;
      await onImportArchive(parsed);
      setFeedback({ type: 'ok', text: '백업 아카이브 JSON을 성공적으로 불러왔습니다.' });
    } catch {
      setFeedback({ type: 'err', text: 'JSON 파일을 읽는 중 오류가 발생했습니다.' });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="교수자 영상 등록 및 스튜디오 관리"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[920px] bg-[#FAF9F6] text-[#161616] h-full flex flex-col border-l border-stone-300 shadow-2xl">
        {/* Studio Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4 bg-[#F4F1EA] shrink-0">
          <div>
            <p className="font-mono text-[11px] tracking-widest text-stone-500 uppercase">
              PROFESSOR PUBLISHING STUDIO
            </p>
            <h2 className="font-serif text-xl font-semibold text-[#161616]">
              교수자 영상 등록 및 아카이브 관리
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="스튜디오 닫기"
            className="p-2 text-stone-600 hover:text-[#161616] hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Passcode Gate if locked */}
        {!unlocked ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <form
              onSubmit={handleUnlock}
              className="w-full max-w-sm border border-stone-200 bg-white p-8"
            >
              <Lock className="w-6 h-6 text-[#1D3557] mb-3" />
              <h3 className="font-serif text-2xl font-semibold text-[#161616]">
                교수자 스튜디오 인증
              </h3>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                영상을 등록하거나 웹사이트 구성을 변경하려면 설정된 스튜디오 비밀번호를 입력하세요.
              </p>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="비밀번호 입력"
                required
                className="mt-5 w-full px-3.5 py-2.5 text-sm border border-stone-300 focus:outline-none focus:border-[#1D3557]"
              />
              {authError && (
                <p className="mt-2 text-xs text-red-700">{authError}</p>
              )}
              <button
                type="submit"
                className="mt-5 w-full py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors cursor-pointer"
              >
                잠금 해제
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-6 border-b border-stone-200 bg-[#FAF9F6] flex items-center gap-1 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('editor');
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'editor'
                    ? 'border-[#1D3557] text-[#1D3557]'
                    : 'border-transparent text-stone-600 hover:text-[#161616]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{editingLecture ? '강의 수정 중' : '새 영상 등록'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('lectures');
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'lectures'
                    ? 'border-[#1D3557] text-[#1D3557]'
                    : 'border-transparent text-stone-600 hover:text-[#161616]'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span>전체 강의 관리 ({archive.lectures.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('series');
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'series'
                    ? 'border-[#1D3557] text-[#1D3557]'
                    : 'border-transparent text-stone-600 hover:text-[#161616]'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>강좌 시리즈 ({archive.series.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('columns');
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'columns'
                    ? 'border-[#1D3557] text-[#1D3557]'
                    : 'border-transparent text-stone-600 hover:text-[#161616]'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>기고 칼럼 ({archive.columns?.length ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('applications');
                  setFeedback(null);
                  void onFetchApplications();
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'applications'
                    ? 'border-[#1D3557] text-[#1D3557]'
                    : 'border-transparent text-stone-600 hover:text-[#161616]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>수강 신청 · 구글 시트 ({applications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-[#1D3557] text-[#1D3557]'
                    : 'border-transparent text-stone-600 hover:text-[#161616]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>사이트 설정 · 백업</span>
              </button>
            </div>

            {/* Feedback Banner */}
            {(feedback || uploadProgress) && (
              <div
                className={`px-6 py-2.5 text-xs font-medium border-b shrink-0 ${
                  feedback?.type === 'err'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-[#EEF2F7] border-[#CBD5E1] text-[#1D3557]'
                }`}
              >
                {uploadProgress || feedback?.text}
              </div>
            )}

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: LECTURE EDITOR */}
              {activeTab === 'editor' && (
                <form onSubmit={handleSubmitLecture} className="space-y-8 max-w-3xl">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#161616]">
                        {editingLecture ? `강의 수정: ${editingLecture.accessionCode}` : '새 미술·미학 강의 영상 등록'}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        YouTube/Vimeo 링크를 연결하거나 컴퓨터에 저장된 MP4 영상 파일을 직접 올릴 수 있습니다.
                      </p>
                    </div>
                    {editingLecture && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearEditing();
                          setForm(createEmptyLecture(archive.series, archive.lectures.length));
                        }}
                        className="text-xs text-[#1D3557] hover:underline underline-offset-4 cursor-pointer shrink-0"
                      >
                        + 새 강의 작성으로 전환
                      </button>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        강의 제목 *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.title || ''}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="예: 칸트의 무관심적 쾌와 숭고의 미학"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        부제 또는 핵심 주제
                      </label>
                      <input
                        type="text"
                        value={form.subtitle || ''}
                        onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                        placeholder="예: 『판단력 비판』 제1부 미적 판단력 분석을 중심으로"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        강좌 시리즈
                      </label>
                      <select
                        value={form.seriesId || ''}
                        onChange={(e) => setForm((p) => ({ ...p, seriesId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      >
                        {archive.series.map((s) => (
                          <option key={s.id} value={s.id}>
                            [{s.code}] {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        아카이브 등록 번호
                      </label>
                      <input
                        type="text"
                        value={form.accessionCode || ''}
                        onChange={(e) => setForm((p) => ({ ...p, accessionCode: e.target.value }))}
                        placeholder="LEC-2026-07"
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        게시 상태
                      </label>
                      <select
                        value={form.status || 'published'}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, status: e.target.value as LectureStatus }))
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      >
                        <option value="published">즉시 공개 (웹사이트 게시)</option>
                        <option value="draft">비공개 초안 (교수자만 확인)</option>
                        <option value="scheduled">게시 예정</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1.5">
                          게시 날짜
                        </label>
                        <input
                          type="date"
                          value={form.publishedAt || ''}
                          onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1.5">
                          러닝타임
                        </label>
                        <input
                          type="text"
                          value={form.duration || ''}
                          onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                          placeholder="42:15"
                          className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Video Source Registration */}
                  <div className="p-5 border border-stone-200 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-[#161616]">
                          영상 소스 연결 (YouTube · Vimeo · 직접 업로드)
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          링크를 붙여넣거나 MP4/WebM 동영상 파일을 직접 업로드하세요.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E7E0D3] text-[#161616] border border-stone-300 cursor-pointer whitespace-nowrap shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>영상 파일 올리기</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(file, 'video');
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={form.videoUrl || ''}
                        onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=... 또는 https://vimeo.com/... 또는 MP4 주소"
                        className="flex-1 px-3.5 py-2 text-sm font-mono bg-[#FAF9F6] border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                      {parsedPreview.suggestedThumbnail && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              thumbnailUrl: parsedPreview.suggestedThumbnail ?? p.thumbnailUrl,
                            }))
                          }
                          className="px-3 py-2 text-xs font-medium border border-stone-300 bg-[#F3EFE6] hover:bg-[#E7E0D3] whitespace-nowrap cursor-pointer"
                        >
                          YouTube 썸네일 적용
                        </button>
                      )}
                    </div>

                    {/* Live Preview */}
                    {parsedPreview.embedUrl ? (
                      <div className="aspect-video w-full max-w-md border border-stone-200 overflow-hidden bg-black">
                        <iframe
                          src={parsedPreview.embedUrl}
                          title="미리보기"
                          className="w-full h-full border-0"
                        />
                      </div>
                    ) : parsedPreview.directUrl ? (
                      <div className="aspect-video w-full max-w-md border border-stone-200 overflow-hidden bg-black">
                        <video src={parsedPreview.directUrl} controls className="w-full h-full" />
                      </div>
                    ) : null}
                  </div>

                  {/* Thumbnail Selection */}
                  <div className="p-5 border border-stone-200 bg-white space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#161616]">
                        대표 도판 / 썸네일 이미지
                      </h4>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E7E0D3] text-[#161616] border border-stone-300 cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>이미지 업로드</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(file, 'thumbnail');
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-5 gap-2.5">
                      {COVER_PRESETS.map((preset) => {
                        const selected = form.thumbnailUrl === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, thumbnailUrl: preset.url }))}
                            className={`relative aspect-video overflow-hidden border transition-all cursor-pointer ${
                              selected ? 'border-[#1D3557] ring-2 ring-[#1D3557]' : 'border-stone-200 opacity-80 hover:opacity-100'
                            }`}
                            title={preset.label}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-full object-cover"
                            />
                            {selected && (
                              <span className="absolute top-1 right-1 w-4 h-4 bg-[#1D3557] text-white flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={form.thumbnailUrl || ''}
                        onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))}
                        placeholder="썸네일 이미지 경로 또는 URL"
                        className="px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                      <input
                        type="text"
                        value={form.figureCaption || ''}
                        onChange={(e) => setForm((p) => ({ ...p, figureCaption: e.target.value }))}
                        placeholder="도판 설명 (예: 도판 1 — 작품명 및 해설)"
                        className="px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                    </div>
                  </div>

                  {/* Summary & Curatorial Lecture Notes */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        강의 핵심 요약 (목록 카드 표시용, 2~3문장 권장)
                      </label>
                      <textarea
                        rows={2}
                        value={form.summary || ''}
                        onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                        placeholder="이번 강의에서 다루는 핵심 미학적 질문과 감상 포인트를 간략히 요약하세요."
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1.5">
                        상세 강의 해설 및 연구 노트
                      </label>
                      <textarea
                        rows={6}
                        value={form.lectureNotes || ''}
                        onChange={(e) => setForm((p) => ({ ...p, lectureNotes: e.target.value }))}
                        placeholder="학생들이 영상을 시청하며 함께 읽을 수 있는 심화 해설을 작성하세요."
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:outline-none focus:border-[#1D3557] leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Chapters Builder */}
                  <div className="p-5 border border-stone-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#161616]">
                        타임코드 목차 구성
                      </h4>
                      <button
                        type="button"
                        onClick={addChapter}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1D3557] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>목차 추가</span>
                      </button>
                    </div>

                    {(form.chapters ?? []).map((ch, idx) => (
                      <div key={ch.id} className="grid grid-cols-12 gap-2 items-start">
                        <input
                          type="text"
                          value={ch.timestamp}
                          onChange={(e) => updateChapter(ch.id, { timestamp: e.target.value })}
                          placeholder="00:00"
                          aria-label={`목차 ${idx + 1} 시간`}
                          className="col-span-3 sm:col-span-2 px-2.5 py-2 text-xs font-mono border border-stone-300"
                        />
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => updateChapter(ch.id, { title: e.target.value })}
                          placeholder="장 제목"
                          className="col-span-8 sm:col-span-4 px-2.5 py-2 text-xs border border-stone-300"
                        />
                        <input
                          type="text"
                          value={ch.note || ''}
                          onChange={(e) => updateChapter(ch.id, { note: e.target.value })}
                          placeholder="간단한 개념 메모"
                          className="col-span-11 sm:col-span-5 px-2.5 py-2 text-xs border border-stone-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeChapter(ch.id)}
                          aria-label="목차 삭제"
                          className="col-span-1 py-2 flex justify-center text-stone-400 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* References Builder */}
                  <div className="p-5 border border-stone-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#161616]">
                        참고 도판 및 문헌 목록
                      </h4>
                      <button
                        type="button"
                        onClick={addReference}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1D3557] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>문헌 추가</span>
                      </button>
                    </div>

                    {(form.references ?? []).map((ref) => (
                      <div key={ref.id} className="grid grid-cols-12 gap-2 items-start">
                        <input
                          type="text"
                          value={ref.creatorOrAuthor}
                          onChange={(e) =>
                            updateReference(ref.id, { creatorOrAuthor: e.target.value })
                          }
                          placeholder="작가 / 저자"
                          className="col-span-5 sm:col-span-3 px-2.5 py-2 text-xs border border-stone-300"
                        />
                        <input
                          type="text"
                          value={ref.citation}
                          onChange={(e) => updateReference(ref.id, { citation: e.target.value })}
                          placeholder="작품명 또는 저서명"
                          className="col-span-6 sm:col-span-6 px-2.5 py-2 text-xs border border-stone-300"
                        />
                        <input
                          type="text"
                          value={ref.year}
                          onChange={(e) => updateReference(ref.id, { year: e.target.value })}
                          placeholder="연도"
                          className="col-span-11 sm:col-span-2 px-2.5 py-2 text-xs font-mono border border-stone-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeReference(ref.id)}
                          aria-label="문헌 삭제"
                          className="col-span-1 py-2 flex justify-center text-stone-400 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Featured Toggle + Submit */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-200">
                    <label className="inline-flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(form.featured)}
                        onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
                        className="w-4 h-4 accent-[#1D3557]"
                      />
                      <span>웹사이트 최상단 대표 특강(Featured)으로 지정</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isSaving
                        ? '저장 중...'
                        : editingLecture
                        ? '변경사항 저장하기'
                        : '강의 아카이브에 게시하기'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: MANAGE ALL LECTURES */}
              {activeTab === 'lectures' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <h3 className="font-serif text-xl font-semibold">등록된 전체 강의 목록</h3>
                    <button
                      type="button"
                      onClick={() => {
                        onClearEditing();
                        setForm(createEmptyLecture(archive.series, archive.lectures.length));
                        setActiveTab('editor');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 영상 등록</span>
                    </button>
                  </div>

                  <div className="divide-y divide-stone-200 border border-stone-200 bg-white">
                    {archive.lectures.map((lec) => {
                      const s = archive.series.find((sr) => sr.id === lec.seriesId);
                      return (
                        <div
                          key={lec.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-500 tabular-nums">
                              <span>{lec.accessionCode}</span>
                              <span>·</span>
                              <span>{s?.title || '미분류'}</span>
                              <span>·</span>
                              <span>{formatKoreanDate(lec.publishedAt)}</span>
                              {lec.featured && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#1D3557] font-semibold">대표 특강</span>
                                </>
                              )}
                            </div>
                            <p className="mt-1 font-serif text-base font-medium text-[#161616] truncate">
                              {lec.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                void onSaveLecture(
                                  {
                                    ...lec,
                                    status: lec.status === 'published' ? 'draft' : 'published',
                                  },
                                  false
                                )
                              }
                              className={`px-2.5 py-1 text-xs font-mono border cursor-pointer ${
                                lec.status === 'published'
                                  ? 'border-[#1D3557] text-[#1D3557] bg-[#EEF2F7]'
                                  : 'border-stone-300 text-stone-600 bg-stone-50'
                              }`}
                            >
                              {lec.status === 'published' ? '공개 중' : '초안'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditSelect(lec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-stone-300 hover:bg-[#EFECE5] cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>수정</span>
                            </button>

                            {confirmDeleteId === lec.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void onDeleteLecture(lec.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 text-xs bg-red-700 text-white cursor-pointer"
                                >
                                  삭제 확인
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs border border-stone-300 cursor-pointer"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(lec.id)}
                                aria-label="강의 삭제"
                                className="p-1.5 text-stone-400 hover:text-red-700 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: SERIES MANAGER */}
              {activeTab === 'series' && (
                <div className="space-y-8 max-w-2xl">
                  <form
                    onSubmit={handleSaveSeriesSubmit}
                    className="p-5 border border-stone-200 bg-white space-y-4"
                  >
                    <h3 className="font-serif text-lg font-semibold">
                      {editingSeriesId ? '강좌 시리즈 수정' : '새 정기 강좌 시리즈 만들기'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={seriesForm.code || ''}
                        onChange={(e) => setSeriesForm((p) => ({ ...p, code: e.target.value }))}
                        placeholder="과목 코드 (예: AES-202)"
                        className="px-3 py-2 text-sm font-mono border border-stone-300"
                      />
                      <input
                        type="text"
                        value={seriesForm.semester || ''}
                        onChange={(e) => setSeriesForm((p) => ({ ...p, semester: e.target.value }))}
                        placeholder="학기/구분 (예: 2026 겨울 특강)"
                        className="px-3 py-2 text-sm border border-stone-300"
                      />
                      <input
                        type="text"
                        required
                        value={seriesForm.title || ''}
                        onChange={(e) => setSeriesForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="시리즈 제목 *"
                        className="sm:col-span-2 px-3 py-2 text-sm border border-stone-300"
                      />
                      <textarea
                        rows={2}
                        value={seriesForm.description || ''}
                        onChange={(e) =>
                          setSeriesForm((p) => ({ ...p, description: e.target.value }))
                        }
                        placeholder="강좌 시리즈 소개"
                        className="sm:col-span-2 px-3 py-2 text-sm border border-stone-300"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] cursor-pointer"
                      >
                        {editingSeriesId ? '시리즈 업데이트' : '시리즈 추가'}
                      </button>
                      {editingSeriesId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSeriesId(null);
                            setSeriesForm({ code: '', title: '', semester: '', description: '' });
                          }}
                          className="px-3 py-2 text-xs border border-stone-300 cursor-pointer"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="divide-y divide-stone-200 border border-stone-200 bg-white">
                    {archive.series.map((s) => (
                      <div key={s.id} className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-xs text-stone-500">
                            {s.code} · {s.semester}
                          </p>
                          <h4 className="font-serif text-base font-semibold text-[#161616] mt-0.5">
                            {s.title}
                          </h4>
                          <p className="text-xs text-stone-600 mt-1">{s.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSeriesId(s.id);
                              setSeriesForm(s);
                            }}
                            className="px-2.5 py-1 text-xs border border-stone-300 hover:bg-[#EFECE5] cursor-pointer"
                          >
                            수정
                          </button>
                          {archive.series.length > 1 && (
                            <button
                              type="button"
                              onClick={() => void onDeleteSeries(s.id)}
                              aria-label="시리즈 삭제"
                              className="p-1.5 text-stone-400 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: COLUMNS ("미재의 미술인문학산책") */}
              {activeTab === 'columns' && (
                <div className="space-y-8 max-w-3xl">
                  <form
                    onSubmit={handleSaveColumnSubmit}
                    className="p-5 border border-stone-200 bg-white space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-[#161616]">
                          {editingColumnId
                            ? `기고 원고 수정 (${columnForm.issueNumber || '편집 중'})`
                            : '따옴뉴스 월간 기고 원고 등록'}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          매달 연재하는 「미재의 미술인문학산책 | 길 위에서 마음을 묻다」 원고와 신문 PDF를 등록합니다.
                        </p>
                      </div>
                      {editingColumnId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumnId(null);
                            onClearEditingColumn();
                            setColumnForm(createEmptyColumn());
                          }}
                          className="text-xs text-[#1D3557] hover:underline cursor-pointer shrink-0"
                        >
                          + 새 원고 등록으로 전환
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          회차
                        </label>
                        <input
                          type="text"
                          value={columnForm.issueNumber || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, issueNumber: e.target.value }))
                          }
                          placeholder="제5회"
                          className="w-full px-3 py-2 text-xs font-mono border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          게재 매체·지면
                        </label>
                        <input
                          type="text"
                          value={columnForm.publication || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, publication: e.target.value }))
                          }
                          placeholder="따옴뉴스 · 제16면"
                          className="w-full px-3 py-2 text-xs border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          게재일
                        </label>
                        <input
                          type="date"
                          value={columnForm.publishedAt || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, publishedAt: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs font-mono border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          연재 타이틀
                        </label>
                        <input
                          type="text"
                          value={columnForm.seriesTitle || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, seriesTitle: e.target.value }))
                          }
                          placeholder="미재의 미술인문학산책 | 길 위에서 마음을 묻다 ⑤"
                          className="w-full px-3 py-2 text-xs border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          기사 제목 *
                        </label>
                        <input
                          type="text"
                          required
                          value={columnForm.title || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="기사 본제목을 입력하세요"
                          className="w-full px-3 py-2 text-sm border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          부제 (리드 문장)
                        </label>
                        <input
                          type="text"
                          value={columnForm.subtitle || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, subtitle: e.target.value }))
                          }
                          placeholder="기사 부제를 입력하세요"
                          className="w-full px-3 py-2 text-xs border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          요약 (목록 표시용)
                        </label>
                        <textarea
                          rows={2}
                          value={columnForm.summary || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, summary: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          원고 본문
                        </label>
                        <textarea
                          rows={8}
                          value={columnForm.body || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, body: e.target.value }))
                          }
                          placeholder="문단 사이는 빈 줄(Enter 두 번)로 구분하세요."
                          className="w-full px-3 py-2 text-xs border border-stone-300 leading-relaxed"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          보조 박스 제목 (선택 — 예: 인물·건축가 해설)
                        </label>
                        <input
                          type="text"
                          value={columnForm.sidebarTitle || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, sidebarTitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          보조 박스 내용 (선택)
                        </label>
                        <textarea
                          rows={3}
                          value={columnForm.sidebarBody || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, sidebarBody: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-stone-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-stone-700">대표 사진</span>
                          <label className="text-[11px] text-[#1D3557] hover:underline cursor-pointer">
                            사진 업로드
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(file, 'column-cover');
                              }}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={columnForm.coverImageUrl || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, coverImageUrl: e.target.value }))
                          }
                          placeholder="/src/assets/images/..."
                          className="w-full px-3 py-2 text-xs font-mono border border-stone-300"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-stone-700">신문 지면 PDF</span>
                          <label className="text-[11px] text-[#1D3557] hover:underline cursor-pointer">
                            PDF 업로드
                            <input
                              type="file"
                              accept="application/pdf"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(file, 'column-pdf');
                              }}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={columnForm.pdfUrl || ''}
                          onChange={(e) =>
                            setColumnForm((p) => ({ ...p, pdfUrl: e.target.value }))
                          }
                          placeholder="/uploads/..."
                          className="w-full px-3 py-2 text-xs font-mono border border-stone-300"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <select
                        value={columnForm.status || 'published'}
                        onChange={(e) =>
                          setColumnForm((p) => ({
                            ...p,
                            status: e.target.value as 'published' | 'draft',
                          }))
                        }
                        className="px-3 py-2 text-xs border border-stone-300 bg-white"
                      >
                        <option value="published">공개 게시</option>
                        <option value="draft">비공개 초안</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] cursor-pointer"
                      >
                        {editingColumnId ? '원고 수정 저장' : '기고 원고 게시하기'}
                      </button>
                    </div>
                  </form>

                  {/* Existing Columns List */}
                  <div className="divide-y divide-stone-200 border border-stone-200 bg-white">
                    {(archive.columns ?? []).map((col) => (
                      <div key={col.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-stone-500 tabular-nums">
                            {col.issueNumber} · {col.publication} · {formatKoreanDate(col.publishedAt)}
                          </p>
                          <h4 className="font-serif text-base font-semibold text-[#161616] truncate mt-0.5">
                            {col.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColumnId(col.id);
                              setColumnForm({ ...col });
                            }}
                            className="px-2.5 py-1 text-xs border border-stone-300 hover:bg-[#EFECE5] cursor-pointer"
                          >
                            불러와 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingColumnId === col.id) {
                                setEditingColumnId(null);
                                onClearEditingColumn();
                                setColumnForm(createEmptyColumn());
                              }
                              void onDeleteColumn(col.id);
                            }}
                            aria-label="원고 삭제"
                            className="p-1.5 text-stone-400 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: APPLICATIONS & GOOGLE SHEETS */}
              {activeTab === 'applications' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#161616]">
                        강의 신청 접수 현황 및 구글 시트 연동
                      </h3>
                      <p className="text-xs text-stone-600 mt-1">
                        메인 화면의 「강의 신청」 버튼으로 접수된 신청자 명단입니다. CSV 또는 구글 시트 자동 전송으로 열어보실 수 있습니다.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={`/api/applications/export.csv${
                          passcodeHeader
                            ? `?passcode=${encodeURIComponent(passcodeHeader)}`
                            : ''
                        }`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>구글 시트용 CSV 다운로드</span>
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          const STATUS_KO: Record<ApplicationStatus, string> = {
                            pending: '접수됨',
                            contacted: '안내 완료',
                            enrolled: '수강 확정',
                          };
                          const header = '신청일시\t이름\t휴대 번호\t원하는 강의\t메모\t처리 상태';
                          const rows = applications.map((a) =>
                            [
                              new Date(a.createdAt).toLocaleString('ko-KR'),
                              a.name,
                              a.phone,
                              a.lectureTitle,
                              (a.note ?? '').replace(/\s+/g, ' '),
                              STATUS_KO[a.status],
                            ].join('\t')
                          );
                          await navigator.clipboard.writeText([header, ...rows].join('\n'));
                          setFeedback({
                            type: 'ok',
                            text: '표 데이터가 복사되었습니다. 구글 시트 A1 셀에서 Ctrl+V(붙여넣기) 하세요.',
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 bg-white hover:bg-[#F3EFE6] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>구글 시트 붙여넣기 복사</span>
                      </button>
                      {archive.profile.googleSheetUrl && (
                        <a
                          href={archive.profile.googleSheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#1D3557] text-[#1D3557] hover:bg-[#EEF2F7] transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>내 구글 시트 열기</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Applications Ledger */}
                  {applications.length === 0 ? (
                    <div className="p-10 border border-stone-200 bg-white text-center">
                      <p className="font-serif text-lg text-stone-700">
                        아직 접수된 강의 신청 내역이 없습니다.
                      </p>
                      <p className="mt-1.5 text-xs text-stone-500">
                        메인 화면의 「강의 신청」 버튼에서 테스트 신청을 제출하면 이곳과 구글 시트 연동 목록에 바로 기록됩니다.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-stone-200 bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-stone-200 bg-[#F4F1EA] font-mono text-stone-600">
                            <th className="py-3 px-4 font-medium whitespace-nowrap">신청일시</th>
                            <th className="py-3 px-4 font-medium whitespace-nowrap">이름</th>
                            <th className="py-3 px-4 font-medium whitespace-nowrap">휴대 번호</th>
                            <th className="py-3 px-4 font-medium">원하는 강의</th>
                            <th className="py-3 px-4 font-medium whitespace-nowrap">상태</th>
                            <th className="py-3 px-4 font-medium whitespace-nowrap">시트 전송</th>
                            <th className="py-3 px-4 font-medium text-right whitespace-nowrap">관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {applications.map((item) => (
                            <tr key={item.id} className="hover:bg-[#FAF9F6]">
                              <td className="py-3 px-4 font-mono text-stone-500 tabular-nums whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 font-medium text-[#161616] whitespace-nowrap">
                                {item.name}
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums text-stone-700 whitespace-nowrap">
                                {item.phone}
                              </td>
                              <td className="py-3 px-4 text-stone-700">
                                <p className="font-medium text-[#161616]">{item.lectureTitle}</p>
                                {item.note && (
                                  <p className="text-[11px] text-stone-500 mt-0.5">{item.note}</p>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <select
                                  value={item.status}
                                  onChange={(e) =>
                                    void onUpdateApplicationStatus(
                                      item.id,
                                      e.target.value as ApplicationStatus
                                    )
                                  }
                                  className="px-2 py-1 text-xs border border-stone-300 bg-white cursor-pointer"
                                >
                                  <option value="pending">접수됨</option>
                                  <option value="contacted">안내 완료</option>
                                  <option value="enrolled">수강 확정</option>
                                </select>
                              </td>
                              <td className="py-3 px-4 font-mono whitespace-nowrap">
                                {item.syncedToSheet ? (
                                  <span className="text-[#1D3557]">전송 완료</span>
                                ) : (
                                  <span className="text-stone-400">대기</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => void onDeleteApplication(item.id)}
                                  aria-label="신청 내역 삭제"
                                  className="p-1 text-stone-400 hover:text-red-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Google Sheets Connection Configuration & Guide */}
                  <div className="p-6 border border-stone-200 bg-white space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
                      <div>
                        <h4 className="font-serif text-lg font-semibold text-[#161616]">
                          구글 시트(Google Sheets) 실시간 자동 연동 설정
                        </h4>
                        <p className="text-xs text-stone-600 mt-1">
                          아래 두 주소를 저장해 두면 학생이 「강의 신청」을 누를 때마다 교수님의 구글 시트에 자동으로 새 행이 추가됩니다.
                        </p>
                      </div>
                      {archive.profile.googleSheetWebhookUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const count = await onSyncApplicationsToSheet();
                              setFeedback({
                                type: 'ok',
                                text:
                                  count > 0
                                    ? `미전송 내역 ${count}건을 구글 시트로 전송했습니다.`
                                    : '모든 내역이 이미 전송되었거나 연결을 확인해 주세요.',
                              });
                            } catch (err) {
                              setFeedback({
                                type: 'err',
                                text: err instanceof Error ? err.message : '동기화 오류',
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 bg-[#F3EFE6] hover:bg-[#E7E0D3] cursor-pointer shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>미전송 내역 지금 보내기</span>
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          1) 내 구글 시트 URL (바로 열기 버튼용)
                        </label>
                        <input
                          type="url"
                          value={profileForm.googleSheetUrl || ''}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, googleSheetUrl: e.target.value }))
                          }
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          2) Google Apps Script 웹 앱 URL (자동 행 추가용)
                        </label>
                        <input
                          type="url"
                          value={profileForm.googleSheetWebhookUrl || ''}
                          onChange={(e) =>
                            setProfileForm((p) => ({
                              ...p,
                              googleSheetWebhookUrl: e.target.value,
                            }))
                          }
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-stone-300"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] cursor-pointer"
                      >
                        구글 시트 연동 주소 저장
                      </button>
                    </form>

                    {/* Step-by-step Guide */}
                    <div className="pt-5 border-t border-stone-200 space-y-3 text-xs text-stone-700 leading-relaxed">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#161616]">
                          구글 시트 연결 및 사용 안내 (2분 설정)
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
                            setFeedback({
                              type: 'ok',
                              text: 'Google Apps Script 코드가 복사되었습니다.',
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-stone-300 bg-[#F3EFE6] hover:bg-[#E7E0D3] cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>연동 스크립트 코드 복사</span>
                        </button>
                      </div>
                      <ol className="list-decimal pl-5 space-y-1.5 text-stone-600">
                        <li>
                          <strong className="text-[#161616]">방법 A (가장 간편 · CSV 열기):</strong>{' '}
                          위쪽 <strong className="text-[#161616]">「구글 시트용 CSV 다운로드」</strong>를 누른 뒤, Google Sheets에서{' '}
                          <code className="font-mono bg-stone-100 px-1">파일 → 가져오기 → 업로드</code>를 선택하면 한글 깨짐 없이 바로 표가 열립니다. (또는 「구글 시트 붙여넣기 복사」 후 시트에서 바로 붙여넣기)
                        </li>
                        <li>
                          <strong className="text-[#161616]">방법 B (실시간 자동 기록):</strong>{' '}
                          Google Sheets 새 문서를 열고 상단 메뉴 <code className="font-mono bg-stone-100 px-1">확장 프로그램 → Apps Script</code>에 들어갑니다.
                        </li>
                        <li>
                          기존 코드를 지우고 위 <strong className="text-[#161616]">「연동 스크립트 코드 복사」</strong>로 복사한 코드를 붙여넣고 저장합니다.
                        </li>
                        <li>
                          우측 상단 <code className="font-mono bg-stone-100 px-1">배포 → 새 배포</code> 클릭 → 유형을 <strong>웹 앱</strong>, 액세스 권한을 <strong>모든 사용자</strong>로 선택 후 배포합니다.
                        </li>
                        <li>
                          생성된 <code className="font-mono bg-stone-100 px-1">https://script.google.com/macros/s/.../exec</code> 주소를 위 2번 칸에 저장하면, 이후 모든 「강의 신청」이 구글 시트에 자동으로 한 줄씩 기록됩니다.
                        </li>
                      </ol>
                      <pre className="p-3 bg-[#F4F1EA] border border-stone-200 font-mono text-[11px] text-stone-700 overflow-x-auto leading-normal">
                        {APPS_SCRIPT_SNIPPET}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PROFILE & BACKUP */}
              {activeTab === 'settings' && (
                <div className="space-y-8 max-w-2xl">
                  <form onSubmit={handleSaveProfileSubmit} className="space-y-5">
                    <h3 className="font-serif text-xl font-semibold pb-3 border-b border-stone-200">
                      웹사이트 기본 틀 및 교수자 정보 설정
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          웹사이트 제목
                        </label>
                        <input
                          type="text"
                          value={profileForm.siteTitle}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, siteTitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          교수 성함
                        </label>
                        <input
                          type="text"
                          value={profileForm.professorName}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, professorName: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          웹사이트 부제
                        </label>
                        <input
                          type="text"
                          value={profileForm.siteSubtitle}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, siteSubtitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          직함
                        </label>
                        <input
                          type="text"
                          value={profileForm.professorTitle}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, professorTitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          소속 학과·연구실
                        </label>
                        <input
                          type="text"
                          value={profileForm.affiliation}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, affiliation: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          연락 이메일
                        </label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, email: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          연구실 면담 시간
                        </label>
                        <input
                          type="text"
                          value={profileForm.officeHours}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, officeHours: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          강의실 서문 (Curatorial Statement)
                        </label>
                        <textarea
                          rows={4}
                          value={profileForm.curatorialStatement}
                          onChange={(e) =>
                            setProfileForm((p) => ({
                              ...p,
                              curatorialStatement: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 leading-relaxed"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          인용구 (Pull Quote)
                        </label>
                        <input
                          type="text"
                          value={profileForm.pullQuote}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, pullQuote: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          강의 신청 구글 폼 링크 (Google Forms URL)
                        </label>
                        <input
                          type="url"
                          value={profileForm.googleFormUrl || ''}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, googleFormUrl: e.target.value }))
                          }
                          placeholder="https://forms.gle/..."
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300"
                        />
                        <p className="mt-1 text-[11px] text-stone-500">
                          입력 시 첫 화면의 「강의 신청」 단추를 누르면 해당 구글 폼으로 바로 이동합니다. 비워두면 내장 신청서 창이 열립니다.
                        </p>
                      </div>
                      <div className="sm:col-span-2 pt-3 border-t border-stone-200">
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          스튜디오 잠금 비밀번호 설정 (선택 사항)
                        </label>
                        <input
                          type="password"
                          value={newPasscode}
                          onChange={(e) => setNewPasscode(e.target.value)}
                          placeholder={
                            archive.profile.hasPasscode
                              ? '새 비밀번호 입력 시 변경됩니다'
                              : '비워두면 비밀번호 없이 바로 편집 가능'
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 text-sm font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] cursor-pointer"
                    >
                      설정 저장하기
                    </button>
                  </form>

                  {/* JSON Backup & Restore */}
                  <div className="p-5 border border-stone-200 bg-white space-y-4">
                    <h4 className="font-serif text-lg font-semibold">아카이브 데이터 백업 및 복원</h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      등록한 모든 강의 목록, 목차, 참고 문헌, 시리즈 구성을 JSON 파일로 내려받아 보관하거나 다른 환경으로 이전할 수 있습니다.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-stone-300 bg-[#F3EFE6] hover:bg-[#E7E0D3] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>JSON 백업 내려받기</span>
                      </button>

                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-stone-300 bg-white hover:bg-[#F3EFE6] cursor-pointer">
                        <FileUp className="w-3.5 h-3.5" />
                        <span>백업 JSON 불러오기</span>
                        <input
                          type="file"
                          accept="application/json,.json"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleImportJson(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
