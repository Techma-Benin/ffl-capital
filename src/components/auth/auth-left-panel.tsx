import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type AuthLeftPanelProps = {
  subtitle: string;
  children: React.ReactNode;
};

export function AuthLeftPanel({ subtitle, children }: AuthLeftPanelProps) {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col overflow-hidden p-12 text-white">
      <Image
        src="/images/auth-panel-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="50vw"
      />
      <div className="absolute inset-0 bg-brand-950/85" aria-hidden />

      <div className="relative z-10 flex flex-col h-full">
        <Link href="/" className="flex items-center gap-2.5 w-fit transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">FFL Capital</p>
            <p className="text-xs text-brand-200">{subtitle}</p>
          </div>
        </Link>

        <div className="mt-auto">{children}</div>
      </div>
    </div>
  );
}
