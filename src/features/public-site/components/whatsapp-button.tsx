import { MessageCircle } from "lucide-react";

import { interpolate, type Dictionary } from "@/shared/i18n/dictionary";

type Props = {
  /** Agency's own WhatsApp number from profile settings — the button
   * renders nothing until the agency has actually set one. */
  whatsapp: string | null;
  agencyName: string;
  dict: Dictionary;
};

/**
 * Floating, always-visible WhatsApp entry point rendered on every
 * storefront page (mounted once in the tenant layout). Distinct from the
 * WhatsApp links already in the footer/closing CTA/contact page, which only
 * reach a visitor who scrolls that far — this is reachable from anywhere,
 * for the visitor who has a quick question but won't fill out a form.
 */
export function WhatsAppButton({ whatsapp, agencyName, dict }: Props) {
  if (!whatsapp) return null;

  const phone = whatsapp.replace(/[^\d+]/g, "");
  const message = interpolate(dict.whatsappGreeting, { agency: agencyName });
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={dict.whatsappChatLabel}
      className="fixed bottom-6 end-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
