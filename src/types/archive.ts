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
  hasPasscode?: boolean;
  studioPasscode?: string;
}

export interface ArchiveData {
  profile: ProfessorProfile;
  series: LectureSeries[];
  lectures: Lecture[];
}
