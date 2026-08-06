import { redirect } from "next/navigation";

export default function AdministratorsPage() {
  redirect("/admin/settings?tab=administration");
}
