import { requireUser } from "@/lib/auth/session";
import ColdCallingCrm from "@/components/ColdCallingCrm";

export default async function CrmPage() {
  const user = await requireUser();
  return <ColdCallingCrm currentUser={user} />;
}
