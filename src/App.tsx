import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_ARCHIVE } from './data/defaultArchive.ts';
import type {
  ApplicationStatus,
  ArchiveData,
  Lecture,
  LectureApplication,
  LectureSeries,
  ProfessorProfile,
} from './types/archive.ts';
import { Header } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { LectureCatalog } from './components/LectureCatalog.tsx';
import { ArchiveIndexTable } from './components/ArchiveIndexTable.tsx';
import { ProfessorAboutSection } from './components/ProfessorAboutSection.tsx';
import { ScreeningModal } from './components/ScreeningModal.tsx';
import { RegistrationModal } from './components/RegistrationModal.tsx';
import { StudioDrawer, type StudioTab } from './components/StudioDrawer.tsx';

export default function App() {
  const [archive, setArchive] = useState<ArchiveData>(DEFAULT_ARCHIVE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
  const [watchingLecture, setWatchingLecture] = useState<Lecture | null>(null);

  const [studioOpen, setStudioOpen] = useState<boolean>(false);
  const [studioTab, setStudioTab] = useState<StudioTab>('editor');
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [passcodeHeader, setPasscodeHeader] = useState<string>('');
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(false);
  const [applications, setApplications] = useState<LectureApplication[]>([]);

  const fetchArchive = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/archive');
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
  }, []);

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
    setEditingLecture(lectureToEdit);
    setStudioTab(tab);
    setStudioOpen(true);
  };

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(passcodeHeader ? { 'x-studio-passcode': passcodeHeader } : {}),
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
    try {
      const res = await fetch('/api/applications', {
        headers: passcodeHeader ? { 'x-studio-passcode': passcodeHeader } : {},
      });
      if (!res.ok) return;
      const data = (await res.json()) as { applications: LectureApplication[] };
      setApplications(data.applications ?? []);
    } catch {
      // ignore non-critical fetch errors
    }
  }, [passcodeHeader]);

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
        onOpenStudio={() => openStudioAt('editor', null)}
      />

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
              onWatchLecture={(lec) => void handleWatchLecture(lec)}
              onOpenStudio={() => openStudioAt('editor', null)}
              onOpenRegistration={() => setRegistrationOpen(true)}
            />

            <LectureCatalog
              lectures={archive.lectures}
              seriesList={archive.series}
              selectedSeriesId={selectedSeriesId}
              onSelectSeries={setSelectedSeriesId}
              onWatchLecture={(lec) => void handleWatchLecture(lec)}
              onEditLecture={(lec) => openStudioAt('editor', lec)}
            />

            <ArchiveIndexTable
              lectures={archive.lectures}
              seriesList={archive.series}
              onWatchLecture={(lec) => void handleWatchLecture(lec)}
              onEditLecture={(lec) => openStudioAt('editor', lec)}
            />

            <ProfessorAboutSection
              profile={archive.profile}
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
            <a href="#catalog" className="hover:text-[#161616] transition-colors">
              정기 강좌
            </a>
            <a href="#index" className="hover:text-[#161616] transition-colors">
              아카이브 색인
            </a>
            <button
              type="button"
              onClick={() => setRegistrationOpen(true)}
              className="hover:text-[#161616] transition-colors cursor-pointer"
            >
              강의 신청
            </button>
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
          </div>
        </div>
      </footer>

      <ScreeningModal
        lecture={watchingLecture}
        seriesList={archive.series}
        onClose={() => setWatchingLecture(null)}
        onEditLecture={(lec) => openStudioAt('editor', lec)}
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
        archive={archive}
        applications={applications}
        passcodeHeader={passcodeHeader}
        onPasscodeVerified={(code) => setPasscodeHeader(code)}
        onClose={() => setStudioOpen(false)}
        onSaveLecture={handleSaveLecture}
        onDeleteLecture={handleDeleteLecture}
        onSaveSeries={handleSaveSeries}
        onDeleteSeries={handleDeleteSeries}
        onSaveProfile={handleSaveProfile}
        onImportArchive={handleImportArchive}
        onFetchApplications={handleFetchApplications}
        onUpdateApplicationStatus={handleUpdateApplicationStatus}
        onDeleteApplication={handleDeleteApplication}
        onSyncApplicationsToSheet={handleSyncApplicationsToSheet}
        onEditSelect={(lec) => openStudioAt('editor', lec)}
        onClearEditing={() => setEditingLecture(null)}
      />
    </div>
  );
}
