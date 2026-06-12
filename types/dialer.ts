export interface Lead {
  id: string;
  fullName: string;
  companyName: string | null;
  companyWebsite: string | null;
  phone: string;
  email: string | null;
  jobTitle: string | null;
  industry: string | null;
  region: string | null;
  notes: string | null;
  status: string;
  callCount: number;
  lastCalledAt: string | null;
  followUpDate: string | null;
  calledInSession: boolean;
  queueOrder: number;
}
