import { useMemo, useState } from 'react';
import {
  Film,
  Paperclip,
  ExternalLink,
  Plus,
  Search,
  Pin,
  ChevronRight,
} from 'lucide-react';
import type { BoardCategory, BoardPost } from '../types/archive.ts';
import { formatKoreanDate } from '../utils/video.ts';

interface BoardSectionProps {
  posts: BoardPost[];
  isAdmin: boolean;
  onSelectPost: (post: BoardPost) => void;
  onOpenComposer: () => void;
}

const CATEGORY_LABEL: Record<BoardCategory, string> = {
  video: '영상 자료',
  material: '강의안·PDF',
  notice: '공지사항',
};

export function BoardSection({
  posts,
  isAdmin,
  onSelectPost,
  onOpenComposer,
}: BoardSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | BoardCategory>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
  }, [posts]);

  const counts = useMemo(() => {
    return {
      all: sortedPosts.length,
      video: sortedPosts.filter((p) => p.category === 'video').length,
      material: sortedPosts.filter((p) => p.category === 'material').length,
      notice: sortedPosts.filter((p) => p.category === 'notice').length,
    };
  }, [sortedPosts]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedPosts.filter((post) => {
      if (activeCategory !== 'all' && post.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.author.toLowerCase().includes(q)
      );
    });
  }, [sortedPosts, activeCategory, query]);

  const visiblePosts = showAll ? filteredPosts : filteredPosts.slice(0, 6);

  const filterTabs: Array<{ key: 'all' | BoardCategory; label: string; count: number }> = [
    { key: 'all', label: '전체', count: counts.all },
    { key: 'video', label: '영상 자료', count: counts.video },
    { key: 'material', label: '강의안·PDF', count: counts.material },
    { key: 'notice', label: '공지사항', count: counts.notice },
  ];

  return (
    <section id="board" className="border-b border-stone-200 bg-[#F4F1EA]">
      <div className="max-w-[1200px] mx-auto px-6 py-12 lg:py-14">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
          <div>
            <p className="font-mono text-xs tracking-widest text-stone-500 uppercase">
              VIDEO &amp; RESOURCE BULLETIN · 열린 자료·영상 게시판
            </p>
            <h2 className="mt-1.5 font-serif text-2xl sm:text-3xl font-semibold text-[#161616] text-balance">
              영상 · 자료 게시판
            </h2>
            <p className="mt-1.5 text-sm text-stone-600 max-w-2xl">
              특강 보충 영상, 강의안 PDF, 도판 참고 자료 및 공지사항을 열람할 수 있는 첫 화면 게시판입니다.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenComposer}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D3557]"
            >
              <Plus className="w-4 h-4" />
              <span>자료·영상 게시하기</span>
            </button>
          )}
        </div>

        {/* Framed Bulletin Board Window */}
        <div className="border border-stone-300 bg-white">
          {/* Board Toolbar: Category Tabs & Search */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-stone-200 bg-[#FAF9F6] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="게시판 분류">
              {filterTabs.map((tab) => {
                const isActive = activeCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#161616] text-[#FAF9F6]'
                        : 'text-stone-600 hover:text-[#161616] hover:bg-stone-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`ml-1.5 font-mono tabular-nums ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="게시글 제목·내용 검색"
                aria-label="게시글 검색"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 text-[#161616] placeholder:text-stone-400 focus:outline-none focus:border-[#1D3557]"
              />
            </div>
          </div>

          {/* Board Table Header (Desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 border-b border-stone-200 bg-[#FAF9F6]/60 font-mono text-[11px] text-stone-500 uppercase tracking-wider">
            <div className="col-span-2">분류</div>
            <div className="col-span-6">제목 · 첨부 자료</div>
            <div className="col-span-2">작성자</div>
            <div className="col-span-1 text-right">게시일</div>
            <div className="col-span-1 text-right">조회</div>
          </div>

          {/* Board Rows */}
          {visiblePosts.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-serif text-lg text-stone-700">
                {query.trim()
                  ? '검색어와 일치하는 게시물이 없습니다.'
                  : '아직 등록된 영상·자료가 없습니다.'}
              </p>
              <p className="mt-1.5 text-xs text-stone-500">
                {isAdmin
                  ? '우측 상단 ‘자료·영상 게시하기’ 버튼을 눌러 첫 게시물을 올려보세요.'
                  : '아직 게시된 영상이나 강의 자료가 없습니다.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {visiblePosts.map((post) => {
                const hasVideo = Boolean(post.videoUrl?.trim());
                const hasFile = Boolean(post.attachmentUrl?.trim());
                const hasLink = Boolean(post.externalUrl?.trim());

                return (
                  <li key={post.id} className={post.pinned ? 'bg-[#F4F1EA]/55' : 'bg-white'}>
                    <button
                      type="button"
                      onClick={() => onSelectPost(post)}
                      className="w-full text-left px-4 sm:px-6 py-4 hover:bg-[#EFECE5]/60 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1D3557]"
                    >
                      {/* Desktop Row */}
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-2 flex items-center gap-1.5 font-mono text-xs whitespace-nowrap">
                          {post.pinned && (
                            <span className="inline-flex items-center gap-1 text-[#1D3557] font-semibold">
                              <Pin className="w-3 h-3" />
                              <span>고정</span>
                            </span>
                          )}
                          {post.pinned && <span aria-hidden="true" className="text-stone-300">·</span>}
                          <span className="text-stone-600">{CATEGORY_LABEL[post.category]}</span>
                        </div>

                        <div className="col-span-6 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-[#161616] truncate">
                              {post.title}
                            </span>
                            {hasVideo && (
                              <span
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#1D3557] shrink-0"
                                title="영상 포함"
                              >
                                <Film className="w-3.5 h-3.5" />
                                <span>영상</span>
                              </span>
                            )}
                            {hasFile && (
                              <span
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-500 shrink-0"
                                title="첨부 파일 포함"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>파일</span>
                              </span>
                            )}
                            {hasLink && (
                              <span
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-500 shrink-0"
                                title="참고 링크 포함"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          {post.summary && (
                            <p className="mt-0.5 text-xs text-stone-500 truncate">{post.summary}</p>
                          )}
                        </div>

                        <div className="col-span-2 text-xs text-stone-600 truncate">
                          {post.author}
                        </div>

                        <div className="col-span-1 text-right font-mono text-xs text-stone-500 tabular-nums whitespace-nowrap">
                          {formatKoreanDate(post.publishedAt)}
                        </div>

                        <div className="col-span-1 text-right font-mono text-xs text-stone-500 tabular-nums whitespace-nowrap">
                          {post.viewCount.toLocaleString('ko-KR')}
                        </div>
                      </div>

                      {/* Mobile Stacked Row */}
                      <div className="md:hidden flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-stone-500 tabular-nums">
                            {post.pinned && (
                              <>
                                <span className="text-[#1D3557] font-semibold">고정</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span>{CATEGORY_LABEL[post.category]}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatKoreanDate(post.publishedAt)}</span>
                            {hasVideo && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#1D3557]">영상</span>
                              </>
                            )}
                            {hasFile && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>첨부파일</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-[#161616] line-clamp-2">
                            {post.title}
                          </p>
                          {post.summary && (
                            <p className="mt-1 text-xs text-stone-500 line-clamp-1">
                              {post.summary}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 shrink-0 mt-1" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Board Footer Bar */}
          {filteredPosts.length > 6 && (
            <div className="px-6 py-3 border-t border-stone-200 bg-[#FAF9F6] flex items-center justify-between text-xs text-stone-600">
              <span className="font-mono tabular-nums">
                전체 {filteredPosts.length}건 중 {visiblePosts.length}건 표시
              </span>
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer"
              >
                {showAll ? '목록 접기' : `전체 ${filteredPosts.length}건 모두 보기`}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
