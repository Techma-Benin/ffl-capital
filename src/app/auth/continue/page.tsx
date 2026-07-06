import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { parseAuthPortal } from "@/lib/auth/portal";
import { getPostAuthRedirectPathForPortal } from "@/lib/auth/redirect";

type Props = {
  searchParams: Promise<{ portal?: string }>;
};

export default async function AuthContinuePage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const portal = parseAuthPortal(params.portal);
  redirect(await getPostAuthRedirectPathForPortal(portal));
}
