import { redirect } from "next/navigation";
import { ADMIN_FILTER_LIST_PATH } from "@/lib/filter-sets/routes";

export default function AdminFilterListPage() {
  redirect(ADMIN_FILTER_LIST_PATH);
}
