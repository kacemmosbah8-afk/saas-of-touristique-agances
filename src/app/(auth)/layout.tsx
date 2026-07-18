import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Logo } from "@/shared/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 font-serif text-xl">
            <Logo size={26} />
            TravelOS
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
