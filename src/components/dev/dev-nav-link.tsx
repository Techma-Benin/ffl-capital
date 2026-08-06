"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function DevNavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        setPending(true);
        router.push(href);
      }}
      aria-busy={pending}
      className={clsx(className, pending && "pointer-events-none opacity-70")}
    >
      {pending ? (
        <span className="flex items-center gap-1.5">
          <Spinner size="xs" variant="slate" />
          {children}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}

export function DevBackLink({ href, label }: { href: string; label: string }) {
  return (
    <DevNavLink href={href} className="btn-secondary btn-sm">
      <ArrowLeft size={13} />
      {label}
    </DevNavLink>
  );
}
