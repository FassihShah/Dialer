import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const leads = await prisma.lead.findMany({
      where: { userId: user.id, ...(status && status !== "all" ? { status: status as never } : {}) },
      orderBy: { createdAt: "desc" },
    });
    const csv = toCsv(leads.map((l) => ({
      full_name: l.fullName,
      phone: l.phone,
      email: l.email || "",
      job_title: l.jobTitle || "",
      company_name: l.company || "",
      company_website: l.companyWebsite || "",
      industry: l.industry || "",
      region: l.region || "",
      status: l.status,
      call_count: l.callCount,
      last_called_at: l.lastCalledAt?.toISOString() || "",
      next_follow_up_at: l.nextFollowUpAt?.toISOString() || "",
      notes: l.notes || "",
    })));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cold-calling-leads.csv"`,
      },
    });
  } catch (error) {
    return jsonError(error, 401);
  }
}
