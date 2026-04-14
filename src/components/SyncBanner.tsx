'use client';

import { useSync } from '@/hooks/useSync';
import { useEffect, useState } from 'react';

export default function SyncBanner() {
  const { progress, busy, retry } = useSync();
  const [hideDone, setHideDone] = useState(false);

  // done 되면 3초 후 자동 숨김
  useEffect(() => {
    if (progress?.phase === 'done') {
      const t = setTimeout(() => setHideDone(true), 3000);
      return () => clearTimeout(t);
    } else {
      setHideDone(false);
    }
  }, [progress?.phase]);

  if (!progress) return null;
  if (progress.phase === 'done' && hideDone) return null;

  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  const isError = progress.phase === 'error';
  const isDone = progress.phase === 'done';

  return (
    <div className={`fixed top-0 inset-x-0 z-50 ${isError ? 'bg-red-600' : isDone ? 'bg-emerald-600' : 'bg-indigo-600'} text-white shadow-lg`}>
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        {!isDone && !isError && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        {isDone && <span className="flex-shrink-0">✓</span>}
        {isError && <span className="flex-shrink-0">⚠</span>}

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{progress.message}</div>
          {progress.total > 0 && !isError && !isDone && (
            <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          )}
          {progress.total === 0 && !isError && !isDone && progress.loaded > 0 && (
            <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
              {/* total 미상 — 무한 루프 애니메이션 */}
              <div className="h-full w-1/3 bg-white rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {progress.total > 0 && !isDone && !isError && (
          <div className="text-xs font-mono flex-shrink-0">{pct}%</div>
        )}
        {isError && !busy && (
          <button onClick={retry} className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30">재시도</button>
        )}
      </div>
    </div>
  );
}
