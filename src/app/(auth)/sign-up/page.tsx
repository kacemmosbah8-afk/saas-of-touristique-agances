import Link from "next/link";

import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata = { title: "Create account — TravelOS" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <SignUpForm />
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
