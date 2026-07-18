"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import type { IntegrationType } from "@/features/integrations/lib/registry";
import { connectProviderAction } from "@/features/integrations/actions/credentials.action";
import type { ConnectProviderInput } from "@/features/integrations/schemas/integration.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  type: IntegrationType;
  name: string;
  /** True when the agency already has stored credentials (rotate mode). */
  hasOwnCredentials: boolean;
  trigger: React.ReactNode;
};

/**
 * Connection wizard: captures an agency's own provider credentials and saves
 * them encrypted. Never pre-fills existing secrets (write-only), so this same
 * dialog serves both first connection and credential rotation.
 */
export function ConnectionWizard({ tenantId, type, name, hasOwnCredentials, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // TravelPayouts
  const [token, setToken] = useState("");
  // Hotelbeds
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  // Amadeus
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  function buildInput(): ConnectProviderInput | null {
    switch (type) {
      case "HOTELBEDS":
        return apiKey.trim() && apiSecret.trim()
          ? { type, apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), environment }
          : null;
      case "AMADEUS":
        return clientId.trim() && clientSecret.trim()
          ? { type, clientId: clientId.trim(), clientSecret: clientSecret.trim() }
          : null;
      case "TRAVELPAYOUTS":
        return token.trim() ? { type, token: token.trim() } : null;
    }
  }

  function submit() {
    const input = buildInput();
    if (!input) {
      toast.error("Please fill in all credential fields.");
      return;
    }
    startTransition(async () => {
      const result = await connectProviderAction(tenantId, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} credentials saved. Run Test Connection to verify.`);
      setToken("");
      setApiKey("");
      setApiSecret("");
      setClientId("");
      setClientSecret("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasOwnCredentials ? `Update ${name} credentials` : `Connect ${name}`}
          </DialogTitle>
          <DialogDescription>
            Enter your agency&rsquo;s own {name} API credentials. They are encrypted
            (AES-256-GCM) and stored against this workspace only — never shared with other
            agencies and never shown again after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {type === "HOTELBEDS" && (
            <>
              <Field label="API Key" value={apiKey} onChange={setApiKey} placeholder="Hotelbeds API key" />
              <Field
                label="Secret"
                value={apiSecret}
                onChange={setApiSecret}
                placeholder="Hotelbeds shared secret"
                help="Combined with the API key and a timestamp to compute the X-Signature."
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Environment</label>
                <Select value={environment} onValueChange={(v) => setEnvironment(v as "test" | "live")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="live">Live (production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === "AMADEUS" && (
            <>
              <Field
                label="Client ID"
                value={clientId}
                onChange={setClientId}
                placeholder="Amadeus API key (client_id)"
              />
              <Field
                label="Client Secret"
                value={clientSecret}
                onChange={setClientSecret}
                placeholder="Amadeus API secret (client_secret)"
              />
            </>
          )}

          {type === "TRAVELPAYOUTS" && (
            <Field
              label="API Token"
              value={token}
              onChange={setToken}
              placeholder="TravelPayouts access token"
              help="TravelPayouts dashboard → Developers → API tokens."
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            <KeyRound className="mr-1.5 size-4" />
            {isPending ? "Saving…" : hasOwnCredentials ? "Update Credentials" : "Save & Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {help && <p className="text-muted-foreground text-xs">{help}</p>}
    </div>
  );
}
