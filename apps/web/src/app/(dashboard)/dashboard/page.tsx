'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCompactVND, formatCurrency } from '@/lib/utils';
import {
  Users,
  TrendingUp,
  CheckSquare,
  MessageCircle,
  Target,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/ui/kpi-card';
import { useAuthStore } from '@/store/auth.store';

const STAGE_GRADIENT: Record<string, [string, string]> = {
  potential: ['hsl(var(--aurora-violet))', 'hsl(var(--aurora-indigo))'],
  contacted: ['hsl(var(--aurora-indigo))', 'hsl(var(--aurora-cyan))'],
  quoted: ['hsl(var(--aurora-cyan))', 'hsl(var(--aurora-mint))'],
  negotiate: ['hsl(35 100% 60%)', 'hsl(20 90% 55%)'],
  won: ['hsl(150 70% 50%)', 'hsl(160 75% 40%)'],
  closed_won: ['hsl(150 70% 50%)', 'hsl(160 75% 40%)'],
  closed_lost: ['hsl(350 75% 60%)', 'hsl(340 80% 55%)'],
};

function stageGradient(key: string): [string, string] {
  return STAGE_GRADIENT[key] ?? ['hsl(var(--aurora-violet))', 'hsl(var(--aurora-pink))'];
}

function greeting(name?: string) {
  const h = new Date().getHours();
  const part = h < 12 ? 'sáng' : h < 18 ? 'chiều' : 'tối';
  const first = (name ?? '').split(' ').pop() ?? '';
  return `Chào buổi ${part}${first ? ', ' + first : ''} 👋`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: dash, isLoading } = useQuery({
    queryKey: ['reporting', 'dashboard'],
    queryFn: () => api.get('/reporting/dashboard').then((r) => r.data),
  });

  const { data: funnel = [] } = useQuery({
    queryKey: ['reporting', 'sales-funnel'],
    queryFn: () => api.get('/reporting/sales-funnel').then((r) => r.data),
  });

  const { data: bySource = [] } = useQuery({
    queryKey: ['reporting', 'leads-by-source'],
    queryFn: () => api.get('/reporting/leads-by-source').then((r) => r.data),
  });

  const { data: activitiesTimeline = [] } = useQuery({
    queryKey: ['reporting', 'activities-timeline'],
    queryFn: () => api.get('/reporting/activities-timeline').then((r) => r.data),
  });

  const { data: campaignStats = [] } = useQuery({
    queryKey: ['reporting', 'campaign-stats'],
    queryFn: () => api.get('/reporting/campaign-stats').then((r) => r.data),
  });

  // Sparkline trend từ activities (7 ngày gần nhất, tổng activity/day)
  const activityTrend: number[] = (activitiesTimeline as any[]).map((d: any) => {
    const byType: Record<string, number> = d.byType ?? {};
    return Object.values(byType).reduce<number>((s, v) => s + (Number(v) || 0), 0);
  });

  // Delta: so sánh nửa cuối vs nửa đầu
  const computeDelta = (data: number[]) => {
    if (data.length < 4) return 0;
    const half = Math.floor(data.length / 2);
    const recent = data.slice(half).reduce((s, v) => s + v, 0);
    const prior = data.slice(0, half).reduce((s, v) => s + v, 0);
    if (prior === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - prior) / prior) * 100);
  };
  const activityDelta = computeDelta(activityTrend);

  const totalDealValue: number =
    dash?.deals?.byStage?.reduce((s: number, d: any) => s + parseFloat(d.totalValue ?? '0'), 0) ?? 0;

  const totalDeals: number =
    dash?.deals?.byStage?.reduce((s: number, d: any) => s + d.count, 0) ?? 0;

  const maxFunnelCount = Math.max(1, ...funnel.map((f: any) => f.count));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{greeting(user?.fullName)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tổng quan hoạt động CRM theo thời gian thực.
        </p>
      </div>

      {/* KPI Bento row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <KpiCard
              icon={Users}
              label="Khách hàng tiềm năng"
              value={dash?.leads?.total ?? 0}
              format="comma"
              color="aurora-violet"
              spark={activityTrend.length > 1 ? activityTrend : undefined}
              delta={activityDelta !== 0 ? { value: activityDelta } : undefined}
              delay={0}
            />
            <KpiCard
              icon={TrendingUp}
              label="Cơ hội đang mở"
              value={totalDeals}
              format="comma"
              color="aurora-cyan"
              spark={activityTrend.length > 1 ? activityTrend : undefined}
              delta={activityDelta !== 0 ? { value: activityDelta } : undefined}
              delay={120}
            />
            <KpiCard
              icon={CheckSquare}
              label="Nhiệm vụ đang mở"
              value={dash?.tasks?.open ?? 0}
              format="comma"
              color="aurora-mint"
              spark={activityTrend.length > 1 ? activityTrend : undefined}
              delay={190}
            />
            <KpiCard
              icon={MessageCircle}
              label="Hội thoại đang mở"
              value={dash?.conversations?.open ?? 0}
              format="comma"
              color="aurora-rose"
              spark={activityTrend.length > 1 ? activityTrend : undefined}
              delay={260}
            />
          </>
        )}
      </div>

      {/* Funnel + Lead by source — bento col-span-2 + 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Funnel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-soft relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-60 h-60 bg-aurora-soft blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-display text-base font-bold">Phễu bán hàng</h2>
                <p className="text-xs text-muted-foreground">
                  Tổng giá trị {formatCompactVND(totalDealValue)} · {totalDeals} cơ hội
                </p>
              </div>
              <Target size={16} className="text-aurora-violet" />
            </div>
            <div className="mt-5 space-y-3">
              {funnel.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
              )}
              {funnel.map((stage: any, i: number) => {
                const pct = (stage.count / maxFunnelCount) * 100;
                const [from, to] = stageGradient(stage.stage.key ?? stage.stage.id ?? '');
                const isLast = i === funnel.length - 1;
                return (
                  <div key={stage.stage.id} className="flex items-center gap-4">
                    <div className="w-28 text-xs font-medium truncate">{stage.stage.name}</div>
                    <div className="flex-1 h-9 rounded-lg bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-lg flex items-center px-3 text-white text-xs font-semibold transition-[width] duration-700 ease-out ${
                          isLast ? 'shine' : ''
                        }`}
                        style={{
                          width: `${Math.max(pct, 6)}%`,
                          background: `linear-gradient(90deg, ${from}, ${to})`,
                        }}
                      >
                        {stage.count} deal · {formatCompactVND(parseFloat(stage.totalValue ?? '0'))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold">Lead theo nguồn</h2>
            <BarChart3 size={16} className="text-aurora-cyan" />
          </div>
          {bySource.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={bySource.map((s: any) => ({
                  name:
                    {
                      website: 'Website',
                      referral: 'Giới thiệu',
                      facebook: 'Facebook',
                      zalo: 'Zalo',
                      cold_call: 'Cold Call',
                      other: 'Khác',
                    }[s.source as string] ?? s.source ?? 'Khác',
                  value: s._count?.source ?? 0,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barSource" x1="0" x2="1">
                    <stop offset="0%" stopColor="hsl(var(--aurora-violet))" />
                    <stop offset="100%" stopColor="hsl(var(--aurora-pink))" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  formatter={(v: any) => [`${v} lead`, 'Số lượng']}
                />
                <Bar dataKey="value" fill="url(#barSource)" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Status — PieChart */}
        {dash?.leads?.byStatus && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
            <h2 className="font-display text-base font-bold mb-4">Trạng thái Lead</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dash.leads.byStatus.map((s: any) => ({
                    name:
                      {
                        NEW: 'Mới',
                        CONTACTED: 'Đã liên hệ',
                        QUALIFIED: 'Đủ điều kiện',
                        UNQUALIFIED: 'Không phù hợp',
                        CONVERTED: 'Đã chuyển đổi',
                      }[s.status as string] ?? s.status,
                    value: s.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dash.leads.byStatus.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill={
                        [
                          'hsl(var(--aurora-violet))',
                          'hsl(var(--aurora-indigo))',
                          'hsl(var(--aurora-cyan))',
                          'hsl(var(--aurora-mint))',
                          'hsl(var(--aurora-pink))',
                        ][i % 5]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(v: any) => [`${v} lead`, '']}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Activities Timeline — Recharts Stacked BarChart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold">Hoạt động 7 ngày</h2>
            <BarChart3 size={16} className="text-aurora-amber" />
          </div>
          {activitiesTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(activitiesTimeline as any[]).map((d: any) => ({
                  date: new Date(d.date).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: 'numeric',
                  }),
                  Gọi: d.byType?.CALL ?? 0,
                  Email: d.byType?.EMAIL ?? 0,
                  Họp: d.byType?.MEETING ?? 0,
                  Task: d.byType?.TASK ?? 0,
                  Khác: d.byType?.OTHER ?? 0,
                }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: 11,
                    color: 'hsl(var(--muted-foreground))',
                    paddingTop: 8,
                  }}
                />
                <Bar dataKey="Gọi" stackId="a" fill="hsl(var(--aurora-indigo))" maxBarSize={32} />
                <Bar dataKey="Email" stackId="a" fill="hsl(var(--aurora-violet))" maxBarSize={32} />
                <Bar dataKey="Họp" stackId="a" fill="hsl(var(--aurora-amber))" maxBarSize={32} />
                <Bar dataKey="Task" stackId="a" fill="hsl(var(--aurora-mint))" maxBarSize={32} />
                <Bar
                  dataKey="Khác"
                  stackId="a"
                  fill="hsl(var(--muted-foreground))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-bold">Thống kê chiến dịch</h2>
          <Target size={16} className="text-aurora-pink" />
        </div>
        {campaignStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaignStats.map((c: any) => {
              const maxVal = Math.max(1, c.sentCount ?? 0);
              const bars = [
                { label: 'Đã gửi', value: c.sentCount ?? 0, color: 'hsl(var(--aurora-indigo))' },
                { label: 'Đã mở', value: c.openCount ?? 0, color: 'hsl(var(--aurora-mint))' },
                { label: 'Click', value: c.clickCount ?? 0, color: 'hsl(var(--aurora-amber))' },
              ];
              return (
                <div key={c.id}>
                  <p className="text-xs font-semibold mb-2">{c.name}</p>
                  <div className="space-y-1.5">
                    {bars.map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(value / maxVal) * 100}%`, background: color }}
                          />
                        </div>
                        <span className="text-xs text-foreground w-10 text-right font-medium">
                          {value.toLocaleString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
