"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

type AuditPoint = { date: string; score: number; grade: string; url: string };

export function DashboardCharts() {
  const [data, setData] = useState<{
    auditTrend: AuditPoint[];
    totalKeywords: number;
    totalTracked: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.auditTrend.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow)]">
      <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">Audit score trend</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.auditTrend}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3b2f68" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={11}
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "var(--shadow-lg)",
              }}
              labelStyle={{ color: "#e4e4e7", fontWeight: 600 }}
              formatter={(value: number | undefined) => [`${value ?? 0}/100`, "Score"]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.url
                  ? `${payload[0].payload.url} (${new Date(payload[0].payload.date).toLocaleDateString()})`
                  : ""
              }
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        Last {data.auditTrend.length} audits.{" "}
        <Link href="/audit/history" className="font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-muted)] hover:underline">
          View all
        </Link>
      </p>
    </div>
  );
}
