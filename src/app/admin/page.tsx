import { requireAdmin } from "@/lib/auth/session";
import AdminConsole from "@/components/AdminConsole";

export default async function AdminPage() {
  const user = await requireAdmin();
  return <AdminConsole currentUser={user} />;
}
