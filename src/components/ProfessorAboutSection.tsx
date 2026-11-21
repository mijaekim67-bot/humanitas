import { Mail, Clock, Building2 } from 'lucide-react';
import type { ProfessorProfile } from '../types/archive.ts';
import { ArtFrame } from './ArtFrame.tsx';

interface ProfessorAboutSectionProps {
  profile: ProfessorProfile;
  onOpenSettings: () => void;
}

export function ProfessorAboutSection({
  profile,
  onOpenSettings,
}: ProfessorAboutSectionProps) {
  return (
    <section id="about" className="bg-[#FAF9F6]">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left 70%: Curatorial Essay & Pull Quote */}
          <div className="lg:col-span-7">
            <p className="font-mono text-xs tracking-widest text-stone-500 uppercase">
              CURATORIAL STATEMENT
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-[#161616]">
              강의실의 사유를 영상 아카이브로 기록하다
            </h2>

            <div className="mt-8 max-w-prose space-y-6 text-[15.5px] leading-[1.85] text-stone-700">
              <p className="editorial-dropcap">{profile.curatorialStatement}</p>
              <p>{profile.bio}</p>
            </div>

            {profile.pullQuote && (
              <blockquote className="mt-10 py-8 border-y border-stone-200 max-w-prose">
                <p className="font-serif text-xl sm:text-2xl italic leading-relaxed text-[#161616]">
                  {profile.pullQuote}
                </p>
              </blockquote>
            )}
          </div>

          {/* Right 30%: Professor Study Frame & Contact Details */}
          <aside className="lg:col-span-5">
            <ArtFrame
              src={profile.studioImageUrl}
              alt={`${profile.professorName} 연구실`}
              title={profile.professorName}
              aspectClass="aspect-[4/3]"
            />
            <p className="mt-2.5 font-serif text-xs italic text-stone-500">
              Fig. — {profile.affiliation} 연구 서재 및 도판 아카이브
            </p>

            <div className="mt-6 pt-6 border-t border-stone-200 space-y-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-[#161616]">
                  {profile.professorName}
                </h3>
                <p className="text-sm text-stone-600 mt-0.5">
                  {profile.professorTitle}
                </p>
              </div>

              <dl className="space-y-3 text-sm text-stone-600 pt-2">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div>
                    <dt className="sr-only">소속</dt>
                    <dd>{profile.affiliation}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div>
                    <dt className="sr-only">면담 및 질의 시간</dt>
                    <dd>{profile.officeHours}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div>
                    <dt className="sr-only">이메일</dt>
                    <dd className="font-mono text-xs">{profile.email}</dd>
                  </div>
                </div>
              </dl>

              <div className="pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-xs font-medium text-[#1D3557] hover:underline underline-offset-4 cursor-pointer"
                >
                  교수자 정보 및 웹사이트 틀 수정하기
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
