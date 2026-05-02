import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ParsedFormResult } from "@/types/logbook";

// ─── XLSX parsing ─────────────────────────────────────────────────────────────

async function parseXlsxBuffer(
  buffer: Buffer
): Promise<LBPP76ParseResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  function findSheet(patterns: RegExp[]) {
    for (const name of workbook.SheetNames) {
      for (const pattern of patterns) {
        if (pattern.test(name)) return workbook.Sheets[name];
      }
    }
    return null;
  }

  function sheetToRows(sheet: ReturnType<typeof workbook.Sheets[string]> | null): unknown[][] {
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as unknown[][];
  }

  function toNum(v: unknown): number {
    const n = Number(v);
    return isFinite(n) ? Math.max(0, n) : 0;
  }

  function toBool(v: unknown): boolean {
    if (v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    return s === "yes" || s === "true" || s === "1" || s === "x" || s === "✓";
  }

  function toStr(v: unknown): string {
    return v == null ? "" : String(v).trim();
  }

  // Skip rows until we find one that looks like it has date content.
  function skipHeaderRows(rows: unknown[][], dateColIdx: number): unknown[][] {
    return rows.filter((row) => {
      const cell = row[dateColIdx];
      if (cell == null) return false;
      const s = String(cell).toLowerCase();
      return (
        s !== "" &&
        !/date|day|week|period|section|record|name|supervisor|log|practice|professional/.test(s)
      );
    });
  }

  // ── Section A ──────────────────────────────────────────────────────────────
  const sheetA = findSheet([/section\s*a/i, /\bweekly\b/i, /^a$/i, /^a\s*-/i]);
  const rowsA = sheetToRows(sheetA);
  const dataA = skipHeaderRows(rowsA, 0);

  const sectionAEntries: LBPP76ParseResult["section_a"]["entries"] = [];
  let totalContactHours = 0;
  let totalRelatedHours = 0;
  let unsignedA = 0;

  for (const row of dataA) {
    const date = toStr(row[0]);
    const contactHrs = toNum(row[1]);
    const relatedHrs = toNum(row[2]);
    const reflection = toStr(row[3]);
    const signedOff = toBool(row[4]);

    if (!date && contactHrs === 0 && relatedHrs === 0) continue;

    const hasReflection = reflection.length > 0;
    if (!signedOff) unsignedA++;

    totalContactHours += contactHrs;
    totalRelatedHours += relatedHrs;

    sectionAEntries.push({
      date,
      client_contact_hours: contactHrs,
      client_related_hours: relatedHrs,
      has_reflection: hasReflection,
      signed_off: signedOff,
    });
  }

  // ── Section B ──────────────────────────────────────────────────────────────
  const sheetB = findSheet([/section\s*b/i, /professional\s*dev/i, /^b$/i, /^b\s*-/i]);
  const rowsB = sheetToRows(sheetB);
  const dataB = skipHeaderRows(rowsB, 0);

  const sectionBEntries: LBPP76ParseResult["section_b"]["entries"] = [];
  let totalPdHours = 0;
  let unsignedB = 0;

  for (const row of dataB) {
    const date = toStr(row[0]);
    const activityType = toStr(row[1]);
    const competencyArea = toStr(row[2]);
    const hours = toNum(row[3]);
    const initialled = toBool(row[4]);

    if (!date && hours === 0) continue;

    const type: "Active" | "Passive" =
      activityType.toLowerCase().startsWith("active") ? "Active" : "Passive";

    if (!initialled) unsignedB++;
    totalPdHours += hours;

    sectionBEntries.push({
      date,
      activity_type: type,
      competency_area: competencyArea,
      hours,
      supervisor_initialled: initialled,
    });
  }

  // ── Section C ──────────────────────────────────────────────────────────────
  const sheetC = findSheet([/section\s*c/i, /supervision/i, /^c$/i, /^c\s*-/i]);
  const rowsC = sheetToRows(sheetC);
  const dataC = skipHeaderRows(rowsC, 0);

  const sectionCEntries: LBPP76ParseResult["section_c"]["entries"] = [];
  let totalSupervision = 0;
  let principalIndividual = 0;
  let telephoneHrs = 0;
  let asyncHrs = 0;
  let shortSessionCount = 0;

  for (const row of dataC) {
    const date = toStr(row[0]);
    const supervisorName = toStr(row[1]);
    const supervisorTypeRaw = toStr(row[2]);
    const summary = toStr(row[3]);
    const durationHrs = toNum(row[4]);
    const mediumRaw = toStr(row[5]);

    if (!date && durationHrs === 0) continue;

    const supervisorType: "Principal" | "Secondary" =
      supervisorTypeRaw.toLowerCase().includes("secondary") ? "Secondary" : "Principal";
    const sessionType: "Individual" | "Group" = supervisorTypeRaw
      .toLowerCase()
      .includes("group")
      ? "Group"
      : "Individual";

    let medium: "In-person" | "Video" | "Telephone" | "Asynchronous" = "In-person";
    const ml = mediumRaw.toLowerCase();
    if (ml.includes("phone") || ml.includes("teleph")) medium = "Telephone";
    else if (ml.includes("async") || ml.includes("written")) medium = "Asynchronous";
    else if (ml.includes("video") || ml.includes("zoom") || ml.includes("teams"))
      medium = "Video";

    totalSupervision += durationHrs;
    if (supervisorType === "Principal" && sessionType === "Individual")
      principalIndividual += durationHrs;
    if (medium === "Telephone") telephoneHrs += durationHrs;
    if (medium === "Asynchronous") asyncHrs += durationHrs;
    if (durationHrs > 0 && durationHrs < 1) shortSessionCount++;

    sectionCEntries.push({
      date,
      supervisor_name: supervisorName,
      supervisor_type: supervisorType,
      session_type: sessionType,
      medium,
      duration_hours: durationHrs,
      has_summary: summary.length > 0,
    });
  }

  // ── Section D ──────────────────────────────────────────────────────────────
  const sheetD = findSheet([/section\s*d/i, /signature/i, /^d$/i, /^d\s*-/i]);
  const rowsD = sheetToRows(sheetD);
  let provSigned = false;
  let supervisorSigned = false;
  for (const row of rowsD) {
    for (const cell of row) {
      const s = toStr(cell).toLowerCase();
      if (s.includes("prov") && toBool(cell)) provSigned = true;
      if (s.includes("supervisor") && toBool(cell)) supervisorSigned = true;
    }
    // If Section D has any content treat it as signed (presence-based check).
    if (rowsD.length > 1) {
      provSigned = true;
      supervisorSigned = true;
    }
  }

  return {
    form_type: "LBPP-76" as const,
    section_a: {
      entries: sectionAEntries,
      total_client_contact_hours: totalContactHours,
      total_client_related_hours: totalRelatedHours,
      unsigned_entries: unsignedA,
    },
    section_b: {
      entries: sectionBEntries,
      total_pd_hours: totalPdHours,
      unsigned_entries: unsignedB,
    },
    section_c: {
      entries: sectionCEntries,
      total_supervision_hours: totalSupervision,
      principal_individual_hours: principalIndividual,
      telephone_hours: telephoneHrs,
      async_hours: asyncHrs,
      short_session_count: shortSessionCount,
    },
    section_d: {
      prov_signed: provSigned,
      supervisor_signed: supervisorSigned,
    },
  };
}

