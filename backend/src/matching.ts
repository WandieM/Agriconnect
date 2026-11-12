/**
 * MATCHING — the heart of AgriOpportunity.
 *
 * An opportunity is checked against a young person's profile with three yes/no rules:
 *   1. Field:    same field as the profile, OR the opportunity accepts "any" field
 *   2. Province: same province as the profile, OR the opportunity is "National"
 *   3. Level:    the person's qualification level is at least the minimum level
 *
 * score = how many rules pass (0, 1, 2 or 3). A score of 3 is a "full match".
 * Every rule also returns a sentence, so the app can explain WHY something matches.
 */
import { fieldName, levelName } from './utils/validate';

export interface Profile {
  field: string; // e.g. 'crop-production'
  province: string; // e.g. 'Limpopo'
  level: number; // 0 = below Grade 12 ... 5 = postgraduate
  phone: string | null;
}

/** The three opportunity values the rules look at. */
interface Requirements {
  field: string; // a field slug, or 'any'
  province: string; // a province, or 'National'
  min_level: number;
}

export interface MatchResult {
  score: number;
  outOf: 3;
  isFullMatch: boolean;
  reasons: { check: 'field' | 'province' | 'level'; ok: boolean; text: string }[];
}

export function matchOpportunity(opp: Requirements, profile: Profile): MatchResult {
  // Rule 1: field
  const fieldOk = opp.field === 'any' || opp.field === profile.field;
  const fieldText =
    opp.field === 'any' ? 'Open to any field' : fieldOk ? `Your field: ${fieldName(opp.field)}` : `Needs ${fieldName(opp.field)}`;

  // Rule 2: province
  const provinceOk = opp.province === 'National' || opp.province === profile.province;
  const provinceText =
    opp.province === 'National' ? 'Open nationally' : provinceOk ? `In your province: ${opp.province}` : `Only in ${opp.province}`;

  // Rule 3: qualification level
  const levelOk = profile.level >= opp.min_level;
  const levelText = levelOk ? `You meet the minimum: ${levelName(opp.min_level)}` : `Needs at least ${levelName(opp.min_level)}`;

  // Score = number of rules that passed
  const score = [fieldOk, provinceOk, levelOk].filter((passed) => passed).length;

  return {
    score,
    outOf: 3,
    isFullMatch: score === 3,
    reasons: [
      { check: 'field', ok: fieldOk, text: fieldText },
      { check: 'province', ok: provinceOk, text: provinceText },
      { check: 'level', ok: levelOk, text: levelText },
    ],
  };
}
