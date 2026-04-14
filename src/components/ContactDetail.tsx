'use client';

import { Contact } from '@/lib/supabase';
import CustomerInsightsPanel from './CustomerInsights';

interface ContactDetailProps {
  contact: Contact | null;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function getFullName(contact: Contact): string {
  return [contact.last_name, contact.first_name].filter(Boolean).join(' ') || '이름 없음';
}

function getInitials(contact: Contact): string {
  const last = contact.last_name || '';
  const first = contact.first_name || '';
  if (last) return last[0];
  if (first) return first[0];
  return '?';
}

export default function ContactDetail({ contact, onEdit, onDelete, onClose }: ContactDetailProps) {
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-gray-400 text-sm">연락처를 선택하세요</p>
        </div>
      </div>
    );
  }

  const fields = [
    { icon: PhoneIcon, label: '전화번호', value: contact.phone, href: `tel:${contact.phone}` },
    { icon: PhoneIcon, label: '전화번호 2', value: contact.phone2, href: `tel:${contact.phone2}` },
    { icon: EmailIcon, label: '이메일', value: contact.email, href: `mailto:${contact.email}` },
    { icon: EmailIcon, label: '이메일 2', value: contact.email2, href: `mailto:${contact.email2}` },
    { icon: BuildingIcon, label: '회사', value: contact.company },
    { icon: BriefcaseIcon, label: '직위', value: contact.position },
    { icon: MapPinIcon, label: '주소', value: contact.address },
    { icon: NoteIcon, label: '메모', value: contact.memo },
  ].filter(f => f.value);

  return (
    <div className="flex-1 bg-white overflow-y-auto">
      {/* 상단 프로필 — 컴팩트 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-white relative flex items-center gap-3">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors lg:hidden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {contact.profile_image ? (
          <img src={contact.profile_image} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-base font-bold flex-shrink-0">
            {getInitials(contact)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold truncate">{getFullName(contact)}</h2>
          {(contact.company || contact.position) && (
            <p className="text-white/80 text-xs truncate">
              {contact.company}{contact.position ? ` · ${contact.position}` : ''}
            </p>
          )}
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} title="전화" className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition-colors">
              <PhoneIcon className="w-4 h-4" />
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} title="이메일" className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition-colors">
              <EmailIcon className="w-4 h-4" />
            </a>
          )}
          <button onClick={onEdit} title="수정" className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition-colors">
            <EditIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 본문: 좌(기본정보) / 우(고객 인사이트) — 넓은 화면에서만 2단 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] divide-y xl:divide-y-0 xl:divide-x divide-gray-100">
        {/* 좌측 — 기본 정보 */}
        <div>
          <div className="p-6 space-y-1">
            {fields.map((field, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
                <field.icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-0.5">{field.label}</div>
                  {field.href ? (
                    <a href={field.href} className="text-sm text-indigo-600 hover:underline break-all">{field.value}</a>
                  ) : (
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{field.value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 삭제 버튼 */}
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={() => {
                if (confirm(`'${getFullName(contact)}' 연락처를 삭제하시겠습니까?`)) {
                  onDelete(contact.id);
                }
              }}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              연락처 삭제
            </button>
            <div className="mt-4 text-xs text-gray-400">
              생성: {new Date(contact.created_at).toLocaleDateString('ko-KR')} |
              수정: {new Date(contact.updated_at).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 우측 — 고객 인사이트 (TNT mall 연동 자리) */}
        <CustomerInsightsPanel phone={contact.phone} />
      </div>
    </div>
  );
}

// 아이콘 컴포넌트들
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
