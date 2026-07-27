"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import type { SupplierContactItem } from "@/features/suppliers/queries/get-supplier.query";
import {
  supplierContactSchema,
  type SupplierContactInput,
} from "@/features/suppliers/schemas/supplier.schema";
import {
  addSupplierContactAction,
  updateSupplierContactAction,
  deleteSupplierContactAction,
} from "@/features/suppliers/actions/supplier-contact.action";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  dict,
  common,
}: {
  defaultValues?: Partial<SupplierContactInput>;
  onSubmit: (values: SupplierContactInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel: string;
  dict: ReturnType<typeof getAdminDictionary>["suppliers"]["contacts"];
  common: ReturnType<typeof getAdminDictionary>["common"];
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<SupplierContactInput>({
    resolver: zodResolver(supplierContactSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
      phone: "",
      isPrimary: false,
      ...defaultValues,
    },
  });

  function handleSubmit(values: SupplierContactInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.name}</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus />
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
                <FormLabel>{dict.role}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.rolePlaceholder} {...field} value={field.value ?? ""} />
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
                <FormLabel>{common.email}</FormLabel>
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
                <FormLabel>{common.phone}</FormLabel>
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
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">{dict.primaryContact}</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? dict.saving : submitLabel}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
            {dict.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

type Props = {
  tenantId: string;
  supplierId: string;
  contacts: SupplierContactItem[];
  canEdit: boolean;
  locale: Locale;
};

export function SupplierContactManager({
  tenantId,
  supplierId,
  contacts,
  canEdit,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).suppliers.contacts;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm(locale);

  async function handleAdd(values: SupplierContactInput) {
    const result = await addSupplierContactAction(tenantId, supplierId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleUpdate(contactId: string, values: SupplierContactInput) {
    const result = await updateSupplierContactAction(tenantId, contactId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleDelete(contactId: string) {
    if (!(await confirm({ title: dict.deleteConfirmTitle, destructive: true }))) return;
    const result = await deleteSupplierContactAction(tenantId, contactId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(dict.deleted);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{dict.heading}</h3>
          <p className="text-muted-foreground text-sm">{dict.subtitle}</p>
        </div>
        {canEdit && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="me-1.5 size-4" />
            {dict.addContact}
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-lg border p-4">
          <ContactForm
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
            submitLabel={dict.addContact}
            dict={dict}
            common={common}
          />
        </div>
      )}

      {contacts.length === 0 && !isAdding ? (
        <EmptyState title={dict.noContacts} className="rounded-lg py-6" />
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) =>
            editingId === contact.id ? (
              <li key={contact.id} className="rounded-lg border p-4">
                <ContactForm
                  defaultValues={{
                    name: contact.name,
                    role: contact.role ?? "",
                    email: contact.email ?? "",
                    phone: contact.phone ?? "",
                    isPrimary: contact.isPrimary,
                  }}
                  onSubmit={(values) => handleUpdate(contact.id, values)}
                  onCancel={() => setEditingId(null)}
                  submitLabel={common.save}
                  dict={dict}
                  common={common}
                />
              </li>
            ) : (
              <li
                key={contact.id}
                className="flex items-start justify-between gap-2 rounded-lg border px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {contact.name}
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
                    {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                      dict.noContactInfo}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditingId(contact.id)}
                      aria-label={dict.editContactAria}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      onClick={() => handleDelete(contact.id)}
                      aria-label={dict.deleteContactAria}
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
