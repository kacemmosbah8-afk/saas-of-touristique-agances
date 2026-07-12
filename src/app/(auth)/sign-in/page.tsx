import Link from "next/link";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata = { title: "Sign in — TravelOS" };

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <SignInForm />
      <p className="text-muted-foreground text-center text-sm">
        No account yet?{" "}
        <Link href="/sign-up" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
