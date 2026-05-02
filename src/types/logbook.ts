// ─── Raw parsed shapes returned by the server ────────────────────────────────

export interface SectionAEntry {
  date: string;
  client_contact_hours: number;
  client_related_hours: number;
  has_reflection: boolean;
  signed_off: boolean;
}

export interface SectionA {
  entries: SectionAEntry[];
  total_client_contact_hours: number;
  total_client_related_hours: number;
  unsigned_entries: number;
}

export interface SectionBEntry {
  date: string;
  activity_type: "Active" | "Passive";
  competency_area: string;
  hours: number;
  supervisor_initialled: boolean;
}

export interface SectionB {
  entries: SectionBEntry[];
  total_pd_hours: number;
  unsigned_entries: number;
}

export interface SectionCEntry {
  date: string;
  supervisor_name: string;
  supervisor_type: "Principal" | "Secondary";
  session_type: "Individual" | "Group";
  medium: "In-person" | "Video" | "Telephone" | "Asynchronous";
  duration_hours: number;
  has_summary: boolean;
}

export interface SectionC {
  entries: SectionCEntry[];
  total_supervision_hours: number;
  principal_individual_hours: number;
  telephone_hours: number;
  async_hours: number;
  short_session_count: number;
}

export interface SectionD {
  prov_signed: boolean;
  supervisor_signed: boolean;
}

export interface LBPP76ParsedResult {
  form_type: "LBPP-76";
  section_a: SectionA;
  section_b: SectionB;
  section_c: SectionC;
  section_d: SectionD;
}

export interface CHPS76ParsedResult {
  form_type: "CHPS-76";
  supervisor_name: string | null;
  period_start: string | null;
  period_end: string | null;
  total_practice_hours: number;
  total_supervision_hours: number;
  total_pd_hours: number;
  both_parties_signed: boolean;
}

export interface INPP76ParsedResult {
  form_type: "INPP-76";
  intern_name: string | null;
  registration_number: string | null;
  start_date: string | null;
  supervisor_name: string | null;
  supervisor_registration: string | null;
}

export interface PACF76ParsedResult {
  form_type: "PACF-76";
  assessment_date: string | null;
  supervisor_name: string | null;
  competencies_signed: boolean;
}

export type ParsedFormResult =
  | LBPP76ParsedResult
  | CHPS76ParsedResult
  | INPP76ParsedResult
  | PACF76ParsedResult;

// ─── Client-side state shape ──────────────────────────────────────────────────

/** A parsed form as stored in React state. */
export interface ParsedForm {
  /** Client-generated ID for state keying (crypto.randomUUID()). */
  id: string;
  filename: string;
  parsedAt: string; // ISO string
  result: ParsedFormResult;
}

// ─── Computed aggregate stats ─────────────────────────────────────────────────

export interface DashboardStats {
  totalPracticeHours: number;
  totalClientContactHours: number;
  totalClientRelatedHours: number;
  totalSupervisionHours: number;
  principalIndividualHours: number;
  telephoneHours: number;
  asyncHours: number;
  shortSessionCount: number;
  totalPdHours: number;
  /** Required supervision hours based on the advisory 1:18 ratio. */
  advisoryRequiredSupervisionHours: number;
  /** All unique supervisor names found across Section C entries. */
  supervisorNames: string[];
}

export interface DashboardWarning {
  id: string;
  level: "warn" | "info";
  message: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ParseApiResponse {
  success: true;
  result: ParsedFormResult;
}

export interface ParseApiError {
  success: false;
  error: string;
}

export interface CreditsApiResponse {
  credits: number;
}

export interface CheckoutApiResponse {
  url: string;
}
