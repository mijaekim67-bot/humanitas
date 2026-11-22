import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_ARCHIVE } from './src/data/defaultArchive.ts';
import type {
  ApplicationStatus,
  ArchiveData,
  ColumnArticle,
  Lecture,
  LectureApplication,
  LectureSeries,
  ProfessorProfile,
} from './src/types/archive.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');
const PORT = Number(process.env.PORT) || 3000;

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARCHIVE_FILE)) {
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(DEFAULT_ARCHIVE, null, 2), 'utf-8');
  }
}

function readArchive(): ArchiveData {
  ensureStorage();
  try {
    const raw = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ArchiveData;
    if (!parsed || !parsed.profile || !Array.isArray(parsed.lectures) || !Array.isArray(parsed.series)) {
      return structuredClone(DEFAULT_ARCHIVE);
    }
    return {
      ...parsed,
      columns: Array.isArray(parsed.columns)
        ? parsed.columns
        : structuredClone(DEFAULT_ARCHIVE.columns ?? []),
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
    };
  } catch {
    return structuredClone(DEFAULT_ARCHIVE);
  }
}

function writeArchive(data: ArchiveData): void {
  ensureStorage();
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function sanitizePublicArchive(data: ArchiveData): ArchiveData {
  const hasPasscode = Boolean(data.profile.studioPasscode && data.profile.studioPasscode.trim().length > 0);
  return {
    profile: {
      ...data.profile,
      hasPasscode,
      studioPasscode: undefined,
    },
    series: data.series,
    lectures: data.lectures,
    columns: data.columns ?? [],
  };
}

function checkPasscode(req: express.Request, data: ArchiveData): boolean {
  const configured = (data.profile.studioPasscode ?? '').trim();
  if (!configured) return true;
  const provided = String(
    req.headers['x-studio-passcode'] ?? req.query.passcode ?? ''
  ).trim();
  return provided === configured;
}

function isValidAppsScriptUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://script.google.com/macros/s/');
}

