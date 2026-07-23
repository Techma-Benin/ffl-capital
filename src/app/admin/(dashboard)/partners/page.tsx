import {
  fetchAdminPartnersRawData,
  parseAdminPartnersListFilters,
} from "@/lib/admin/partners-raw";
import { AdminPartnersView } from "@/components/admin/admin-partners-view";

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    dir?: string;
    company?: string;
    family?: string;
  };
}) {
  const initialFilters = parseAdminPartnersListFilters(searchParams);
  const raw = await fetchAdminPartnersRawData();

  return (
    <AdminPartnersView raw={raw} initialFilters={initialFilters} />
  );
}
