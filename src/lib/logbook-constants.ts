/**
 * AHPRA 5+1 internship hour requirements.
 *
 * Sources:
 *   - LBPP-76 Practical Guide (PsychVault internal document)
 *   - Psychology Board of Australia — 5+1 Internship Program guidelines
 *     https://www.psychologyboard.gov.au/Registration/Provisional/5-1-Internship-Program.aspx
 *
 * IMPORTANT: The supervision ratio changed under the December 2025 guidelines.
 * Previously 1 hour per 17 hours of practice (mandatory). Now ~1 hour per 18
 * hours of practice (advisory guide). The mandatory ratio has been removed.
 * The ratio check in this tool is therefore shown as a WARNING, not an error.
 */

export const LOGBOOK_CONSTANTS = {
  /** Total internship hours target (practice + supervision + PD). */
  TOTAL_INTERNSHIP_HOURS_TARGET: 1500,

  /** Minimum supervised psychological practice hours (subset of total). */
  SUPERVISED_PRACTICE_HOURS_REQUIRED: 1360,

  /** Minimum direct client contact hours. */
  DIRECT_CLIENT_CONTACT_HOURS_REQUIRED: 500,

  /** Minimum total supervision hours. */
  TOTAL_SUPERVISION_HOURS_REQUIRED: 80,

  /** Minimum individual supervision hours with principal supervisor. */
  PRINCIPAL_SUPERVISOR_DIRECT_HOURS_REQUIRED: 50,

  /** Minimum professional development / education & training hours. */
  PD_HOURS_REQUIRED: 60,

  /**
   * Advisory supervision ratio: approximately 1 hour of supervision per 18
   * hours of practice (December 2025 guidelines). No longer mandatory —
   * shown as an advisory warning if not met.
   */
  SUPERVISION_RATIO: 18,

  /** Maximum telephone supervision hours before a warning is triggered. */
  MAX_TELEPHONE_SUPERVISION: 20,

  /** Maximum asynchronous supervision hours before a warning is triggered. */
  MAX_ASYNC_SUPERVISION: 10,

  /** Maximum short-session count (sessions under 1 hour) before a warning. */
  MAX_SHORT_SESSIONS: 10,
} as const;

export type LogbookConstants = typeof LOGBOOK_CONSTANTS;
