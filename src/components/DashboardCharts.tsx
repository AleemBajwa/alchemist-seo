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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h3 className="mb-4 font-semibold text-zinc-100">Audit score trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.auditTrend}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={11}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#9ca3af" }}
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
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Last {data.auditTrend.length} audits.{" "}
        <Link href="/audit/history" className="text-[var(--accent)] hover:underline">
          View all
        </Link>
      </p>
    </div>
  );
}