type LBPP76ParseResult = Extract<ParsedFormResult, { form_type: "LBPP-76" }>;

// ─── PDF text-extraction parsing (no external API) ───────────────────────────

/** Scan text for the first number following any of the given regex patterns. */
function extractNumber(text: string, patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1] !== undefined) {
      const n = parseFloat(m[1]);
      if (isFinite(n)) return Math.max(0, n);
    }
  }
  return 0;
}

function detectPdfFormType(
  text: string
): ParsedFormResult["form_type"] {
  if (/CHPS[-\s]?76/i.test(text)) return "CHPS-76";
  if (/INPP[-\s]?76/i.test(text)) return "INPP-76";
  if (/PACF[-\s]?76/i.test(text)) return "PACF-76";
  return "LBPP-76";
}

async function parsePdfWithTextExtraction(
  buffer: Buffer
): Promise<ParsedFormResult> {
  // pdf-parse is listed in serverExternalPackages in next.config.ts so Turbopack
  // does not attempt to bundle it — the normal require works fine server-side.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    b: Buffer
  ) => Promise<{ text: string }>;

  let text: string;
  try {
    const result = await pdfParse(buffer);
    text = result.text;
  } catch (err) {
    throw new Error(
      `Could not read PDF text: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!text || text.trim().length < 20) {
    throw new Error(
      "PDF appears to be a scanned image or contains no extractable text. Please use the XLSX export instead."
    );
  }

  const formType = detectPdfFormType(text);

  if (formType === "LBPP-76") {
    const clientContact = extractNumber(text, [
      /total\s+client\s+contact\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /client\s+contact\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const clientRelated = extractNumber(text, [
      /total\s+client[-\s]related\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /client[-\s]related\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const totalSupervision = extractNumber(text, [
      /total\s+supervision\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /supervision\s+hours\s+total[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const principalIndividual = extractNumber(text, [
      /principal\s+supervisor\s+individual[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /individual\s+(?:supervision\s+)?hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const telephoneHours = extractNumber(text, [
      /telephone\s+supervision[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /telephone\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const asyncHours = extractNumber(text, [
      /asynchronous\s+supervision[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /async(?:hronous)?\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const pdHours = extractNumber(text, [
      /total\s+(?:professional\s+development|pd)\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      /(?:pd|professional\s+development)\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
    ]);
    const provSigned = /provisional\s+psychologist[^.]*signed/i.test(text);
    const supervisorSigned = /supervisor[^.]*signed/i.test(text);

    return {
      form_type: "LBPP-76",
      section_a: {
        entries: [],
        total_client_contact_hours: clientContact,
        total_client_related_hours: clientRelated,
        unsigned_entries: 0,
      },
      section_b: {
        entries: [],
        total_pd_hours: pdHours,
        unsigned_entries: 0,
      },
      section_c: {
        entries: [],
        total_supervision_hours: totalSupervision,
        principal_individual_hours: principalIndividual,
        telephone_hours: telephoneHours,
        async_hours: asyncHours,
        short_session_count: 0,
      },
      section_d: {
        prov_signed: provSigned,
        supervisor_signed: supervisorSigned,
      },
    };
  }

  if (formType === "CHPS-76") {
    const supervisorMatch = text.match(
      /supervisor[^:\n]*:\s*([A-Za-z\s]+?)(?:\n|$)/i
    );
    return {
      form_type: "CHPS-76",
      supervisor_name: supervisorMatch?.[1]?.trim() ?? null,
      period_start: null,
      period_end: null,
      total_practice_hours: extractNumber(text, [
        /total\s+practice\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      ]),
      total_supervision_hours: extractNumber(text, [
        /total\s+supervision\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      ]),
      total_pd_hours: extractNumber(text, [
        /total\s+(?:pd|professional\s+development)\s+hours[^0-9\n]*(\d+(?:\.\d+)?)/i,
      ]),
      both_parties_signed: /signed/i.test(text),
    };
  }

  if (formType === "INPP-76") {
    return {
      form_type: "INPP-76",
      intern_name: null,
      registration_number: null,
      start_date: null,
      supervisor_name: null,
      supervisor_registration: null,
    };
  }

  // PACF-76
  return {
    form_type: "PACF-76",
    assessment_date: null,
    supervisor_name: null,
    competencies_signed: /signed/i.test(text),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = session.user.id;

  // Check credit balance (atomic read-then-decrement below)
  const creditRecord = await db.parseCredit.findUnique({
    where: { userId },
    select: { credits: true },
  });

  if (!creditRecord || creditRecord.credits < 1) {
    return NextResponse.json(
      { error: "No parse credits remaining. Purchase credits to continue." },
      { status: 402 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const filename = fileEntry.name;
  const mimeType = fileEntry.type;
  const sizeBytes = fileEntry.size;

  if (sizeBytes > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 20 MB limit." }, { status: 413 });
  }

  const isXlsx =
    filename.toLowerCase().endsWith(".xlsx") ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const isPdf =
    filename.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf";

  if (!isXlsx && !isPdf) {
    return NextResponse.json(
      { error: "Only PDF and XLSX files are supported." },
      { status: 415 }
    );
  }

  // Decrement credit atomically — use a transaction so we don't decrement if the
  // parse throws.
  let parsedResult: ParsedFormResult;
  let detectedFormType: string;

  try {
    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isXlsx) {
      parsedResult = await parseXlsxBuffer(buffer);
    } else {
      parsedResult = await parsePdfWithTextExtraction(buffer);
    }

    detectedFormType = parsedResult.form_type;
  } catch (err) {
    logger.error("[logbook/parse] Parse failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Parse failed: ${err.message}`
            : "Parse failed. Please check the file and try again.",
      },
      { status: 422 }
    );
  }

  // Commit: decrement credit + write receipt in one transaction.
  try {
    await db.$transaction([
      db.parseCredit.update({
        where: { userId },
        data: { credits: { decrement: 1 } },
      }),
      db.parseReceipt.create({
        data: { userId, formType: detectedFormType },
      }),
    ]);
  } catch (err) {
    logger.error("[logbook/parse] Failed to commit credit decrement", err);
    return NextResponse.json(
      { error: "Could not confirm parse. Credit was not charged. Please try again." },
      { status: 500 }
    );
  }

  // File is in memory only. Nothing is persisted beyond the receipt above.
  return NextResponse.json({ success: true, result: parsedResult });
}
