import { auth } from "@/shared/lib/auth";
import { getInvitationByToken } from "@/features/tenants/queries/get-invitation-by-token.query";
import { MEMBERSHIP_ROLE_LABELS } from "@/features/tenants/schemas/invitation.schema";
import { AcceptInvitationButton } from "@/features/tenants/components/accept-invitation-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";

export const metadata = { title: "Accept invitation — TravelOS" };

type PageProps = { params: Promise<{ token: string }> };

function InviteCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function InviteTokenPage({ params }: PageProps) {
  const { token } = await params;
  const [invitation, session] = await Promise.all([getInvitationByToken(token), auth()]);

  if (!invitation) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <InviteCard
          title="Invalid invitation"
          description="This invitation link is invalid, or it's already been revoked."
        />
      </div>
    );
  }

  if (invitation.accepted) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <InviteCard
          title="Already accepted"
          description={`This invitation to join ${invitation.tenantName} has already been accepted.`}
        />
      </div>
    );
  }

  if (invitation.expired) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <InviteCard
          title="Invitation expired"
          description={`This invitation to join ${invitation.tenantName} has expired. Ask an admin there to send a new one.`}
        />
      </div>
    );
  }

  const roleLabel =
    MEMBERSHIP_ROLE_LABELS[invitation.role as keyof typeof MEMBERSHIP_ROLE_LABELS] ??
    invitation.role;

  if (session?.user?.email) {
    const emailMatches = session.user.email.toLowerCase() === invitation.email.toLowerCase();

    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Join {invitation.tenantName}</CardTitle>
            <CardDescription>
              {emailMatches
                ? `You've been invited to join as ${roleLabel}.`
                : `This invitation was sent to ${invitation.email}, but you're signed in as ${session.user.email}. Sign out and sign back in with that address to accept it.`}
            </CardDescription>
          </CardHeader>
          {emailMatches && (
            <CardContent>
              <AcceptInvitationButton token={token} />
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Join {invitation.tenantName}</h1>
          <p className="text-muted-foreground text-sm">
            Sign in or create an account with <strong>{invitation.email}</strong> to accept your
            invitation as {roleLabel}.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <SignInForm redirectTo={`/invite/${token}`} defaultEmail={invitation.email} />
          </CardContent>
        </Card>
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">No account yet?</span>
          <Separator className="flex-1" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <SignUpForm redirectTo={`/invite/${token}`} defaultEmail={invitation.email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
