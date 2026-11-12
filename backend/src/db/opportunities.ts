/**
 * Shared database helpers for opportunities.
 * - OPP_COLUMNS: the columns every opportunity query selects
 * - OPEN_SQL:    the rule for "still open" (active and closing date not passed)
 * - toOpportunity(): turns a database row into the JSON the app receives
 */
import { query } from './pool';
import { matchOpportunity, Profile } from '../matching';
import { daysUntil, fieldName, levelName, todaySA, typeName } from '../utils/validate';

export type { Profile };

/** One row from the opportunities table. */
export interface OppRow {
  id: string;
  title: string;
  type: string;
  organisation: string;
  description: string;
  field: string;
  province: string;
  min_level: number;
  stipend: string | null;
  closing_date: string; // YYYY-MM-DD
  apply_method: 'link' | 'form';
  apply_url: string | null;
  status: 'active' | 'expired';
  created_at: string;
  updated_at: string;
}

export const OPP_COLUMNS = `
  id, title, type, organisation, description, field, province, min_level, stipend,
  to_char(closing_date, 'YYYY-MM-DD') AS closing_date, apply_method, apply_url, status, created_at, updated_at`;

/** An opportunity is open when it is active and today is on or before its closing date (SA time). */
export const OPEN_SQL = `status = 'active' AND closing_date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date`;

export function isOpen(row: OppRow): boolean {
  return row.status === 'active' && row.closing_date >= todaySA();
}

/** What one youth user has saved, set reminders for, and applied to. */
export interface UserState {
  savedIds: Set<string>;
  alertDays: Map<string, number>;
  appliedIds: Set<string>;
}

export async function getUserState(userId: string): Promise<UserState> {
  const saved = await query<{ opportunity_id: string }>('SELECT opportunity_id FROM saved_opportunities WHERE user_id = $1', [userId]);
  const alerts = await query<{ opportunity_id: string; days_before: number }>('SELECT opportunity_id, days_before FROM alerts WHERE user_id = $1', [userId]);
  const applied = await query<{ opportunity_id: string }>(`SELECT opportunity_id FROM applications WHERE user_id = $1`, [userId]);
  return {
    savedIds: new Set(saved.rows.map((r) => r.opportunity_id)),
    alertDays: new Map(alerts.rows.map((r) => [r.opportunity_id, r.days_before])),
    appliedIds: new Set(applied.rows.map((r) => r.opportunity_id)),
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { rows } = await query<Profile>('SELECT field, province, level, phone FROM profiles WHERE user_id = $1', [userId]);
  return rows[0] ?? null;
}

export async function findOpportunity(id: string): Promise<OppRow | undefined> {
  const { rows } = await query<OppRow>(`SELECT ${OPP_COLUMNS} FROM opportunities WHERE id = $1`, [id]);
  return rows[0];
}

/**
 * Builds the JSON for one opportunity.
 * If a profile is given, adds `match` (score + reasons). If a user state is given, adds saved/alert/applied.
 */
export function toOpportunity(row: OppRow, profile: Profile | null = null, state: UserState | null = null) {
  return {
    id: row.id,
    title: row.title,
    type: { slug: row.type, name: typeName(row.type) },
    organisation: row.organisation,
    description: row.description,
    field: { slug: row.field, name: fieldName(row.field) },
    province: row.province,
    minLevel: { level: row.min_level, name: levelName(row.min_level) },
    stipend: row.stipend,
    closingDate: row.closing_date,
    daysLeft: daysUntil(row.closing_date),
    isOpen: isOpen(row),
    status: row.status,
    applyMethod: row.apply_method,
    applyUrl: row.apply_url,
    calendarUrl: `/api/v1/opportunities/${row.id}/calendar.ics`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(profile ? { match: matchOpportunity(row, profile) } : {}),
    ...(state
      ? {
          saved: state.savedIds.has(row.id),
          alertDaysBefore: state.alertDays.get(row.id) ?? null,
          applied: state.appliedIds.has(row.id),
        }
      : {}),
  };
}
