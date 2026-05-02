"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { ParsedForm, DashboardStats, LBPP76ParsedResult } from "@/types/logbook";
import { LOGBOOK_CONSTANTS } from "@/lib/logbook-constants";

// ─── Colour palette (warm, matches design tokens) ────────────────────────────
const COLOURS = {
  contact: "#80502d",
  related: "#c48a5a",
  supervision: "#6a3f21",
  pd: "#d4a574",
  principalIndividual: "#80502d",
  secondaryIndividual: "#97623d",
  group: "#c48a5a",
  telephone: "#d4a574",
  async: "#e8c9a4",
};

// ─── Hours breakdown bar chart ────────────────────────────────────────────────

function HoursBreakdownChart({ forms }: { forms: ParsedForm[] }) {
  const lbppForms = forms.filter(
    (f): f is ParsedForm & { result: LBPP76ParsedResult } =>
      f.result.form_type === "LBPP-76"
  );

  if (lbppForms.length === 0) return null;

  const data = lbppForms.map((form) => {
    const r = form.result;
    const firstDate = r.section_a.entries[0]?.date ?? "";
    const lastDate = r.section_a.entries[r.section_a.entries.length - 1]?.date ?? "";
    const label =
      firstDate && lastDate ? `${firstDate} – ${lastDate}` : form.filename.replace(/\.[^.]+$/, "");
    return {
      name: label.length > 20 ? label.slice(0, 18) + "…" : label,
      "Client Contact": r.section_a.total_client_contact_hours,
      "Client-Related": r.section_a.total_client_related_hours,
      Supervision: r.section_c.total_supervision_hours,
      "PD / Education": r.section_b.total_pd_hours,
    };
  });

  const totalHours = lbppForms.reduce(
    (acc, f) =>
      acc +
      f.result.section_a.total_client_contact_hours +
      f.result.section_a.total_client_related_hours,
    0
  );

  return (
    <div className="card-panel p-5">
      <h3 className="font-semibold text-[var(--text)] mb-4">Hours breakdown by form</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,79,52,0.1)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#624936" }}
            angle={-20}
            textAnchor="end"
          />
          <YAxis tick={{ fontSize: 11, fill: "#624936" }} />
          <Tooltip
            contentStyle={{
              background: "#fbf6ee",
              border: "1px solid rgba(112,79,52,0.24)",
              borderRadius: 8,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Client Contact" stackId="a" fill={COLOURS.contact} />
          <Bar dataKey="Client-Related" stackId="a" fill={COLOURS.related} />
          <Bar dataKey="Supervision" stackId="a" fill={COLOURS.supervision} />
          <Bar dataKey="PD / Education" stackId="a" fill={COLOURS.pd} />
          {totalHours < LOGBOOK_CONSTANTS.TOTAL_INTERNSHIP_HOURS_TARGET && (
            <ReferenceLine
              y={LOGBOOK_CONSTANTS.TOTAL_INTERNSHIP_HOURS_TARGET}
              stroke="#e53e3e"
              strokeDasharray="4 4"
              label={{ value: "1,500 hr target", fill: "#e53e3e", fontSize: 11 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Supervision ratio line chart ─────────────────────────────────────────────

function SupervisionRatioChart({ forms }: { forms: ParsedForm[] }) {
  const lbppForms = forms.filter(
    (f): f is ParsedForm & { result: LBPP76ParsedResult } =>
      f.result.form_type === "LBPP-76"
  );

  if (lbppForms.length === 0) return null;

  let cumulativePractice = 0;
  let cumulativeSupervision = 0;

  const data = lbppForms.map((form) => {
    const r = form.result;
    cumulativePractice +=
      r.section_a.total_client_contact_hours + r.section_a.total_client_related_hours;
    cumulativeSupervision += r.section_c.total_supervision_hours;

    const firstDate = r.section_a.entries[0]?.date ?? "";
    const name = firstDate || form.filename.replace(/\.[^.]+$/, "").slice(0, 15);

    return {
      name,
      "Actual supervision": parseFloat(cumulativeSupervision.toFixed(2)),
      "Advisory minimum": parseFloat(
        (cumulativePractice / LOGBOOK_CONSTANTS.SUPERVISION_RATIO).toFixed(2)
      ),
    };
  });

  return (
    <div className="card-panel p-5">
      <h3 className="font-semibold text-[var(--text)] mb-1">Supervision ratio over time</h3>
      <p className="text-xs text-[var(--text-light)] mb-4">
        Advisory guide: ~1:{LOGBOOK_CONSTANTS.SUPERVISION_RATIO} (December 2025 — no longer
        mandatory)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,79,52,0.1)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#624936" }} />
          <YAxis tick={{ fontSize: 11, fill: "#624936" }} />
          <Tooltip
            contentStyle={{
              background: "#fbf6ee",
              border: "1px solid rgba(112,79,52,0.24)",
              borderRadius: 8,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="Actual supervision"
            stroke={COLOURS.supervision}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Advisory minimum"
            stroke={COLOURS.pd}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Supervision type donut ───────────────────────────────────────────────────

function SupervisionTypeChart({ stats }: { stats: DashboardStats }) {
  const segments = [
    {
      name: "Principal individual",
      value: stats.principalIndividualHours,
      color: COLOURS.principalIndividual,
    },
    {
      name: "Secondary individual",
      value: Math.max(
        0,
        stats.totalSupervisionHours -
          stats.principalIndividualHours -
          stats.telephoneHours -
          stats.asyncHours
      ),
      color: COLOURS.secondaryIndividual,
    },
    { name: "Telephone", value: stats.telephoneHours, color: COLOURS.telephone },
    { name: "Asynchronous", value: stats.asyncHours, color: COLOURS.async },
  ].filter((s) => s.value > 0);

  if (segments.length === 0 || stats.totalSupervisionHours === 0) return null;

  return (
    <div className="card-panel p-5">
      <h3 className="font-semibold text-[var(--text)] mb-4">Supervision type breakdown</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
            >
              {segments.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => `${(+(v ?? 0)).toFixed(1)} hrs`}
              contentStyle={{
                background: "#fbf6ee",
                border: "1px solid rgba(112,79,52,0.24)",
                borderRadius: 8,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <ul className="space-y-2 text-sm">
          {segments.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-[var(--text-muted)]">
                {s.name}:{" "}
                <strong className="text-[var(--text)]">{s.value.toFixed(1)} hrs</strong>
              </span>
            </li>
          ))}
          <li className="text-xs text-[var(--text-light)] pt-1">
            Telephone cap: {LOGBOOK_CONSTANTS.MAX_TELEPHONE_SUPERVISION} hrs &middot; Async cap:{" "}
            {LOGBOOK_CONSTANTS.MAX_ASYNC_SUPERVISION} hrs
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function LogbookCharts({
  forms,
  stats,
}: {
  forms: ParsedForm[];
  stats: DashboardStats;
}) {
  return (
    <div className="space-y-6">
      <HoursBreakdownChart forms={forms} />
      <SupervisionRatioChart forms={forms} />
      <SupervisionTypeChart stats={stats} />
    </div>
  );
}
