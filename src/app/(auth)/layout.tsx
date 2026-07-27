import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Logo } from "@/shared/components/brand/logo";
import { siteConfig } from "@/features/marketing/lib/site-config";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-stretch">
      {/* Image panel — hidden below sm so the form keeps full width on mobile. */}
      <div className="relative hidden w-[42%] max-w-md overflow-hidden sm:block">
        <Image
          src="/images/marketing/auth-departure.jpg"
          alt="Straw hat and tan luggage beside a boarding pass, warm backlight at the gate"
          fill
          priority
          sizes="42vw"
          className="pointer-events-none object-cover"
        />
        {/* Fixed dark tone (not the theme-swapping --color-foreground token) —
            this scrim guarantees white-text contrast in both light and dark theme. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:linear-gradient(180deg,oklch(0.2_0.02_50_/_35%),oklch(0.2_0.02_50_/_55%)_65%,oklch(0.2_0.02_50_/_80%))]"
        />
        <p className="absolute inset-x-8 bottom-10 font-serif text-2xl leading-snug text-balance text-white">
          Every trip starts with one confirmed booking.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 font-serif text-xl">
              <Logo size={40} />
              {siteConfig.name}
            </CardTitle>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
