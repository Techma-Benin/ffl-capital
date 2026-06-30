import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPostAuthRedirectPath } from "@/lib/auth/redirect";

export default async function AuthContinuePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  redirect(await getPostAuthRedirectPath());
}
