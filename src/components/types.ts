import type { SessionUser } from "@/lib/auth/session";

export type CurrentUser = SessionUser;

export type Lead = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  companyWebsite?: string | null;
  industry?: string | null;
  region?: string | null;
  status: string;
  callCount: number;
  lastCalledAt?: string | null;
  nextFollowUpAt?: string | null;
  notes?: string | null;
  calledInSession: boolean;
};

export type CallLog = {
  id: string;
  leadName?: string | null;
  leadCompany?: string | null;
  dateTime: string;
  durationSeconds: number;
  outcome?: string | null;
  calledFromNumber?: string | null;
  notes?: string | null;
};
