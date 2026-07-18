/**
 * Turns a `sendCommunication`/`sendEmail` failure reason into a message
 * safe to show an agent. Centralized so every feature's "resend" action
 * reports the same wording instead of each hand-rolling its own copy of
 * this mapping (bookings and invitations both need it; more will).
 */
export function describeSendFailure(reason: string | undefined): string {
  const messages: Record<string, string> = {
    not_configured: "Email sending isn't configured for this workspace yet.",
    no_recipient: "There's no valid email address to send to.",
    provider_error: "The email provider rejected the send — try again shortly.",
  };
  return messages[reason ?? ""] ?? "Could not send the email.";
}
