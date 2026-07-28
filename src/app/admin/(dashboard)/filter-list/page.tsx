import { redirect } from "next/navigation";

export default function AdminFilterListPage() {
  redirect("/admin/settings?tab=filter-sets");
}
