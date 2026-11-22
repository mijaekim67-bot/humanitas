export type LectureStatus = 'published' | 'draft' | 'scheduled';

export type VideoSourceType = 'youtube' | 'vimeo' | 'direct' | 'upload' | 'none';

export interface LectureChapter {
  id: string;
  timestamp: string;
  title: string;
  note?: string;
}

export interface ReferenceItem {
  id: string;
  creatorOrAuthor: string;
  citation: string;
  year: string;
}

export interface Lecture {
  id: string;
  accessionCode: string;
  title: string;
  subtitle: string;
  seriesId: string;
  status: LectureStatus;
  publishedAt: string;
  duration: string;
  videoUrl: string;
  sourceType: VideoSourceType;
  thumbnailUrl: string;
  figureCaption: string;
  summary: string;
  lectureNotes: string;
  chapters: LectureChapter[];
  references: ReferenceItem[];
  featured: boolean;
  viewCount: number;
  updatedAt: string;
}

export interface LectureSeries {
  id: string;
  code: string;
  title: string;
  semester: string;
  description: string;
  order: number;
}

export type ApplicationStatus = 'pending' | 'contacted' | 'enrolled';

export interface LectureApplication {
  id: string;
  name: string;
  phone: string;
  lectureId: string;
  lectureTitle: string;
  note?: string;
  status: ApplicationStatus;
  syncedToSheet: boolean;
  createdAt: string;
}

export interface ProfessorProfile {
  siteTitle: string;
  siteSubtitle: string;
  professorName: string;
  professorTitle: string;
  affiliation: string;
  bio: string;
  curatorialStatement: string;
  pullQuote: string;
  email: string;
  officeHours: string;
  studioImageUrl: string;
  googleFormUrl?: string;
  googleSheetUrl?: string;
  googleSheetWebhookUrl?: string;
  hasPasscode?: boolean;
  studioPasscode?: string;
}

export interface ColumnArticle {
  id: string;
  issueNumber: string;
  seriesTitle: string;
  publication: string;
  publishedAt: string;
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  sidebarTitle?: string;
  sidebarBody?: string;
  coverImageUrl: string;
  figureCaption?: string;
  pdfUrl?: string;
  status: 'published' | 'draft';
  updatedAt: string;
}

export interface ArchiveData {
  profile: ProfessorProfile;
  series: LectureSeries[];
  lectures: Lecture[];
  columns?: ColumnArticle[];
  applications?: LectureApplication[];
}
