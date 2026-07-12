import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export default function MarketingHomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">TravelOS</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        The operating system for travel agencies.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
