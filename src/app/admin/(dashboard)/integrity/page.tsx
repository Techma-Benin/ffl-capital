import { redirect } from "next/navigation";

export default function AdminIntegrityPage() {
  redirect("/admin/settings?tab=integrations");
}