async function forwardToGoogleSheetWebhook(
  webhookUrl: string | undefined,
  item: LectureApplication
): Promise<boolean> {
  if (!isValidAppsScriptUrl(webhookUrl)) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(webhookUrl!.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        createdAt: item.createdAt,
        name: item.name,
        phone: item.phone,
        lectureTitle: item.lectureTitle,
        note: item.note ?? '',
        status: item.status,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

function escapeCsvCell(val: string): string {
  const safe = /^[=+\-@]/.test(val) ? `'${val}` : val;
  return `"${safe.replace(/"/g, '""')}"`;
}

async function startServer(): Promise<void> {
  ensureStorage();
  const app = express();

  app.use('/uploads', express.static(UPLOADS_DIR));

  // Raw file upload endpoint for lecture videos, thumbnails, and column PDFs
  app.post(
    '/api/upload',
    express.raw({
      type: ['video/*', 'image/*', 'application/pdf', 'application/octet-stream'],
      limit: '150mb',
    }),
    (req, res) => {
      const archive = readArchive();
      if (!checkPasscode(req, archive)) {
        res.status(401).json({ error: '스튜디오 접근 비밀번호가 올바르지 않습니다.' });
        return;
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: '업로드할 파일 데이터가 비어 있습니다.' });
        return;
      }

      const rawName = String(req.headers['x-file-name'] ?? 'upload.bin');
      const decodedName = decodeURIComponent(rawName);
      const ext = path.extname(decodedName).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.mp4';
      const safeBase = path
        .basename(decodedName, path.extname(decodedName))
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 48) || 'media';
      const filename = `${safeBase}_${Date.now()}${ext}`;
      const targetPath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(targetPath, req.body);
      res.json({ url: `/uploads/${filename}`, filename, size: req.body.length });
    }
  );

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/archive', (_req, res) => {
    const archive = readArchive();
    res.json(sanitizePublicArchive(archive));
  });

  app.post('/api/auth/verify', (req, res) => {
    const archive = readArchive();
    const configured = (archive.profile.studioPasscode ?? '').trim();
    const provided = String((req.body as { passcode?: string })?.passcode ?? '').trim();
    if (!configured || provided === configured) {
      res.json({ ok: true });
      return;
    }
    res.status(401).json({ ok: false, error: '비밀번호가 일치하지 않습니다.' });
  });

  app.post('/api/lectures', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const incoming = req.body as Partial<Lecture>;
    if (!incoming.title || !incoming.title.trim()) {
      res.status(400).json({ error: '강의 제목을 입력해 주세요.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newLecture: Lecture = {
      id: incoming.id && incoming.id.trim() ? incoming.id.trim() : `lec-${Date.now()}`,
      accessionCode: incoming.accessionCode?.trim() || `LEC-${new Date().getFullYear()}-${String(archive.lectures.length + 1).padStart(2, '0')}`,
      title: incoming.title.trim(),
      subtitle: incoming.subtitle?.trim() || '',
      seriesId: incoming.seriesId || archive.series[0]?.id || '',
      status: incoming.status || 'published',
      publishedAt: incoming.publishedAt || nowIso.slice(0, 10),
      duration: incoming.duration?.trim() || '00:00',
      videoUrl: incoming.videoUrl?.trim() || '',
      sourceType: incoming.sourceType || 'none',
      thumbnailUrl: incoming.thumbnailUrl?.trim() || '/src/assets/images/lecture_kant_light_1795246706973.jpg',
      figureCaption: incoming.figureCaption?.trim() || '',
      summary: incoming.summary?.trim() || '',
      lectureNotes: incoming.lectureNotes?.trim() || '',
      chapters: Array.isArray(incoming.chapters) ? incoming.chapters : [],
      references: Array.isArray(incoming.references) ? incoming.references : [],
      featured: Boolean(incoming.featured),
      viewCount: Number(incoming.viewCount) || 0,
      updatedAt: nowIso,
    };

    if (newLecture.featured) {
      archive.lectures = archive.lectures.map((l) => ({ ...l, featured: false }));
    }

    archive.lectures.unshift(newLecture);
    writeArchive(archive);
    res.status(201).json({ lecture: newLecture, archive: sanitizePublicArchive(archive) });
  });

  app.put('/api/lectures/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const { id } = req.params;
    const idx = archive.lectures.findIndex((l) => l.id === id);
    if (idx === -1) {
      res.status(404).json({ error: '강의를 찾을 수 없습니다.' });
      return;
    }

    const patch = req.body as Partial<Lecture>;
    const updated: Lecture = {
      ...archive.lectures[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (updated.featured) {
      archive.lectures = archive.lectures.map((l) => ({ ...l, featured: l.id === id }));
    }

    archive.lectures[idx] = updated;
    writeArchive(archive);
    res.json({ lecture: updated, archive: sanitizePublicArchive(archive) });
  });

  app.delete('/api/lectures/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const { id } = req.params;
    archive.lectures = archive.lectures.filter((l) => l.id !== id);
    writeArchive(archive);
    res.json({ ok: true, archive: sanitizePublicArchive(archive) });
  });

  app.post('/api/lectures/:id/view', (req, res) => {
    const archive = readArchive();
    const idx = archive.lectures.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '강의를 찾을 수 없습니다.' });
      return;
    }
    archive.lectures[idx].viewCount = (archive.lectures[idx].viewCount || 0) + 1;
    writeArchive(archive);
    res.json({ viewCount: archive.lectures[idx].viewCount });
  });

  app.post('/api/series', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const incoming = req.body as Partial<LectureSeries>;
    if (!incoming.title?.trim()) {
      res.status(400).json({ error: '시리즈 제목을 입력해 주세요.' });
      return;
    }

    const newSeries: LectureSeries = {
      id: incoming.id?.trim() || `series-${Date.now()}`,
      code: incoming.code?.trim() || `ART-${100 + archive.series.length + 1}`,
      title: incoming.title.trim(),
      semester: incoming.semester?.trim() || '정기 강좌',
      description: incoming.description?.trim() || '',
      order: Number(incoming.order) || archive.series.length + 1,
    };

    archive.series.push(newSeries);
    writeArchive(archive);
    res.status(201).json({ series: newSeries, archive: sanitizePublicArchive(archive) });
  });

  app.put('/api/series/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const idx = archive.series.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '시리즈를 찾을 수 없습니다.' });
      return;
    }

    archive.series[idx] = {
      ...archive.series[idx],
      ...(req.body as Partial<LectureSeries>),
      id: req.params.id,
    };
    writeArchive(archive);
    res.json({ series: archive.series[idx], archive: sanitizePublicArchive(archive) });
  });

  app.delete('/api/series/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    archive.series = archive.series.filter((s) => s.id !== req.params.id);
    writeArchive(archive);
    res.json({ ok: true, archive: sanitizePublicArchive(archive) });
  });

  // Columns ("미재의 미술인문학산책 | 길 위에서 마음을 묻다") CRUD
  app.post('/api/columns', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const incoming = req.body as Partial<ColumnArticle>;
    if (!incoming.title?.trim()) {
      res.status(400).json({ error: '원고 제목을 입력해 주세요.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const columns = archive.columns ?? [];
    const newCol: ColumnArticle = {
      id: incoming.id?.trim() || `col-${Date.now()}`,
      issueNumber: incoming.issueNumber?.trim() || `제${columns.length + 1}회`,
      seriesTitle:
        incoming.seriesTitle?.trim() || '미재의 미술인문학산책 | 길 위에서 마음을 묻다',
      publication: incoming.publication?.trim() || '따옴뉴스',
      publishedAt: incoming.publishedAt || nowIso.slice(0, 10),
      title: incoming.title.trim(),
      subtitle: incoming.subtitle?.trim() || '',
      summary: incoming.summary?.trim() || '',
      body: incoming.body?.trim() || '',
      sidebarTitle: incoming.sidebarTitle?.trim() || '',
      sidebarBody: incoming.sidebarBody?.trim() || '',
      coverImageUrl:
        incoming.coverImageUrl?.trim() ||
        '/src/assets/images/lecture_bauhaus_form_1795246708368.jpg',
      figureCaption: incoming.figureCaption?.trim() || '',
      pdfUrl: incoming.pdfUrl?.trim() || '',
      status: incoming.status || 'published',
      updatedAt: nowIso,
    };

    archive.columns = [newCol, ...columns];
    writeArchive(archive);
    res.status(201).json({ column: newCol, archive: sanitizePublicArchive(archive) });
  });

  app.put('/api/columns/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const columns = archive.columns ?? [];
    const idx = columns.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' });
      return;
    }

    columns[idx] = {
      ...columns[idx],
      ...(req.body as Partial<ColumnArticle>),
      id: req.params.id,
      updatedAt: new Date().toISOString(),
    };
    archive.columns = columns;
    writeArchive(archive);
    res.json({ column: columns[idx], archive: sanitizePublicArchive(archive) });
  });

  app.delete('/api/columns/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    archive.columns = (archive.columns ?? []).filter((c) => c.id !== req.params.id);
    writeArchive(archive);
    res.json({ ok: true, archive: sanitizePublicArchive(archive) });
  });

  app.put('/api/profile', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const incoming = req.body as Partial<ProfessorProfile>;
    const nextPasscode =
      incoming.studioPasscode !== undefined
        ? incoming.studioPasscode.trim()
        : archive.profile.studioPasscode;

    archive.profile = {
      ...archive.profile,
      ...incoming,
      studioPasscode: nextPasscode,
    };

    writeArchive(archive);
    res.json({ archive: sanitizePublicArchive(archive) });
  });

  app.post('/api/import', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }

    const incoming = req.body as ArchiveData;
    if (!incoming || !incoming.profile || !Array.isArray(incoming.lectures) || !Array.isArray(incoming.series)) {
      res.status(400).json({ error: '올바른 아카이브 JSON 형식이 아닙니다.' });
      return;
    }

    const preservedPasscode = incoming.profile.studioPasscode ?? archive.profile.studioPasscode ?? '';
    const merged: ArchiveData = {
      ...incoming,
      applications: Array.isArray(incoming.applications)
        ? incoming.applications
        : archive.applications ?? [],
      profile: {
        ...incoming.profile,
        studioPasscode: preservedPasscode,
      },
    };
    writeArchive(merged);
    res.json({ archive: sanitizePublicArchive(merged) });
  });

  // Public Lecture Application Submission
  app.post('/api/applications', async (req, res) => {
    const archive = readArchive();
    const body = req.body as Partial<LectureApplication>;
    const name = String(body.name ?? '').trim().slice(0, 60);
    const phone = String(body.phone ?? '').trim().slice(0, 30);
    const lectureId = String(body.lectureId ?? '').trim().slice(0, 120);
    const lectureTitle = String(body.lectureTitle ?? '').trim().slice(0, 200);
    const note = String(body.note ?? '').trim().slice(0, 500);

    if (!name) {
      res.status(400).json({ error: '성함을 입력해 주세요.' });
      return;
    }
    if (!phone || phone.replace(/[^0-9]/g, '').length < 9) {
      res.status(400).json({ error: '올바른 휴대 번호를 입력해 주세요.' });
      return;
    }
    if (!lectureTitle) {
      res.status(400).json({ error: '원하는 강의를 선택해 주세요.' });
      return;
    }

    const item: LectureApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      phone,
      lectureId,
      lectureTitle,
      note,
      status: 'pending',
      syncedToSheet: false,
      createdAt: new Date().toISOString(),
    };

    const synced = await forwardToGoogleSheetWebhook(
      archive.profile.googleSheetWebhookUrl,
      item
    );
    item.syncedToSheet = synced;

    archive.applications = [item, ...(archive.applications ?? [])];
    writeArchive(archive);
    res.status(201).json({ ok: true, id: item.id, syncedToSheet: synced });
  });

  // Professor-only Applications Management
  app.get('/api/applications', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }
    res.json({ applications: archive.applications ?? [] });
  });

  app.patch('/api/applications/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }
    const status = (req.body as { status?: ApplicationStatus }).status;
    if (!status || !['pending', 'contacted', 'enrolled'].includes(status)) {
      res.status(400).json({ error: '유효한 상태 값이 아닙니다.' });
      return;
    }
    const list = archive.applications ?? [];
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '신청 내역을 찾을 수 없습니다.' });
      return;
    }
    list[idx] = { ...list[idx], status };
    archive.applications = list;
    writeArchive(archive);
    res.json({ applications: list });
  });

  app.delete('/api/applications/:id', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }
    archive.applications = (archive.applications ?? []).filter(
      (a) => a.id !== req.params.id
    );
    writeArchive(archive);
    res.json({ applications: archive.applications });
  });

  app.post('/api/applications/sync', async (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }
    const webhookUrl = archive.profile.googleSheetWebhookUrl;
    if (!isValidAppsScriptUrl(webhookUrl)) {
      res.status(400).json({
        error: '유효한 Google Apps Script 웹 앱 URL(https://script.google.com/macros/s/...)을 먼저 저장해 주세요.',
      });
      return;
    }

    const list = archive.applications ?? [];
    let syncedCount = 0;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].syncedToSheet) {
        const ok = await forwardToGoogleSheetWebhook(webhookUrl, list[i]);
        if (ok) {
          list[i] = { ...list[i], syncedToSheet: true };
          syncedCount++;
        }
      }
    }
    archive.applications = list;
    writeArchive(archive);
    res.json({ syncedCount, applications: list });
  });

  app.get('/api/applications/export.csv', (req, res) => {
    const archive = readArchive();
    if (!checkPasscode(req, archive)) {
      res.status(401).json({ error: '스튜디오 인증이 필요합니다.' });
      return;
    }
    const STATUS_KO: Record<ApplicationStatus, string> = {
      pending: '접수됨',
      contacted: '안내 완료',
      enrolled: '수강 확정',
    };

    const header = ['신청일시', '이름', '휴대 번호', '원하는 강의', '메모', '처리 상태'];
    const rows = (archive.applications ?? []).map((item) => [
      escapeCsvCell(new Date(item.createdAt).toLocaleString('ko-KR')),
      escapeCsvCell(item.name),
      escapeCsvCell(item.phone),
      escapeCsvCell(item.lectureTitle),
      escapeCsvCell(item.note ?? ''),
      escapeCsvCell(STATUS_KO[item.status] ?? item.status),
    ]);

    const csvContent = '\uFEFF' + [header.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="lecture-applications-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvContent);
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Archive server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
