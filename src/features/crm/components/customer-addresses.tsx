"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";

import type { CustomerAddress } from "@/features/crm/queries/get-customer.query";
import {
  addressFormSchema,
  type AddressFormInput,
} from "@/features/crm/schemas/customer.schema";
import {
  addAddressAction,
  updateAddressAction,
  deleteAddressAction,
} from "@/features/crm/actions/customer-relations.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

function AddressForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<AddressFormInput>;
  onSubmit: (values: AddressFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      label: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      isPrimary: false,
      ...defaultValues,
    },
  });

  function handleSubmit(values: AddressFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      form.reset();
      onCancel();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input placeholder="Home, Office…" {...field} value={field.value ?? ""} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="line2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State / Region</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPrimary"
            render={({ field }) => (
              <FormItem className="flex flex-row items-end gap-2 pb-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="size-4 rounded border-gray-300"
                  />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">Primary address</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

type Props = {
  tenantId: string;
  customerId: string;
  addresses: CustomerAddress[];
  canEdit: boolean;
};

export function CustomerAddresses({ tenantId, customerId, addresses, canEdit }: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAdd(values: AddressFormInput) {
    const result = await addAddressAction(tenantId, customerId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleUpdate(addressId: string, values: AddressFormInput) {
    const result = await updateAddressAction(tenantId, addressId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleDelete(addressId: string) {
    if (!confirm("Delete this address?")) return;
    const result = await deleteAddressAction(tenantId, addressId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Address deleted.");
    router.refresh();
  }

  function formatAddress(a: CustomerAddress): string {
    return [a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Addresses</h3>
        {canEdit && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="mr-1.5 size-4" />
            Add Address
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-lg border p-4">
          <AddressForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} submitLabel="Add Address" />
        </div>
      )}

      {addresses.length === 0 && !isAdding ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
          No addresses.
        </p>
      ) : (
        <ul className="space-y-2">
          {addresses.map((address) =>
            editingId === address.id ? (
              <li key={address.id} className="rounded-lg border p-4">
                <AddressForm
                  defaultValues={{
                    label: address.label ?? "",
                    line1: address.line1,
                    line2: address.line2 ?? "",
                    city: address.city ?? "",
                    state: address.state ?? "",
                    postalCode: address.postalCode ?? "",
                    country: address.country ?? "",
                    isPrimary: address.isPrimary,
                  }}
                  onSubmit={(values) => handleUpdate(address.id, values)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save"
                />
              </li>
            ) : (
              <li
                key={address.id}
                className="flex items-start justify-between gap-2 rounded-lg border px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-2 text-sm">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {address.label ?? "Address"}
                      {address.isPrimary && (
                        <Star className="ml-1.5 inline size-3 fill-amber-400 text-amber-400" />
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">{formatAddress(address)}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditingId(address.id)}
                      aria-label="Edit address"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      onClick={() => handleDelete(address.id)}
                      aria-label="Delete address"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
