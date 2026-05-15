"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  CheckSquare,
  MessageCircle,
  Target,
  BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown } from "lucide-react";

export default function DashboardPage() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["reporting", "dashboard"],
    queryFn: () => api.get("/reporting/dashboard").then((r) => r.data),
  });

  const { data: funnel = [] } = useQuery({
    queryKey: ["reporting", "sales-funnel"],
    queryFn: () => api.get("/reporting/sales-funnel").then((r) => r.data),
  });

  const { data: bySource = [] } = useQuery({
    queryKey: ["reporting", "leads-by-source"],
    queryFn: () => api.get("/reporting/leads-by-source").then((r) => r.data),
  });

  const { data: activitiesTimeline = [] } = useQuery({
    queryKey: ["reporting", "activities-timeline"],
    queryFn: () =>
      api.get("/reporting/activities-timeline").then((r) => r.data),
  });

  const { data: campaignStats = [] } = useQuery({
    queryKey: ["reporting", "campaign-stats"],
    queryFn: () => api.get("/reporting/campaign-stats").then((r) => r.data),
  });

  // Sparkline trend từ activities (7 ngày gần nhất, tổng activity/day)
  const activityTrend: { date: string; value: number }[] = (activitiesTimeline as any[]).map((d: any) => {
    const byType: Record<string, number> = d.byType ?? {};
    const total = Object.values(byType).reduce<number>((s, v) => s + (Number(v) || 0), 0);
    return { date: String(d.date), value: total };
  });
  // Delta: so sánh 3 ngày cuối vs 3 ngày đầu
  const computeDelta = (data: { value: number }[]) => {
    if (data.length < 4) return 0;
    const half = Math.floor(data.length / 2);
    const recent = data.slice(half).reduce((s, d) => s + d.value, 0);
    const prior = data.slice(0, half).reduce((s, d) => s + d.value, 0);
    if (prior === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - prior) / prior) * 100);
  };
  const activityDelta = computeDelta(activityTrend);

  const stats = [
    {
      label: "Khách hàng tiềm năng",
      value: dash?.leads?.total ?? 0,
      icon: Users,
      sparkColor: '#3b82f6',
    },
    {
      label: "Cơ hội đang mở",
      value:
        dash?.deals?.byStage?.reduce((s: number, d: any) => s + d.count, 0) ??
        0,
      icon: TrendingUp,
      sparkColor: '#10b981',
    },
    {
      label: "Nhiệm vụ đang mở",
      value: dash?.tasks?.open ?? 0,
      icon: CheckSquare,
      sparkColor: '#f59e0b',
    },
    {
      label: "Hội thoại đang mở",
      value: dash?.conversations?.open ?? 0,
      icon: MessageCircle,
      sparkColor: '#a78bfa',
    },
  ];

  // Total deal value across all stages
  const totalDealValue =
    dash?.deals?.byStage?.reduce(
      (s: number, d: any) => s + parseFloat(d.totalValue ?? "0"),
      0,
    ) ?? 0;

  // Max funnel count for bar width scaling
  const maxFunnelCount = Math.max(1, ...funnel.map((f: any) => f.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tổng quan</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Dữ liệu thời gian thực từ hệ thống CRM
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <s.icon size={16} className="text-zinc-400 dark:text-zinc-500" />
              {!isLoading && activityTrend.length > 0 && (
                <div className="w-16 h-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityTrend}>
                      <Line type="monotone" dataKey="value" stroke={s.sparkColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-20 mb-1" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{s.value.toLocaleString('vi-VN')}</p>
                {activityDelta !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    activityDelta > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {activityDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {Math.abs(activityDelta)}%
                  </span>
                )}
              </div>
            )}
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Phễu bán hàng
            </h2>
            <span className="ml-auto text-xs text-zinc-400">
              Tổng: {formatCurrency(totalDealValue)}
            </span>
          </div>
          <div className="space-y-3">
            {funnel.length === 0 && !isLoading && (
              <p className="text-sm text-zinc-400 text-center py-6">
                Chưa có dữ liệu
              </p>
            )}
            {funnel.map((stage: any) => (
              <div key={stage.stage.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">
                    {stage.stage.name}
                  </span>
                  <span className="text-zinc-500">
                    {stage.count} deal ·{" "}
                    {formatCurrency(parseFloat(stage.totalValue ?? "0"))}
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(stage.count / maxFunnelCount) * 100}%`,
                      backgroundColor: stage.stage.color ?? "#6366f1",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Source — Recharts BarChart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Lead theo nguồn</h2>
          </div>
          {bySource.length === 0 && !isLoading ? (
            <p className="text-sm text-zinc-400 text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={bySource.map((s: any) => ({
                  name: { website: 'Website', referral: 'Giới thiệu', facebook: 'Facebook', zalo: 'Zalo', cold_call: 'Cold Call', other: 'Khác' }[s.source as string] ?? s.source ?? 'Khác',
                  value: s._count?.source ?? 0,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#52525b' }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f4f4f5' }} formatter={(v: any) => [`${v} lead`, 'Số lượng']} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Lead Status — PieChart */}
      {dash?.leads?.byStatus && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Trạng thái Lead</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={dash.leads.byStatus.map((s: any) => ({
                  name: { NEW: 'Mới', CONTACTED: 'Đã liên hệ', QUALIFIED: 'Đủ điều kiện', UNQUALIFIED: 'Không phù hợp', CONVERTED: 'Đã chuyển đổi' }[s.status as string] ?? s.status,
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
                  <Cell key={i} fill={['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'][i % 5]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} formatter={(v: any) => [`${v} lead`, '']} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities Timeline — Recharts Stacked BarChart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Hoạt động theo ngày (7 ngày)</h2>
          </div>
          {activitiesTimeline.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={activitiesTimeline.map((d: any) => ({
                  date: new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
                  Gọi: d.byType?.CALL ?? 0,
                  Email: d.byType?.EMAIL ?? 0,
                  Họp: d.byType?.MEETING ?? 0,
                  Task: d.byType?.TASK ?? 0,
                  Khác: d.byType?.OTHER ?? 0,
                }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f9f9f9' }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#71717a', paddingTop: 8 }} />
                <Bar dataKey="Gọi" stackId="a" fill="#60a5fa" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="Email" stackId="a" fill="#a78bfa" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="Họp" stackId="a" fill="#fbbf24" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="Task" stackId="a" fill="#34d399" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="Khác" stackId="a" fill="#94a3b8" radius={[4,4,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Campaign Stats chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Thống kê chiến dịch
            </h2>
          </div>
          {campaignStats.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">
              Chưa có dữ liệu
            </p>
          ) : (
            <div className="space-y-4">
              {campaignStats.map((c: any) => {
                const maxVal = Math.max(1, c.sentCount ?? 0);
                const bars = [
                  {
                    label: "Đã gửi",
                    value: c.sentCount ?? 0,
                    color: "bg-indigo-500",
                    max: maxVal,
                  },
                  {
                    label: "Đã mở",
                    value: c.openCount ?? 0,
                    color: "bg-emerald-500",
                    max: maxVal,
                  },
                  {
                    label: "Click",
                    value: c.clickCount ?? 0,
                    color: "bg-amber-500",
                    max: maxVal,
                  },
                ];
                return (
                  <div key={c.id}>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">
                      {c.name}
                    </p>
                    <div className="space-y-1">
                      {bars.map(({ label, value, color, max }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 w-14 shrink-0">
                            {label}
                          </span>
                          <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full transition-all`}
                              style={{ width: `${(value / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8 text-right">
                            {value.toLocaleString()}
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
    </div>
  );
}