import { FormSkeleton } from "@/components/ui/form-skeleton";

export default function OnboardingLoading() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <FormSkeleton />
    </div>
  );
}
