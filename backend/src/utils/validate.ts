/** Input validation helpers and the fixed reference lists (provinces, fields, levels, types). */
import { z, ZodTypeAny } from 'zod';
import { badRequest } from './errors';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

export const FIELDS = [
  { slug: 'crop-production', name: 'Crop production' },
  { slug: 'animal-production', name: 'Animal production' },
  { slug: 'agri-economics', name: 'Agricultural economics & business' },
  { slug: 'agri-processing', name: 'Agro-processing & food science' },
  { slug: 'agri-engineering', name: 'Agricultural engineering & mechanisation' },
  { slug: 'horticulture', name: 'Horticulture' },
  { slug: 'natural-resources', name: 'Natural resources & environment' },
] as const;

export const LEVELS = [
  { level: 0, name: 'Below Grade 12' },
  { level: 1, name: 'Grade 12 (Matric)' },
  { level: 2, name: 'Certificate (NQF 5)' },
  { level: 3, name: 'Diploma (NQF 6)' },
  { level: 4, name: 'Degree (NQF 7)' },
  { level: 5, name: 'Postgraduate (NQF 8+)' },
] as const;

export const TYPES = [
  { slug: 'bursary', name: 'Bursary' },
  { slug: 'internship', name: 'Internship' },
  { slug: 'learnership', name: 'Learnership' },
  { slug: 'graduate_placement', name: 'Graduate placement' },
  { slug: 'programme', name: 'Programme' },
  { slug: 'job', name: 'Job' },
] as const;

const fieldSlugs = FIELDS.map((f) => f.slug) as [string, ...string[]];
const typeSlugs = TYPES.map((t) => t.slug) as [string, ...string[]];

export const provinceSchema = z.enum(PROVINCES);
export const fieldSchema = z.enum(fieldSlugs);
export const opportunityFieldSchema = z.enum([...fieldSlugs, 'any'] as [string, ...string[]]);
export const opportunityProvinceSchema = z.enum([...PROVINCES, 'National'] as [string, ...string[]]);
export const typeSchema = z.enum(typeSlugs);
export const levelSchema = z.number().int().min(0).max(5);
export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');

/** Today's date in South Africa (UTC+2), as YYYY-MM-DD. */
export function todaySA(): string {
  return new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Display names for slugs, used in API responses and match reasons. */
export const fieldName = (slug: string) => (slug === 'any' ? 'Any field' : FIELDS.find((f) => f.slug === slug)?.name ?? slug);
export const levelName = (level: number) => LEVELS.find((l) => l.level === level)?.name ?? String(level);
export const typeName = (slug: string) => TYPES.find((t) => t.slug === slug)?.name ?? slug;

/** Whole days from today (South Africa) to a YYYY-MM-DD date. Negative = in the past. */
export function daysUntil(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(todaySA())) / 86400000);
}
