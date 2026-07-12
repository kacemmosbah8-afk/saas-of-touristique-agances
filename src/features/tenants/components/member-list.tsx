import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { TenantMember } from "@/features/tenants/queries/list-members.query";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MemberList({ members }: { members: TenantMember[] }) {
  return (
    <Card>
      <CardContent className="divide-border divide-y">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {initials(member.user.name ?? member.user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {member.user.name ?? member.user.email}
                </p>
                <p className="text-muted-foreground text-sm">
                  {member.user.email}
                </p>
              </div>
            </div>
            <Badge variant="outline">{member.role}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
