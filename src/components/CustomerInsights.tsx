'use client';

import { useEffect, useState } from 'react';
import { fetchCustomerInsights, type CustomerInsights as Insights } from '@/lib/customer-insights';

export default function CustomerInsightsPanel({ phone }: { phone: string | null | undefined }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCustomerInsights(phone).then(d => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [phone]);

  return (
    <div className="p-6 space-y-5">
      <SectionHeader title="고객 요약" />
      <SummaryCards data={data} loading={loading} />

      <SectionHeader title="회원등급" />
      <MemberCard data={data} loading={loading} />

      <SectionHeader title="자주 구매 제품 TOP 5" />
      <TopProducts data={data} loading={loading} />

      <SectionHeader title="최근 주문" />
      <RecentOrders data={data} loading={loading} />

      <p className="text-[11px] text-gray-400 text-center pt-2">
        TNT mall DB 셋업 후 자동으로 데이터가 표시됩니다
      </p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>;
}

function SummaryCards({ data, loading }: { data: Insights | null; loading: boolean }) {
  const s = data?.summary;
  const cards = [
    { label: '누적 주문', value: s ? s.total_orders.toLocaleString() : '—', suffix: '건' },
    { label: '누적 매출', value: s ? formatMoney(s.total_spent) : '—', suffix: '원' },
    { label: '평균 객단가', value: s ? formatMoney(s.avg_order_value) : '—', suffix: '원' },
    { label: '마지막 주문', value: s?.last_order_at ? formatDate(s.last_order_at) : '—', suffix: '' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((c, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-lg">
          <div className="text-[11px] text-gray-500 mb-1">{c.label}</div>
          <div className="text-base font-semibold text-gray-800 truncate">
            {loading ? <Skeleton w={40} /> : <>{c.value}<span className="text-xs font-normal text-gray-400 ml-0.5">{c.suffix}</span></>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberCard({ data, loading }: { data: Insights | null; loading: boolean }) {
  if (loading) return <Card><Skeleton w={120} /></Card>;
  if (!data?.member) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">🥉</div>
          <div>
            <div className="text-sm font-medium text-gray-700">등급 미설정</div>
            <div className="text-[11px] text-gray-400">TNT mall 회원 매칭 없음</div>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <div className="text-sm font-medium text-gray-800">{data.member.level_name}</div>
      <div className="text-[11px] text-gray-500 mt-1">
        주문 {data.member.order_count}건 · 누적 {formatMoney(data.member.total_spent)}원
      </div>
    </Card>
  );
}

function TopProducts({ data, loading }: { data: Insights | null; loading: boolean }) {
  if (loading) return <Card><Skeleton w={200} /></Card>;
  if (!data?.top_products?.length) return <EmptyHint label="구매 이력이 없습니다" />;
  return (
    <Card padding={false}>
      <ul className="divide-y divide-gray-100">
        {data.top_products.map((p, i) => (
          <li key={p.prod_cd} className="flex items-center gap-3 p-3">
            <div className="w-8 text-center text-xs font-semibold text-gray-400">#{i + 1}</div>
            <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
              {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 truncate">{p.name}</div>
              <div className="text-[11px] text-gray-400">{p.prod_cd}</div>
            </div>
            <div className="text-xs font-medium text-indigo-600">{p.purchase_count}회</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecentOrders({ data, loading }: { data: Insights | null; loading: boolean }) {
  if (loading) return <Card><Skeleton w={200} /></Card>;
  if (!data?.recent_orders?.length) return <EmptyHint label="주문 내역이 없습니다" />;
  return (
    <Card padding={false}>
      <ul className="divide-y divide-gray-100">
        {data.recent_orders.map(o => (
          <li key={o.id} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{formatDate(o.ordered_at)}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{o.status}</span>
            </div>
            <div className="text-sm text-gray-800 mt-1 truncate">{o.item_summary}</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">{formatMoney(o.total)}원</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center">
      <div className="text-2xl mb-1 opacity-30">📭</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function Card({ children, padding = true }: { children: React.ReactNode; padding?: boolean }) {
  return <div className={`bg-gray-50 rounded-lg ${padding ? 'p-3' : ''}`}>{children}</div>;
}

function Skeleton({ w }: { w: number }) {
  return <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: w }} />;
}

function formatMoney(n: number): string {
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
