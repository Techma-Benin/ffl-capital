"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — profile lives under Settings. */
export default function PartnerProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/partner/settings#profile");
  }, [router]);

  return null;
}
