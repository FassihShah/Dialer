export interface Lead {
  id: string;
  fullName: string;
  companyName: string | null;
  companyWebsite: string | null;
  phone: string;
  altPhones: string | null; // JSON string: '["...", "..."]'
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

/** Parse a lead's phone list (primary + alternates). */
export function getPhoneList(lead: Lead): string[] {
  const phones: string[] = [];
  if (lead.phone) phones.push(lead.phone);
  if (lead.altPhones) {
    try {
      const parsed = JSON.parse(lead.altPhones);
      if (Array.isArray(parsed)) parsed.forEach((p: string) => { if (p && !phones.includes(p)) phones.push(p); });
    } catch { /* malformed — ignore */ }
  }
  return phones;
}
