"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { LOGBOOK_CONSTANTS } from "@/lib/logbook-constants";
import type {
  ParsedForm,
  ParsedFormResult,
  DashboardStats,
  DashboardWarning,
  LBPP76ParsedResult,
} from "@/types/logbook";

// ─── Stats computation ────────────────────────────────────────────────────────

function computeStats(forms: ParsedForm[]): DashboardStats {
  const lbppForms = forms
    .map((f) => f.result)
    .filter((r): r is LBPP76ParsedResult => r.form_type === "LBPP-76");

  let totalClientContactHours = 0;
  let totalClientRelatedHours = 0;
  let totalSupervisionHours = 0;
  let principalIndividualHours = 0;
  let telephoneHours = 0;
  let asyncHours = 0;
  let shortSessionCount = 0;
  let totalPdHours = 0;
  const supervisorSet = new Set<string>();

  for (const r of lbppForms) {
    totalClientContactHours += r.section_a.total_client_contact_hours;
    totalClientRelatedHours += r.section_a.total_client_related_hours;
    totalSupervisionHours += r.section_c.total_supervision_hours;
    principalIndividualHours += r.section_c.principal_individual_hours;
    telephoneHours += r.section_c.telephone_hours;
    asyncHours += r.section_c.async_hours;
    shortSessionCount += r.section_c.short_session_count;
    totalPdHours += r.section_b.total_pd_hours;
    for (const entry of r.section_c.entries) {
      if (entry.supervisor_name) supervisorSet.add(entry.supervisor_name);
    }
  }

  const totalPracticeHours = totalClientContactHours + totalClientRelatedHours;
  const advisoryRequiredSupervisionHours =
    totalPracticeHours / LOGBOOK_CONSTANTS.SUPERVISION_RATIO;

  return {
    totalPracticeHours,
    totalClientContactHours,
    totalClientRelatedHours,
    totalSupervisionHours,
    principalIndividualHours,
    telephoneHours,
    asyncHours,
    shortSessionCount,
    totalPdHours,
    advisoryRequiredSupervisionHours,
    supervisorNames: Array.from(supervisorSet),
  };
}

