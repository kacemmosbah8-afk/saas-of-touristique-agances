"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import type { CustomerContact } from "@/features/crm/queries/get-customer.query";
import {
  contactFormSchema,
  type ContactFormInput,
} from "@/features/crm/schemas/customer.schema";
import {
  addContactAction,
  updateContactAction,
  deleteContactAction,
} from "@/features/crm/actions/customer-relations.action";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { useConfirm } from "@/shared/hooks/use-confirm";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<ContactFormInput>;
  onSubmit: (values: ContactFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      isPrimary: false,
      ...defaultValues,
    },
  });

  function handleSubmit(values: ContactFormInput) {
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
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Input placeholder="Spouse, assistant…" {...field} value={field.value ?? ""} />
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
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">Primary contact</FormLabel>
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
  contacts: CustomerContact[];
  canEdit: boolean;
};

export function CustomerContacts({ tenantId, customerId, contacts, canEdit }: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleAdd(values: ContactFormInput) {
    const result = await addContactAction(tenantId, customerId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleUpdate(contactId: string, values: ContactFormInput) {
    const result = await updateContactAction(tenantId, contactId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleDelete(contactId: string) {
    if (!(await confirm({ title: "Delete this contact?", destructive: true }))) return;
    const result = await deleteContactAction(tenantId, contactId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Contact deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contacts</h3>
        {canEdit && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="mr-1.5 size-4" />
            Add Contact
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-lg border p-4">
          <ContactForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} submitLabel="Add Contact" />
        </div>
      )}

      {contacts.length === 0 && !isAdding ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
          No additional contacts.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) =>
            editingId === contact.id ? (
              <li key={contact.id} className="rounded-lg border p-4">
                <ContactForm
                  defaultValues={{
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    email: contact.email ?? "",
                    phone: contact.phone ?? "",
                    role: contact.role ?? "",
                    isPrimary: contact.isPrimary,
                  }}
                  onSubmit={(values) => handleUpdate(contact.id, values)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save"
                />
              </li>
            ) : (
              <li
                key={contact.id}
                className="flex items-start justify-between gap-2 rounded-lg border px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {contact.firstName} {contact.lastName}
                    {contact.isPrimary && (
                      <Star className="ml-1.5 inline size-3 fill-amber-400 text-amber-400" />
                    )}
                    {contact.role && (
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        · {contact.role}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditingId(contact.id)}
                      aria-label="Edit contact"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      onClick={() => handleDelete(contact.id)}
                      aria-label="Delete contact"
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
      {confirmDialog}
    </div>
  );
}
