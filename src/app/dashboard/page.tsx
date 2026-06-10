import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();
  redirect(user.role === "ADMIN" ? "/admin" : "/crm");
}
