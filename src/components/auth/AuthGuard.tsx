'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // TODO: 테스트 완료 후 인증 로직 복원
  return <>{children}</>;
}
