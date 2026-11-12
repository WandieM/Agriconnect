/**
 * Integration tests against a real PostgreSQL test database:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/agriopportunity_test npm test
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';
import { migrate } from '../src/db/migrate';
import { DEMO_USERS, seed } from '../src/db/seed';
import { matchOpportunity } from '../src/matching';

const app = createApp();
const api = () => request(app);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const inDays = (n: number) => new Date(Date.now() + 2 * 3600e3 + n * 864e5).toISOString().slice(0, 10);

async function login(email: string, password: string) {
  const res = await api().post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

let admin: string;
let lerato: string;
let newUser: string;
let oppId: string;

beforeAll(async () => {
  await pool.query('DROP TABLE IF EXISTS applications, alerts, saved_opportunities, opportunities, profiles, users CASCADE');
  await migrate();
  await seed();
  admin = await login(DEMO_USERS.admin.email, DEMO_USERS.admin.password);
  lerato = await login(DEMO_USERS.youth.email, DEMO_USERS.youth.password);
});

afterAll(async () => {
  await pool.end();
});

describe('reference data and health', () => {
  it('health is ok', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.body.database).toBe('up');
  });
  it('meta lists provinces, fields, levels and types', async () => {
    const res = await api().get('/api/v1/meta');
    expect(res.body.provinces).toHaveLength(9);
    expect(res.body.fields.length).toBe(7);
    expect(res.body.levels.length).toBe(6);
    expect(res.body.types.map((t: { slug: string }) => t.slug)).toContain('bursary');
  });
});

describe('auth', () => {
  it('needs POPIA consent', async () => {
    const res = await api().post('/api/v1/auth/register').send({ name: 'No Consent', email: 'nc@agriopportunity.test', password: 'Passw0rd!' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.consent).toBeDefined();
  });
  it('registers a youth user', async () => {
    const res = await api().post('/api/v1/auth/register').send({ name: 'Sipho Dlamini', email: 'sipho@agriopportunity.test', password: 'Youth@1234', consent: true });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('youth');
    expect(res.body.user.profile).toBeNull();
    newUser = res.body.token;
  });
  it('blocks duplicate email', async () => {
    const res = await api().post('/api/v1/auth/register').send({ name: 'Dup', email: 'sipho@agriopportunity.test', password: 'Youth@1234', consent: true });
    expect(res.status).toBe(409);
  });
  it('wrong password gives a generic error', async () => {
    const res = await api().post('/api/v1/auth/login').send({ email: DEMO_USERS.youth.email, password: 'nope12345' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Email or password is incorrect');
  });
  it('me returns profile and never the hash', async () => {
    const res = await api().get('/api/v1/auth/me').set(auth(lerato));
    expect(res.body.user.profile.field).toBe('crop-production');
    expect(JSON.stringify(res.body)).not.toContain('password');
  });
  it('rejects a tampered token', async () => {
    expect((await api().get('/api/v1/auth/me').set(auth(lerato + 'x'))).status).toBe(401);
  });
});

describe('golden journey: set profile -> matches -> save -> closing-date alert', () => {
  it('matches need a profile first', async () => {
    const res = await api().get('/api/v1/opportunities/matches').set(auth(newUser));
    expect(res.status).toBe(409);
  });
  it('rejects an invalid profile', async () => {
    const res = await api().put('/api/v1/profile').set(auth(newUser)).send({ field: 'astronomy', province: 'Mars', level: 9 });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['field', 'province', 'level']));
  });
  it('sets a profile', async () => {
    const res = await api().put('/api/v1/profile').set(auth(newUser)).send({ field: 'crop-production', province: 'Limpopo', level: 3 });
    expect(res.status).toBe(200);
    expect(res.body.profile.level).toBe(3);
  });
  it('shows a match count and a ranked, explainable list', async () => {
    const res = await api().get('/api/v1/opportunities/matches').set(auth(newUser));
    expect(res.status).toBe(200);
    // Crop/Limpopo/Diploma: internship (crop, Limpopo, dip), bursary (any, national, matric), incubator (crop, Limpopo, matric)
    expect(res.body.matchCount).toBe(3);
    const scores = res.body.items.map((o: { match: { score: number } }) => o.match.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    const top = res.body.items[0];
    expect(top.match.reasons).toHaveLength(3);
    expect(top.match.reasons.every((r: { ok: boolean }) => r.ok)).toBe(true);
    // Within full matches, soonest closing first
    const full = res.body.items.filter((o: { match: { isFullMatch: boolean } }) => o.match.isFullMatch);
    const dates = full.map((o: { closingDate: string }) => o.closingDate);
    expect([...dates].sort()).toEqual(dates);
    // Expired items never appear
    expect(res.body.items.some((o: { title: string }) => o.title.startsWith('Expired'))).toBe(false);
    oppId = full[0].id;
  });
  it('explains a partial match', async () => {
    const res = await api().get('/api/v1/opportunities/matches').set(auth(newUser));
    const partial = res.body.items.find((o: { match: { score: number } }) => o.match.score === 2);
    expect(partial).toBeDefined();
    const failed = partial.match.reasons.find((r: { ok: boolean }) => !r.ok);
    expect(failed.text).toMatch(/^(Needs|Only in)/);
  });
  it('saves the top match with a 3-day alert', async () => {
    const res = await api().post(`/api/v1/opportunities/${oppId}/save`).set(auth(newUser)).send({ daysBefore: 3 });
    expect(res.status).toBe(201);
    expect(res.body.opportunity.saved).toBe(true);
    expect(res.body.opportunity.alertDaysBefore).toBe(3);
  });
  it('saving again just updates the alert', async () => {
    const res = await api().post(`/api/v1/opportunities/${oppId}/save`).set(auth(newUser)).send({ daysBefore: 1 });
    expect(res.status).toBe(201);
    expect(res.body.opportunity.alertDaysBefore).toBe(1);
    await api().post(`/api/v1/opportunities/${oppId}/save`).set(auth(newUser)).send({ daysBefore: 3 });
  });
  it('saved list contains it', async () => {
    const res = await api().get('/api/v1/me/saved').set(auth(newUser));
    expect(res.body.items.map((o: { id: string }) => o.id)).toContain(oppId);
  });
  it('the closing-date alert is due (closes in 2 days, alert 3 days before)', async () => {
    const res = await api().get('/api/v1/me/alerts').set(auth(newUser));
    const alert = res.body.due.find((a: { opportunityId: string }) => a.opportunityId === oppId);
    expect(alert).toBeDefined();
    expect(alert.message).toMatch(/closes in 2 days/);
  });
  it('dismisses the alert', async () => {
    const list = await api().get('/api/v1/me/alerts').set(auth(newUser));
    const id = list.body.due[0].id;
    expect((await api().patch(`/api/v1/me/alerts/${id}/dismiss`).set(auth(newUser))).status).toBe(204);
    const after = await api().get('/api/v1/me/alerts').set(auth(newUser));
    expect(after.body.due.find((a: { id: string }) => a.id === id)).toBeUndefined();
  });
  it('gives a calendar file with a reminder', async () => {
    const res = await api().get(`/api/v1/opportunities/${oppId}/calendar.ics?daysBefore=3`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/calendar/);
    expect(res.text).toContain('BEGIN:VEVENT');
    expect(res.text).toContain('TRIGGER:-P3D');
  });
  it('unsaves', async () => {
    expect((await api().delete(`/api/v1/opportunities/${oppId}/save`).set(auth(newUser))).status).toBe(204);
    const res = await api().get('/api/v1/me/saved').set(auth(newUser));
    expect(res.body.items.map((o: { id: string }) => o.id)).not.toContain(oppId);
  });
});

describe('search and detail', () => {
  it('guests can search with filters; province includes national', async () => {
    const res = await api().get('/api/v1/opportunities').query({ province: 'Limpopo' });
    expect(res.status).toBe(200);
    expect(res.body.items.every((o: { province: string }) => ['Limpopo', 'National'].includes(o.province))).toBe(true);
    expect(res.body.items[0].match).toBeUndefined();
  });
  it('filters by type and closing within days', async () => {
    const res = await api().get('/api/v1/opportunities').query({ type: 'internship', closingWithin: 7 });
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((o: { type: { slug: string }; daysLeft: number }) => o.type.slug === 'internship' && o.daysLeft <= 7)).toBe(true);
  });
  it('sorted by closing date by default', async () => {
    const res = await api().get('/api/v1/opportunities');
    const d = res.body.items.map((o: { closingDate: string }) => o.closingDate);
    expect([...d].sort()).toEqual(d);
  });
  it('signed-in youth get match info in search', async () => {
    const res = await api().get('/api/v1/opportunities').set(auth(lerato));
    expect(res.body.items[0].match).toBeDefined();
    expect(res.body.items[0]).toHaveProperty('saved');
  });
  it('safe against SQL injection', async () => {
    const res = await api().get('/api/v1/opportunities').query({ q: "'; DROP TABLE opportunities; --" });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
  it('rejects bad filters and ids', async () => {
    expect((await api().get('/api/v1/opportunities').query({ type: 'party' })).status).toBe(400);
    expect((await api().get('/api/v1/opportunities/not-a-uuid')).status).toBe(400);
  });
});

describe('apply', () => {
  it('applies through the simple form', async () => {
    const res = await api().post(`/api/v1/opportunities/${oppId}/apply`).set(auth(newUser)).send({ motivation: 'I farm vegetables with my family and studied a diploma in plant production.' });
    expect(res.status).toBe(201);
  });
  it('cannot apply twice', async () => {
    const res = await api().post(`/api/v1/opportunities/${oppId}/apply`).set(auth(newUser)).send({ motivation: 'Second try at applying for the same thing.' });
    expect(res.status).toBe(409);
  });
  it('link opportunities refuse the form', async () => {
    const list = await api().get('/api/v1/opportunities').query({ type: 'bursary' });
    const link = list.body.items.find((o: { applyMethod: string }) => o.applyMethod === 'link');
    const res = await api().post(`/api/v1/opportunities/${link.id}/apply`).set(auth(newUser)).send({ motivation: 'I would like this bursary very much indeed.' });
    expect(res.status).toBe(400);
  });
  it('my applications lists it', async () => {
    const res = await api().get('/api/v1/me/applications').set(auth(newUser));
    expect(res.body.items).toHaveLength(1);
  });
});

describe('admin', () => {
  let created: string;
  it('youth cannot use admin routes', async () => {
    expect((await api().get('/api/v1/admin/opportunities').set(auth(lerato))).status).toBe(403);
  });
  it('rejects a past closing date and a link without URL', async () => {
    const res = await api().post('/api/v1/admin/opportunities').set(auth(admin)).send({
      title: 'Bad opportunity', type: 'job', organisation: 'Test Org', description: 'A description that is long enough.',
      field: 'any', province: 'National', closingDate: inDays(-1), applyMethod: 'link',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['closingDate', 'applyUrl']));
  });
  it('creates an opportunity that appears in matches', async () => {
    const res = await api().post('/api/v1/admin/opportunities').set(auth(admin)).send({
      title: 'Seedling Nursery Internship', type: 'internship', organisation: 'Test Nursery (demo)',
      description: 'Six months in a seedling nursery: sowing, grafting and dispatch.', field: 'crop-production',
      province: 'Limpopo', minLevel: 2, closingDate: inDays(10), applyMethod: 'form',
    });
    expect(res.status).toBe(201);
    created = res.body.opportunity.id;
    const m = await api().get('/api/v1/opportunities/matches').set(auth(lerato));
    expect(m.body.items.map((o: { id: string }) => o.id)).toContain(created);
  });
  it('edit keeps the rules (link needs a URL)', async () => {
    const res = await api().patch(`/api/v1/admin/opportunities/${created}`).set(auth(admin)).send({ applyMethod: 'link' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.applyUrl).toBeDefined();
  });
  it('edits it', async () => {
    const res = await api().patch(`/api/v1/admin/opportunities/${created}`).set(auth(admin)).send({ stipend: 'R5 000 per month' });
    expect(res.body.opportunity.stipend).toBe('R5 000 per month');
  });
  it('expires it and it disappears from search', async () => {
    const res = await api().patch(`/api/v1/admin/opportunities/${created}/expire`).set(auth(admin));
    expect(res.body.opportunity.isOpen).toBe(false);
    const s = await api().get('/api/v1/opportunities').query({ q: 'Seedling' });
    expect(s.body.items).toHaveLength(0);
    const closed = await api().get('/api/v1/admin/opportunities').query({ status: 'closed' }).set(auth(admin));
    expect(closed.body.items.map((o: { id: string }) => o.id)).toContain(created);
  });
  it('cannot save an expired opportunity', async () => {
    expect((await api().post(`/api/v1/opportunities/${created}/save`).set(auth(lerato)).send({})).status).toBe(409);
  });
  it('lists applications for an opportunity and shows stats', async () => {
    const apps = await api().get(`/api/v1/admin/opportunities/${oppId}/applications`).set(auth(admin));
    expect(apps.body.items).toHaveLength(1);
    const stats = await api().get('/api/v1/admin/stats').set(auth(admin));
    expect(stats.body.applications).toBe(1);
  });
});

describe('matching rules (unit)', () => {
  it('scores field, province and level', () => {
    const profile = { field: 'crop-production', province: 'Limpopo', level: 3, phone: null };
    expect(matchOpportunity({ field: 'crop-production', province: 'Limpopo', min_level: 3 }, profile).score).toBe(3);
    expect(matchOpportunity({ field: 'any', province: 'National', min_level: 1 }, profile).score).toBe(3);
    const partial = matchOpportunity({ field: 'horticulture', province: 'Limpopo', min_level: 2 }, profile);
    expect(partial.score).toBe(2);
    expect(partial.reasons[0]).toMatchObject({ ok: false, text: 'Needs Horticulture' });
    expect(matchOpportunity({ field: 'horticulture', province: 'Gauteng', min_level: 4 }, profile).score).toBe(0);
  });
});

describe('privacy', () => {
  it('a user can delete their account and data', async () => {
    expect((await api().delete('/api/v1/auth/me').set(auth(newUser))).status).toBe(204);
    expect((await api().post('/api/v1/auth/login').send({ email: 'sipho@agriopportunity.test', password: 'Youth@1234' })).status).toBe(401);
  });
});
