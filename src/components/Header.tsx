import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  siteTitle: string;
  onOpenStudio: () => void;
}

export function Header({ siteTitle, onOpenStudio }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '#featured', label: '주요 강의' },
    { href: '#catalog', label: '정기 강좌' },
    { href: '#columns', label: '인문학 산책' },
    { href: '#index', label: '아카이브 색인' },
    { href: '#about', label: '연구실 소개' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element brand wordmark */}
        <a
          href="#top"
          className="font-serif text-xl font-semibold tracking-tight text-[#161616] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D3557]"
        >
          {siteTitle}
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="주요 메뉴"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-[#161616] hover:underline underline-offset-4 decoration-stone-400 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D3557]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenStudio}
            className="px-4 py-2 text-xs font-medium bg-[#1D3557] text-[#FAF9F6] hover:bg-[#152843] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D3557]"
          >
            강의 등록
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="md:hidden p-2 text-stone-700 hover:text-[#161616] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="모바일 메뉴"
          className="md:hidden border-t border-stone-200 bg-[#FAF9F6] px-6 py-4 flex flex-col gap-3 text-sm font-medium text-stone-700"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-[#161616]"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
