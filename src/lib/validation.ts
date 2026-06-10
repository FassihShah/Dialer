import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8),
});

export const userSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).optional(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  disabled: z.boolean().default(false),
});

export const leadSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  email: z.string().trim().optional().or(z.literal("")),
  jobTitle: z.string().trim().optional().or(z.literal("")),
  company: z.string().trim().optional().or(z.literal("")),
  companyWebsite: z.string().trim().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  region: z.string().trim().optional().or(z.literal("")),
  country: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  timezone: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["new", "cold", "warm", "callback"]).default("new"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const leadUpdateSchema = leadSchema.partial().extend({
  status: z.enum(["new", "cold", "warm", "meeting_booked", "not_interested", "callback", "no_answer", "do_not_call"]).optional(),
  calledInSession: z.boolean().optional(),
});

export const signalWireSettingSchema = z.object({
  projectId: z.string().trim().min(1),
  apiToken: z.string().trim().min(1),
  spaceUrl: z.string().trim().min(1),
  sharedSubscriberReference: z.string().trim().optional().or(z.literal("")),
  sharedSubscriberPassword: z.string().trim().optional().or(z.literal("")),
  signalwireNumber: z.string().trim().optional().or(z.literal("")),
  dialAddress: z.string().trim().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const phoneNumberSchema = z.object({
  phoneNumber: z.string().trim().min(5),
  label: z.string().trim().optional().or(z.literal("")),
  country: z.string().trim().optional().or(z.literal("")),
  countryCode: z.string().trim().optional().or(z.literal("")),
  signalwireSid: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const callOutcomeSchema = z.object({
  callLogId: z.string().optional(),
  leadId: z.string(),
  outcome: z.enum(["cold", "warm", "meeting_booked", "not_interested", "callback", "no_answer", "do_not_call"]),
  notes: z.string().optional().default(""),
  durationSeconds: z.coerce.number().int().min(0).default(0),
  followUp: z.boolean().default(false),
  followUpAt: z.string().optional(),
  followUpNotes: z.string().optional(),
});
