/** The shapes of the data the API sends back. */
export type Role = 'youth' | 'admin';

export interface Profile {
  field: string;
  province: string;
  level: number;
  phone: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profile: Profile | null;
}

export interface MatchReason {
  check: 'field' | 'province' | 'level';
  ok: boolean;
  text: string;
}

export interface Opportunity {
  id: string;
  title: string;
  type: { slug: string; name: string };
  organisation: string;
  description: string;
  field: { slug: string; name: string };
  province: string;
  minLevel: { level: number; name: string };
  stipend: string | null;
  closingDate: string;
  daysLeft: number;
  isOpen: boolean;
  status: 'active' | 'expired';
  applyMethod: 'link' | 'form';
  applyUrl: string | null;
  calendarUrl: string;
  createdAt: string;
  updatedAt: string;
  match?: { score: number; outOf: number; isFullMatch: boolean; reasons: MatchReason[] };
  saved?: boolean;
  alertDaysBefore?: number | null;
  applied?: boolean;
  applications?: number;
  saves?: number;
}

export interface Alert {
  id: string;
  opportunityId: string;
  title: string;
  organisation: string;
  closingDate: string;
  remindOn: string;
  daysBefore: number;
  daysLeft: number;
  message: string;
}

export interface Meta {
  provinces: string[];
  fields: { slug: string; name: string }[];
  levels: { level: number; name: string }[];
  types: { slug: string; name: string }[];
}
