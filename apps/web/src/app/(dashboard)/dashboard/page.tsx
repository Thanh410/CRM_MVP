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

  const stats = [
    {
      label: "Kh�ch h�ng ti?m nang",
      value: dash?.leads?.total ?? 0,
      icon: Users,
    },
    {
      label: "Co h?i dang m?",
      value:
        dash?.deals?.byStage?.reduce((s: number, d: any) => s + d.count, 0) ??
        0,
      icon: TrendingUp,
    },
    {
      label: "Nhi?m v? dang m?",
      value: dash?.tasks?.open ?? 0,
      icon: CheckSquare,
    },
    {
      label: "H?i tho?i dang m?",
      value: dash?.conversations?.open ?? 0,
      icon: MessageCircle,
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
        <h1 className="text-xl font-semibold text-zinc-900">T?ng quan</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          D? li?u th?i gian th?c t? h? th?ng CRM
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm"
          >
            <s.icon size={16} className="text-zinc-400 mb-3" />
            <p className="text-3xl font-bold text-zinc-900">
              {isLoading ? "�" : s.value}
            </p>
            <p className="text-sm text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Ph?u b�n h�ng
            </h2>
            <span className="ml-auto text-xs text-zinc-400">
              T?ng: {formatCurrency(totalDealValue)}
            </span>
          </div>
          <div className="space-y-3">
            {funnel.length === 0 && !isLoading && (
              <p className="text-sm text-zinc-400 text-center py-6">
                Chua c� d? li?u
              </p>
            )}
            {funnel.map((stage: any) => (
              <div key={stage.stage.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">
                    {stage.stage.name}
                  </span>
                  <span className="text-zinc-500">
                    {stage.count} deal �{" "}
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

        {/* Leads by Source */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Lead theo ngu?n
            </h2>
          </div>
          <div className="space-y-3">
            {bySource.length === 0 && !isLoading && (
              <p className="text-sm text-zinc-400 text-center py-6">
                Chua c� d? li?u
              </p>
            )}
            {(() => {
              const maxCount = Math.max(
                1,
                ...bySource.map((s: any) => s._count?.source ?? 0),
              );
              return bySource.map((s: any) => {
                const count = s._count?.source ?? 0;
                const sourceLabels: Record<string, string> = {
                  website: "Website",
                  referral: "Gi?i thi?u",
                  facebook: "Facebook",
                  zalo: "Zalo",
                  cold_call: "Cold Call",
                  other: "Kh�c",
                };
                return (
                  <div key={s.source ?? "unknown"}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">
                        {sourceLabels[s.source] ?? s.source ?? "Kh�ng r�"}
                      </span>
                      <span className="text-zinc-500">{count} lead</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Leads breakdown */}
      {dash?.leads?.byStatus && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">
            Tr?ng th�i Lead
          </h2>
          <div className="flex flex-wrap gap-3">
            {dash.leads.byStatus.map((s: any) => {
              const labels: Record<string, string> = {
                NEW: "M?i",
                CONTACTED: "�� li�n h?",
                QUALIFIED: "�? di?u ki?n",
                UNQUALIFIED: "Kh�ng ph� h?p",
                CONVERTED: "�� chuy?n d?i",
              };
              const colors: Record<string, string> = {
                NEW: "bg-blue-50 text-blue-700",
                CONTACTED: "bg-amber-50 text-amber-700",
                QUALIFIED: "bg-emerald-50 text-emerald-700",
                UNQUALIFIED: "bg-red-50 text-red-700",
                CONVERTED: "bg-indigo-50 text-indigo-700",
              };
              return (
                <div
                  key={s.status}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[s.status] ?? "bg-gray-50 text-gray-700"}`}
                >
                  <span className="text-sm font-bold">{s.count}</span>
                  <span className="text-xs">
                    {labels[s.status] ?? s.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities Timeline chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Ho?t d?ng theo ng�y (7 ng�y)
            </h2>
          </div>
          {activitiesTimeline.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">
              Chua c� d? li?u
            </p>
          ) : (
            <div className="space-y-1">
              {(() => {
                const typeColors: Record<string, string> = {
                  CALL: "bg-blue-400",
                  EMAIL: "bg-violet-400",
                  MEETING: "bg-amber-400",
                  NOTE: "bg-gray-400",
                  TASK: "bg-green-400",
                  OTHER: "bg-slate-400",
                };
                const typeLabels: Record<string, string> = {
                  CALL: "G?i",
                  EMAIL: "Email",
                  MEETING: "H?p",
                  NOTE: "Ghi ch�",
                  TASK: "Task",
                  OTHER: "Kh�c",
                };
                // Find max total per day for scaling
                const maxTotal = Math.max(
                  1,
                  ...activitiesTimeline.map((d: any) => {
                    const byType = d.byType ?? {};
                    return Object.values(byType).reduce(
                      (s: number, v: any) => s + (v as number),
                      0,
                    );
                  }),
                );
                return activitiesTimeline.map((d: any) => {
                  const byType = d.byType ?? {};
                  const total = Object.values(byType).reduce(
                    (s: number, v: any) => s + (v as number),
                    0,
                  );
                  return (
                    <div key={d.date}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-zinc-500 w-20 shrink-0">
                          {new Date(d.date).toLocaleDateString("vi-VN", {
                            weekday: "short",
                            month: "numeric",
                            day: "numeric",
                          })}
                        </span>
                        <div className="flex-1 mx-2 h-4 bg-zinc-100 rounded overflow-hidden flex">
                          {Object.entries(byType).map(
                            ([type, count]: [string, any]) => (
                              <div
                                key={type}
                                className={`h-full ${typeColors[type] ?? "bg-gray-400"} transition-all`}
                                style={{
                                  width: `${(count / maxTotal) * 100}%`,
                                }}
                                title={`${typeLabels[type] ?? type}: ${count}`}
                              />
                            ),
                          )}
                        </div>
                        <span className="text-zinc-500 w-6 text-right">
                          {(total as number).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
              <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-zinc-100">
                {[
                  ["CALL", "G?i", "bg-blue-400"],
                  ["EMAIL", "Email", "bg-violet-400"],
                  ["MEETING", "H?p", "bg-amber-400"],
                  ["TASK", "Task", "bg-green-400"],
                  ["OTHER", "Kh�c", "bg-slate-400"],
                ].map(([, label, cls]) => (
                  <div
                    key={label}
                    className="flex items-center gap-1 text-xs text-zinc-500"
                  >
                    <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Campaign Stats chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Th?ng k� chi?n d?ch
            </h2>
          </div>
          {campaignStats.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">
              Chua c� d? li?u
            </p>
          ) : (
            <div className="space-y-4">
              {campaignStats.map((c: any) => {
                const maxVal = Math.max(1, c.sentCount ?? 0);
                const bars = [
                  {
                    label: "�� g?i",
                    value: c.sentCount ?? 0,
                    color: "bg-indigo-500",
                    max: maxVal,
                  },
                  {
                    label: "�� m?",
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