function computeWarnings(
  forms: ParsedForm[],
  stats: DashboardStats
): DashboardWarning[] {
  const warnings: DashboardWarning[] = [];

  if (stats.telephoneHours >= LOGBOOK_CONSTANTS.MAX_TELEPHONE_SUPERVISION) {
    warnings.push({
      id: "tel-cap",
      level: "warn",
      message: `Telephone supervision is ${stats.telephoneHours.toFixed(1)} hrs — at or above the ${LOGBOOK_CONSTANTS.MAX_TELEPHONE_SUPERVISION} hr cap.`,
    });
  } else if (stats.telephoneHours >= LOGBOOK_CONSTANTS.MAX_TELEPHONE_SUPERVISION * 0.8) {
    warnings.push({
      id: "tel-approaching",
      level: "warn",
      message: `Telephone supervision is ${stats.telephoneHours.toFixed(1)} hrs — approaching the ${LOGBOOK_CONSTANTS.MAX_TELEPHONE_SUPERVISION} hr cap.`,
    });
  }

  if (stats.asyncHours >= LOGBOOK_CONSTANTS.MAX_ASYNC_SUPERVISION) {
    warnings.push({
      id: "async-cap",
      level: "warn",
      message: `Asynchronous supervision is ${stats.asyncHours.toFixed(1)} hrs — at or above the ${LOGBOOK_CONSTANTS.MAX_ASYNC_SUPERVISION} hr cap.`,
    });
  } else if (stats.asyncHours >= LOGBOOK_CONSTANTS.MAX_ASYNC_SUPERVISION * 0.8) {
    warnings.push({
      id: "async-approaching",
      level: "warn",
      message: `Asynchronous supervision is ${stats.asyncHours.toFixed(1)} hrs — approaching the ${LOGBOOK_CONSTANTS.MAX_ASYNC_SUPERVISION} hr cap.`,
    });
  }

  if (stats.shortSessionCount >= LOGBOOK_CONSTANTS.MAX_SHORT_SESSIONS) {
    warnings.push({
      id: "short-sessions",
      level: "warn",
      message: `${stats.shortSessionCount} short supervision sessions (under 1 hour) detected — at or above the ${LOGBOOK_CONSTANTS.MAX_SHORT_SESSIONS} session cap.`,
    });
  } else if (stats.shortSessionCount >= LOGBOOK_CONSTANTS.MAX_SHORT_SESSIONS * 0.8) {
    warnings.push({
      id: "short-sessions-approaching",
      level: "warn",
      message: `${stats.shortSessionCount} short supervision sessions (under 1 hour) — approaching the ${LOGBOOK_CONSTANTS.MAX_SHORT_SESSIONS} session cap.`,
    });
  }

  // Check for unsigned entries
  for (const form of forms) {
    const r = form.result;
    if (r.form_type === "LBPP-76") {
      if (r.section_a.unsigned_entries > 0) {
        warnings.push({
          id: `unsigned-a-${form.id}`,
          level: "warn",
          message: `${r.section_a.unsigned_entries} unsigned entries in Section A of "${form.filename}".`,
        });
      }
      if (r.section_b.unsigned_entries > 0) {
        warnings.push({
          id: `unsigned-b-${form.id}`,
          level: "warn",
          message: `${r.section_b.unsigned_entries} unsigned entries in Section B of "${form.filename}".`,
        });
      }
      if (!r.section_d.prov_signed || !r.section_d.supervisor_signed) {
        warnings.push({
          id: `section-d-${form.id}`,
          level: "warn",
          message: `Section D of "${form.filename}" appears unsigned.`,
        });
      }
      const noReflection = r.section_a.entries.filter((e) => !e.has_reflection).length;
      if (noReflection > 0) {
        warnings.push({
          id: `no-reflection-${form.id}`,
          level: "info",
          message: `${noReflection} Section A entries in "${form.filename}" have no reflection text.`,
        });
      }
    }
    if (r.form_type === "CHPS-76" && !r.both_parties_signed) {
      warnings.push({
        id: `chps-unsigned-${form.id}`,
        level: "warn",
        message: `CHPS-76 "${form.filename}" does not appear to be signed by both parties.`,
      });
    }
  }

  // Multiple supervisors but no CHPS-76
  const hasChps = forms.some((f) => f.result.form_type === "CHPS-76");
  if (!hasChps && stats.supervisorNames.length > 1) {
    warnings.push({
      id: "no-chps",
      level: "info",
      message: `Multiple supervisors detected (${stats.supervisorNames.length}) but no CHPS-76 change-of-supervisor form uploaded.`,
    });
  }

  // Advisory supervision ratio
  if (
    stats.totalPracticeHours > 0 &&
    stats.totalSupervisionHours < stats.advisoryRequiredSupervisionHours
  ) {
    warnings.push({
      id: "ratio-advisory",
      level: "info",
      message: `Advisory supervision ratio: ${stats.totalSupervisionHours.toFixed(1)} hrs supervision vs ${stats.advisoryRequiredSupervisionHours.toFixed(1)} hrs suggested (1:${LOGBOOK_CONSTANTS.SUPERVISION_RATIO}, December 2025 guidelines — advisory only).`,
    });
  }

  return warnings;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  target,
  unit = "hrs",
  infoOnly = false,
}: {
  label: string;
  value: number;
  target?: number;
  unit?: string;
  infoOnly?: boolean;
}) {
  const percent = target ? Math.min((value / target) * 100, 100) : 100;
  let colorClass = "text-green-700 bg-green-50 border-green-200";
  if (!infoOnly && target) {
    const ratio = value / target;
    if (ratio < 0.9) colorClass = "text-red-700 bg-red-50 border-red-200";
    else if (ratio < 1) colorClass = "text-amber-700 bg-amber-50 border-amber-200";
  }

  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-bold">
        {value.toFixed(1)}
        <span className="text-sm font-normal ml-1">{unit}</span>
      </p>
      {target && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>
              {value.toFixed(1)} / {target}
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/10">
            <div
              className="h-2 rounded-full bg-current transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload panel ─────────────────────────────────────────────────────────────

function UploadPanel({
  credits,
  onUploaded,
  onCreditsChange,
}: {
  credits: number;
  onUploaded: (form: ParsedForm) => void;
  onCreditsChange: (n: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const confirmed = window.confirm(
        `This will use 1 parse credit ($2.00 value).\n\nFile: ${file.name}\n\nContinue?`
      );
      if (!confirmed) return;

      setLoading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/logbook/parse", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `Server error ${res.status}`);
        }
        const json = (await res.json()) as { success: true; result: ParsedFormResult };
        const parsed: ParsedForm = {
          id: crypto.randomUUID(),
          filename: file.name,
          parsedAt: new Date().toISOString(),
          result: json.result,
        };
        onUploaded(parsed);
        onCreditsChange(credits - 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setLoading(false);
      }
    },
    [credits, onUploaded, onCreditsChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (credits < 1) {
    return (
      <div className="card-panel p-6 text-center">
        <p className="text-[var(--text-muted)] mb-4">
          You have no parse credits remaining. Purchase credits to upload your next form.
        </p>
        <button
          onClick={() => handleBuyCredits(1)}
          className="btn-primary px-6 py-2 rounded-lg text-sm font-semibold"
        >
          Buy parse credits
        </button>
      </div>
    );
  }

  return (
    <div className="card-panel p-6">
      <h2 className="font-semibold text-[var(--text)] mb-4">Upload logbook file</h2>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[var(--primary)] bg-[var(--surface)]"
            : "border-[var(--border-strong)] hover:border-[var(--primary)]"
        }`}
      >
        <p className="text-2xl mb-2">📂</p>
        <p className="text-sm font-medium text-[var(--text)]">
          {loading ? "Parsing…" : "Drop file here or click to browse"}
        </p>
        <p className="text-xs text-[var(--text-light)] mt-1">
          XLSX or PDF · max 20 MB · 1 credit per upload
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          disabled={loading}
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ─── Buy credits helper (outside component so it's not a hook) ────────────────

async function handleBuyCredits(quantity: 1 | 3 | 5) {
  const res = await fetch("/api/logbook/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    alert("Could not start checkout. Please try again.");
    return;
  }
  const { url } = (await res.json()) as { url?: string };
  if (url) window.location.href = url;
}

// ─── Warnings panel ───────────────────────────────────────────────────────────

function WarningsPanel({ warnings }: { warnings: DashboardWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-[var(--text)]">Warnings & notes</h2>
      {warnings.map((w) => (
        <div
          key={w.id}
          className={`rounded-xl border p-4 text-sm flex gap-3 items-start ${
            w.level === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span className="flex-shrink-0 mt-0.5">{w.level === "warn" ? "⚠" : "ℹ"}</span>
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Parsed forms list ────────────────────────────────────────────────────────

function formTypeBadge(type: string) {
  const colours: Record<string, string> = {
    "LBPP-76": "bg-[var(--primary)] text-white",
    "CHPS-76": "bg-purple-600 text-white",
    "INPP-76": "bg-blue-600 text-white",
    "PACF-76": "bg-green-700 text-white",
  };
  return colours[type] ?? "bg-gray-500 text-white";
}

function formSummary(result: ParsedFormResult): string {
  switch (result.form_type) {
    case "LBPP-76":
      return `${(result.section_a.total_client_contact_hours + result.section_a.total_client_related_hours).toFixed(1)} practice hrs · ${result.section_c.total_supervision_hours.toFixed(1)} supervision hrs`;
    case "CHPS-76":
      return `${result.total_practice_hours.toFixed(1)} practice hrs · Period: ${result.period_start ?? "?"} – ${result.period_end ?? "?"}`;
    case "INPP-76":
      return `Intern: ${result.intern_name ?? "unknown"} · Start: ${result.start_date ?? "?"}`;
    case "PACF-76":
      return `Assessment: ${result.assessment_date ?? "?"} · Competencies signed: ${result.competencies_signed ? "Yes" : "No"}`;
  }
}

function ParsedFormsList({
  forms,
  onRemove,
}: {
  forms: ParsedForm[];
  onRemove: (id: string) => void;
}) {
  if (forms.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-[var(--text)]">Uploaded forms</h2>
      {forms.map((form) => (
        <div
          key={form.id}
          className="card-panel p-4 flex items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${formTypeBadge(form.result.form_type)}`}
              >
                {form.result.form_type}
              </span>
              <span className="text-sm font-medium text-[var(--text)] truncate">
                {form.filename}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{formSummary(form.result)}</p>
            <p className="text-xs text-[var(--text-light)] mt-0.5">
              Parsed {new Date(form.parsedAt).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`Remove "${form.filename}" from your dashboard?`)) {
                onRemove(form.id);
              }
            }}
            className="flex-shrink-0 text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Charts (lazy-loaded) ─────────────────────────────────────────────────────

const LazyCharts = React.lazy(() =>
  import("./logbook-charts").then((m) => ({ default: m.LogbookCharts }))
);

// ─── Download summary ─────────────────────────────────────────────────────────

async function downloadSummary(stats: DashboardStats, warnings: DashboardWarning[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const W = 210;
  const margin = 20;
  let y = 20;

  const line = (text: string, size = 10, style: "normal" | "bold" = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.text(text, margin, y);
    y += size * 0.45 + 2;
  };

  const divider = () => {
    y += 2;
    doc.setDrawColor(180, 160, 140);
    doc.line(margin, y, W - margin, y);
    y += 5;
  };

  // Header
  line("PsychVault Logbook Summary", 16, "bold");
  line(`Generated: ${today}`, 9);
  line("NOT AN OFFICIAL AHPRA DOCUMENT", 9, "bold");
  divider();

  // Stats
  line("Hours Summary", 12, "bold");
  y += 2;

  const rows: [string, string, string][] = [
    ["Total practice hours", `${stats.totalPracticeHours.toFixed(1)} hrs`, "/ 1,500 target"],
    ["  Client contact", `${stats.totalClientContactHours.toFixed(1)} hrs`, ""],
    ["  Client-related activity", `${stats.totalClientRelatedHours.toFixed(1)} hrs`, ""],
    [
      "Total supervision hours",
      `${stats.totalSupervisionHours.toFixed(1)} hrs`,
      "/ 80 required",
    ],
    [
      "Principal supervisor (individual)",
      `${stats.principalIndividualHours.toFixed(1)} hrs`,
      "/ 50 required",
    ],
    [
      "Advisory supervision ratio",
      `${stats.advisoryRequiredSupervisionHours.toFixed(1)} hrs suggested`,
      `(1:${LOGBOOK_CONSTANTS.SUPERVISION_RATIO}, advisory)`,
    ],
    ["PD / education hours", `${stats.totalPdHours.toFixed(1)} hrs`, ""],
  ];

  for (const [label, value, note] of rows) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin, y);
    doc.text(value, margin + 95, y);
    if (note) {
      doc.setFontSize(8);
      doc.text(note, margin + 135, y);
    }
    y += 7;
  }

  divider();

  // Warnings
  if (warnings.length > 0) {
    line("Warnings & Notes", 12, "bold");
    y += 2;
    for (const w of warnings) {
      const prefix = w.level === "warn" ? "! " : "i ";
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(`${prefix}${w.message}`, W - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 2;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
    divider();
  }

  // Disclaimer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    [
      "This summary is for personal progress tracking only. It is not an official AHPRA document and",
      "does not constitute registration advice. Verify all requirements directly with the Psychology",
      "Board of Australia. Not affiliated with or endorsed by AHPRA.",
    ],
    margin,
    y
  );

  doc.save(`psychvault-logbook-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Credit purchase panel ────────────────────────────────────────────────────

function BuyCreditsPanel() {
  const [loading, setLoading] = useState<number | null>(null);

  const buy = async (qty: 1 | 3 | 5) => {
    setLoading(qty);
    await handleBuyCredits(qty);
    setLoading(null);
  };

  return (
    <div className="card-panel p-6">
      <h2 className="font-semibold text-[var(--text)] mb-4">Buy parse credits</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {(
          [
            { qty: 1, price: "$2", label: "1 credit" },
            { qty: 3, price: "$6", label: "3 credits" },
            { qty: 5, price: "$10", label: "5 credits" },
          ] as { qty: 1 | 3 | 5; price: string; label: string }[]
        ).map((opt) => (
          <button
            key={opt.qty}
            onClick={() => buy(opt.qty)}
            disabled={loading !== null}
            className="btn-secondary py-3 rounded-lg text-sm font-semibold flex flex-col items-center gap-0.5 disabled:opacity-50"
          >
            <span className="text-lg font-bold">{opt.price}</span>
            <span>{opt.label}</span>
            {loading === opt.qty && <span className="text-xs">Redirecting…</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function LogbookDashboardClient({
  initialCredits,
}: {
  initialCredits: number;
}) {
  const [forms, setForms] = useState<ParsedForm[]>([]);
  const [credits, setCredits] = useState(initialCredits);

  const handleUploaded = useCallback((form: ParsedForm) => {
    setForms((prev) => [...prev, form]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setForms((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const stats = computeStats(forms);
  const warnings = computeWarnings(forms, stats);
  const hasForms = forms.length > 0;

  return (
    <div className="app-main">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {/* Privacy banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start text-sm text-blue-900">
          <span className="flex-shrink-0 mt-0.5 text-base">🔒</span>
          <div>
            <strong>Your data is never saved to PsychVault servers.</strong> This dashboard clears
            when you leave this page. Download your summary before you go.
          </div>
        </div>

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="text-xs text-[var(--text-light)] mb-1">
              <Link href="/logbook" className="hover:underline">
                Logbook
              </Link>{" "}
              / Dashboard
            </nav>
            <h1 className="text-2xl font-bold text-[var(--text)]">Logbook Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              <strong className="text-[var(--text)]">{credits}</strong>{" "}
              {credits === 1 ? "parse" : "parses"} remaining
            </span>
            {hasForms && (
              <button
                onClick={() => downloadSummary(stats, warnings)}
                className="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Download summary
              </button>
            )}
          </div>
        </div>

        {/* Upload panel */}
        <UploadPanel
          credits={credits}
          onUploaded={handleUploaded}
          onCreditsChange={setCredits}
        />

        {/* Buy credits */}
        <BuyCreditsPanel />

        {/* Stats — shown after first parse */}
        {hasForms && (
          <>
            <div>
              <h2 className="font-semibold text-[var(--text)] mb-4">Hours progress</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Total practice hours"
                  value={stats.totalPracticeHours}
                  target={LOGBOOK_CONSTANTS.TOTAL_INTERNSHIP_HOURS_TARGET}
                />
                <StatCard
                  label="Total supervision hours"
                  value={stats.totalSupervisionHours}
                  target={LOGBOOK_CONSTANTS.TOTAL_SUPERVISION_HOURS_REQUIRED}
                />
                <StatCard
                  label="Principal supervisor (individual)"
                  value={stats.principalIndividualHours}
                  target={LOGBOOK_CONSTANTS.PRINCIPAL_SUPERVISOR_DIRECT_HOURS_REQUIRED}
                />
                <StatCard
                  label="Advisory supervision ratio"
                  value={stats.totalSupervisionHours}
                  target={parseFloat(stats.advisoryRequiredSupervisionHours.toFixed(1))}
                />
                <StatCard
                  label="PD / education hours"
                  value={stats.totalPdHours}
                  infoOnly
                />
                <StatCard
                  label="Client contact hours"
                  value={stats.totalClientContactHours}
                  target={LOGBOOK_CONSTANTS.DIRECT_CLIENT_CONTACT_HOURS_REQUIRED}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--text-light)]">
                Advisory supervision ratio is ~1:{LOGBOOK_CONSTANTS.SUPERVISION_RATIO} per December
                2025 guidelines (no longer mandatory — shown as guidance only).
              </p>
            </div>

            {/* Warnings */}
            <WarningsPanel warnings={warnings} />

            {/* Charts */}
            <React.Suspense
              fallback={
                <div className="card-panel p-8 text-center text-[var(--text-muted)] text-sm">
                  Loading charts…
                </div>
              }
            >
              <LazyCharts forms={forms} stats={stats} />
            </React.Suspense>
          </>
        )}

        {/* Parsed forms list */}
        <ParsedFormsList forms={forms} onRemove={handleRemove} />

        {!hasForms && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-medium text-[var(--text)]">No forms uploaded yet</p>
            <p className="text-sm mt-1">
              Upload your LBPP-76 logbook above to see your hours breakdown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
