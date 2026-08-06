import { auth } from "@clerk/nextjs/server";
import { parseAuthPortal } from "@/lib/auth/portal";
import { getPostAuthRedirectPathForPortal } from "@/lib/auth/redirect";
import { AuthContinueRedirect } from "./redirect";

type Props = {
  searchParams: Promise<{ portal?: string }>;
};

export default async function AuthContinuePage({ searchParams }: Props) {
  const { userId } = await auth();

  const params = await searchParams;
  const portal = parseAuthPortal(params.portal);

  const destination = userId
    ? await getPostAuthRedirectPathForPortal(portal)
    : "/sign-in";

  return <AuthContinueRedirect to={destination} />;
}
