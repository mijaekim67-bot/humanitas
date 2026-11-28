import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { DEFAULT_ARCHIVE } from './data/defaultArchive.ts';
import type {
  ApplicationStatus,
  ArchiveData,
  BoardPost,
  ColumnArticle,
  Lecture,
  LectureApplication,
  LectureSeries,
  ProfessorProfile,
} from './types/archive.ts';
import { Header } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { BoardSection } from './components/BoardSection.tsx';
import { LectureCatalog } from './components/LectureCatalog.tsx';
import { ColumnSection } from './components/ColumnSection.tsx';
import { ArchiveIndexTable } from './components/ArchiveIndexTable.tsx';
import { ProfessorAboutSection } from './components/ProfessorAboutSection.tsx';
import { ScreeningModal } from './components/ScreeningModal.tsx';
import { ColumnReaderModal } from './components/ColumnReaderModal.tsx';
import { BoardDetailModal } from './components/BoardDetailModal.tsx';
import { BoardComposerModal } from './components/BoardComposerModal.tsx';
import { AdminAuthModal } from './components/AdminAuthModal.tsx';
import { RegistrationModal } from './components/RegistrationModal.tsx';
import { StudioDrawer, type StudioTab } from './components/StudioDrawer.tsx';

export default function App() {
  const [archive, setArchive] = useState<ArchiveData>(DEFAULT_ARCHIVE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
  const [watchingLecture, setWatchingLecture] = useState<Lecture | null>(null);
  const [readingColumn, setReadingColumn] = useState<ColumnArticle | null>(null);
  const [readingBoardPost, setReadingBoardPost] = useState<BoardPost | null>(null);
  const [boardComposerOpen, setBoardComposerOpen] = useState<boolean>(false);
  const [editingBoardPost, setEditingBoardPost] = useState<BoardPost | null>(null);

  const [studioOpen, setStudioOpen] = useState<boolean>(false);
  const [studioTab, setStudioTab] = useState<StudioTab>('editor');
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [editingColumn, setEditingColumn] = useState<ColumnArticle | null>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(false);
  const [applications, setApplications] = useState<LectureApplication[]>([]);

  const isAdmin = Boolean(adminToken);

  const fetchArchive = useCallback(async (tokenOverride?: string) => {
    try {
      setLoadError(null);
      const token = tokenOverride !== undefined ? tokenOverride : adminToken;
      const res = await fetch('/api/archive', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('아카이브 데이터를 불러오지 못했습니다.');
      }
      const data = (await res.json()) as ArchiveData;
      setArchive(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void fetchArchive();
  }, [fetchArchive]);

  useEffect(() => {
    if (archive.profile.siteTitle) {
      document.title = `${archive.profile.siteTitle} · ${archive.profile.professorName}`;
    }
  }, [archive.profile.siteTitle, archive.profile.professorName]);

  const publishedLectures = useMemo(
    () => archive.lectures.filter((l) => l.status === 'published'),
    [archive.lectures]
  );

  const featuredLecture = useMemo(() => {
    return (
      publishedLectures.find((l) => l.featured) ??
      publishedLectures[0] ??
      undefined
    );
  }, [publishedLectures]);

  const handleWatchLecture = async (lecture: Lecture) => {
    setWatchingLecture(lecture);
    try {
      const res = await fetch(`/api/lectures/${lecture.id}/view`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { viewCount: number };
        setArchive((prev) => ({
          ...prev,
          lectures: prev.lectures.map((l) =>
            l.id === lecture.id ? { ...l, viewCount: data.viewCount } : l
          ),
        }));
      }
    } catch {
      // View count tracking is non-blocking
    }
  };

  const openStudioAt = (tab: StudioTab, lectureToEdit: Lecture | null = null) => {
    if (!isAdmin) {
      setAdminModalOpen(true);
      return;
    }
    setEditingLecture(lectureToEdit);
    if (tab !== 'columns') {
      setEditingColumn(null);
    }
    setStudioTab(tab);
    setStudioOpen(true);
  };

  const openStudioAtColumn = (columnToEdit: ColumnArticle | null = null) => {
    if (!isAdmin) {
      setAdminModalOpen(true);
      return;
    }
    setEditingLecture(null);
    setEditingColumn(columnToEdit);
    setStudioTab('columns');
    setStudioOpen(true);
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    setStudioOpen(false);
    setBoardComposerOpen(false);
    setEditingLecture(null);
    setEditingColumn(null);
    setEditingBoardPost(null);
    setApplications([]);
    void fetchArchive('');
  };

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  });

  const handleSaveLecture = async (lecture: Partial<Lecture>, isNew: boolean) => {
    const url = isNew ? '/api/lectures' : `/api/lectures/${lecture.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(lecture),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '강의를 저장하지 못했습니다.');
    }

    const data = (await res.json()) as { lecture: Lecture; archive: ArchiveData };
    setArchive(data.archive);
    if (!isNew) {
      setEditingLecture(data.lecture);
    }
  };

  const handleDeleteLecture = async (id: string) => {
    const res = await fetch(`/api/lectures/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '강의를 삭제하지 못했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
    if (editingLecture?.id === id) {
      setEditingLecture(null);
    }
  };

  const handleSaveSeries = async (series: Partial<LectureSeries>, isNew: boolean) => {
    const url = isNew ? '/api/series' : `/api/series/${series.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(series),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '시리즈를 저장하지 못했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
  };

  const handleDeleteSeries = async (id: string) => {
    const res = await fetch(`/api/series/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '시리즈를 삭제하지 못했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
    if (selectedSeriesId === id) {
      setSelectedSeriesId('all');
    }
  };

  const handleSaveColumn = async (column: Partial<ColumnArticle>, isNew: boolean) => {
    const url = isNew ? '/api/columns' : `/api/columns/${column.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(column),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '기고 원고를 저장하지 못했습니다.');
    }
    const data = (await res.json()) as { column: ColumnArticle; archive: ArchiveData };
    setArchive(data.archive);
    if (!isNew) {
      setEditingColumn(data.column);
    }
  };

  const handleDeleteColumn = async (id: string) => {
    const res = await fetch(`/api/columns/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '기고 원고를 삭제하지 못했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
    if (editingColumn?.id === id) {
      setEditingColumn(null);
    }
  };

  const handleSelectBoardPost = async (post: BoardPost) => {
    setReadingBoardPost(post);
    try {
      const res = await fetch(`/api/board/${post.id}/view`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { viewCount: number };
        setReadingBoardPost((prev) =>
          prev && prev.id === post.id ? { ...prev, viewCount: data.viewCount } : prev
        );
        setArchive((prev) => ({
          ...prev,
          boardPosts: (prev.boardPosts ?? []).map((p) =>
            p.id === post.id ? { ...p, viewCount: data.viewCount } : p
          ),
        }));
      }
    } catch {
      // View tracking is non-blocking
    }
  };

  const handleSaveBoardPost = async (
    post: Partial<BoardPost>,
    isNew: boolean
  ) => {
    const url = isNew ? '/api/board' : `/api/board/${post.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(post),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '게시글을 저장하지 못했습니다.');
    }
    const data = (await res.json()) as { post: BoardPost; archive: ArchiveData };
    setArchive(data.archive);
    if (!isNew) {
      setEditingBoardPost(data.post);
    }
  };

  const handleDeleteBoardPost = async (id: string) => {
    const res = await fetch(`/api/board/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '게시글을 삭제하지 못했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
    if (readingBoardPost?.id === id) {
      setReadingBoardPost(null);
    }
    if (editingBoardPost?.id === id) {
      setEditingBoardPost(null);
    }
  };

  const handleSaveProfile = async (profile: Partial<ProfessorProfile>) => {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '프로필 설정을 저장하지 못했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
  };

  const handleImportArchive = async (imported: ArchiveData) => {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(imported),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '아카이브 복원에 실패했습니다.');
    }
    const data = (await res.json()) as { archive: ArchiveData };
    setArchive(data.archive);
  };

  const handleFetchApplications = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { applications: LectureApplication[] };
      setApplications(data.applications ?? []);
    } catch {
      // ignore non-critical fetch errors
    }
  }, [adminToken]);

  const handleUpdateApplicationStatus = async (
    id: string,
    status: ApplicationStatus
  ) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { applications: LectureApplication[] };
    setApplications(data.applications ?? []);
  };

  const handleDeleteApplication = async (id: string) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { applications: LectureApplication[] };
    setApplications(data.applications ?? []);
  };

  const handleSyncApplicationsToSheet = async (): Promise<number> => {
    const res = await fetch('/api/applications/sync', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || '구글 시트 전송에 실패했습니다.');
    }
    const data = (await res.json()) as {
      syncedCount: number;
      applications: LectureApplication[];
    };
    setApplications(data.applications ?? []);
    return data.syncedCount;
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#161616]">
      <Header
        siteTitle={archive.profile.siteTitle}
        isAdmin={isAdmin}
        onOpenStudio={() => openStudioAt('editor', null)}
        onOpenAdminLogin={() => setAdminModalOpen(true)}
      />

      {isAdmin && (
        <div className="border-b border-[#1D3557]/20 bg-[#EEF2F7]">
          <div className="max-w-[1200px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#1D3557] font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>관리자 모드 활성화됨 — 강의 영상, 게시판 자료, 기고 원고를 등록·수정할 수 있습니다.</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingBoardPost(null);
                  setBoardComposerOpen(true);
                }}
                className="font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
              >
                + 게시판 자료 올리기
              </button>
              <button
                type="button"
                onClick={() => openStudioAt('editor', null)}
                className="font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
              >
                교수자 스튜디오
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-stone-300 bg-white text-stone-700 hover:bg-[#FAF9F6] transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3 h-3" />
                <span>열람자 모드로 전환</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {loadError && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center text-xs text-amber-900">
          서버 연결 확인 중 오류가 발생해 기본 아카이브 틀을 표시합니다: {loadError}
        </div>
      )}

      <main className="flex-1">
        {isLoading ? (
          <div className="max-w-[1200px] mx-auto px-6 py-24">
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-48 bg-stone-200" />
              <div className="h-12 w-2/3 bg-stone-200" />
              <div className="h-64 w-full bg-stone-200" />
            </div>
          </div>
        ) : (
          <>
            <HeroSection
              profile={archive.profile}
              featuredLecture={featuredLecture}
              seriesList={archive.series}
              allPublishedLectures={publishedLectures}
              isAdmin={isAdmin}
              onWatchLecture={(lec) => void handleWatchLecture(lec)}
              onOpenStudio={() => openStudioAt('editor', null)}
              onOpenRegistration={() => setRegistrationOpen(true)}
            />

            <BoardSection
              posts={archive.boardPosts ?? []}
              isAdmin={isAdmin}
              onSelectPost={(post) => void handleSelectBoardPost(post)}
              onOpenComposer={() => {
                if (!isAdmin) {
                  setAdminModalOpen(true);
                  return;
                }
                setEditingBoardPost(null);
                setBoardComposerOpen(true);
              }}
            />

            <LectureCatalog
              lectures={archive.lectures}
              seriesList={archive.series}
              selectedSeriesId={selectedSeriesId}
              isAdmin={isAdmin}
              onSelectSeries={setSelectedSeriesId}
              onWatchLecture={(lec) => void handleWatchLecture(lec)}
              onEditLecture={(lec) => openStudioAt('editor', lec)}
            />

            <ColumnSection
              columns={archive.columns ?? []}
              isAdmin={isAdmin}
              onReadColumn={(col) => setReadingColumn(col)}
              onAddColumn={() => openStudioAtColumn(null)}
              onEditColumn={(col) => openStudioAtColumn(col)}
            />

            <ArchiveIndexTable
              lectures={archive.lectures}
              seriesList={archive.series}
              isAdmin={isAdmin}
              onWatchLecture={(lec) => void handleWatchLecture(lec)}
              onEditLecture={(lec) => openStudioAt('editor', lec)}
            />

            <ProfessorAboutSection
              profile={archive.profile}
              isAdmin={isAdmin}
              onOpenSettings={() => openStudioAt('settings', null)}
            />
          </>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-[#F4F1EA]">
        <div className="max-w-[1200px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-600">
          <div>
            <p className="font-serif text-base font-medium text-[#161616]">
              {archive.profile.siteTitle}
            </p>
            <p className="mt-1">
              {archive.profile.affiliation} {archive.profile.professorName} {archive.profile.professorTitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#featured" className="hover:text-[#161616] transition-colors">
              주요 강의
            </a>
            <a href="#board" className="hover:text-[#161616] transition-colors">
              자료 게시판
            </a>
            <a href="#catalog" className="hover:text-[#161616] transition-colors">
              정기 강좌
            </a>
            <a href="#columns" className="hover:text-[#161616] transition-colors">
              인문학 산책
            </a>
            <a href="#index" className="hover:text-[#161616] transition-colors">
              아카이브 색인
            </a>
            {archive.profile.googleFormUrl?.trim() ? (
              <a
                href={archive.profile.googleFormUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#161616] transition-colors"
              >
                강의 신청
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setRegistrationOpen(true)}
                className="hover:text-[#161616] transition-colors cursor-pointer"
              >
                강의 신청
              </button>
            )}
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => openStudioAt('applications', null)}
                  className="hover:text-[#161616] transition-colors cursor-pointer"
                >
                  신청자 명단
                </button>
                <button
                  type="button"
                  onClick={() => openStudioAt('editor', null)}
                  className="font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer"
                >
                  교수자 스튜디오 열기
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAdminModalOpen(true)}
                className="font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer"
              >
                관리자 로그인
              </button>
            )}
          </div>
        </div>
      </footer>

      <ScreeningModal
        lecture={watchingLecture}
        seriesList={archive.series}
        isAdmin={isAdmin}
        onClose={() => setWatchingLecture(null)}
        onEditLecture={(lec) => openStudioAt('editor', lec)}
      />

      <ColumnReaderModal
        column={readingColumn}
        isAdmin={isAdmin}
        onClose={() => setReadingColumn(null)}
        onEditColumn={(col) => openStudioAtColumn(col)}
      />

      <BoardDetailModal
        post={readingBoardPost}
        isAdmin={isAdmin}
        onClose={() => setReadingBoardPost(null)}
        onEdit={(post) => {
          if (!isAdmin) {
            setAdminModalOpen(true);
            return;
          }
          setEditingBoardPost(post);
          setBoardComposerOpen(true);
        }}
        onDelete={handleDeleteBoardPost}
      />

      <BoardComposerModal
        isOpen={boardComposerOpen && isAdmin}
        editingPost={editingBoardPost}
        defaultAuthor={`${archive.profile.professorName} ${archive.profile.professorTitle}`.trim()}
        adminToken={adminToken}
        onClose={() => {
          setBoardComposerOpen(false);
          setEditingBoardPost(null);
        }}
        onSavePost={handleSaveBoardPost}
      />

      <AdminAuthModal
        isOpen={adminModalOpen}
        isConfigured={Boolean(archive.profile.hasPasscode)}
        onClose={() => setAdminModalOpen(false)}
        onAuthenticated={(token, nextArchive) => {
          setAdminToken(token);
          setArchive(nextArchive);
        }}
      />

      <RegistrationModal
        isOpen={registrationOpen}
        lectures={archive.lectures}
        seriesList={archive.series}
        affiliationTitle={archive.profile.affiliation}
        onClose={() => setRegistrationOpen(false)}
        onSubmitted={() => void handleFetchApplications()}
      />

      <StudioDrawer
        isOpen={studioOpen}
        initialTab={studioTab}
        editingLecture={editingLecture}
        editingColumn={editingColumn}
        archive={archive}
        applications={applications}
        adminToken={adminToken}
        onTokenIssued={(token, nextArchive) => {
          setAdminToken(token);
          if (nextArchive) setArchive(nextArchive);
        }}
        onLogout={handleAdminLogout}
        onClose={() => setStudioOpen(false)}
        onSaveLecture={handleSaveLecture}
        onDeleteLecture={handleDeleteLecture}
        onSaveSeries={handleSaveSeries}
        onDeleteSeries={handleDeleteSeries}
        onSaveColumn={handleSaveColumn}
        onDeleteColumn={handleDeleteColumn}
        onSaveProfile={handleSaveProfile}
        onImportArchive={handleImportArchive}
        onFetchApplications={handleFetchApplications}
        onUpdateApplicationStatus={handleUpdateApplicationStatus}
        onDeleteApplication={handleDeleteApplication}
        onSyncApplicationsToSheet={handleSyncApplicationsToSheet}
        onEditSelect={(lec) => openStudioAt('editor', lec)}
        onClearEditing={() => setEditingLecture(null)}
        onClearEditingColumn={() => setEditingColumn(null)}
      />
    </div>
  );
}
