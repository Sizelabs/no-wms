"use server";

import { INVOICE_VALID_TRANSITIONS } from "@no-wms/shared/validators/invoice";
import { revalidatePath } from "next/cache";

import { getActionAuth } from "@/lib/auth/action";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function getInvoices(filters?: {
  status?: string;
  agency_id?: string;
  period_start?: string;
  period_end?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("invoices")
    .select("*, agencies(name, code)")
    .order("created_at", { ascending: false });

  if (agencyScope !== null) {
    query = query.in("agency_id", agencyScope);
  }

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.period_start) query = query.gte("period_start", filters.period_start);
  if (filters?.period_end) query = query.lte("period_end", filters.period_end);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getInvoice(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "*, agencies(name, code), invoice_line_items(*, warehouse_receipts(wr_number), work_orders(wo_number), shipping_instructions(si_number))",
    )
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Core billing logic: generates an invoice for an agency for a given period.
 * Computes shipping, storage, work order, and surcharge line items.
 */
export async function generateInvoice(formData: FormData): Promise<{ id: string } | { error: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const supabase = auth.supabase;
  const orgId = auth.organizationId;
  const agencyId = formData.get("agency_id") as string;
  const periodStart = formData.get("period_start") as string;
  const periodEnd = formData.get("period_end") as string;

  if (!agencyId || !periodStart || !periodEnd) {
    return { error: "Agencia y periodo son requeridos" };
  }

  // Generate invoice number (org-scoped sequential)
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const invoiceNumber = `INV${String((count ?? 0) + 1).padStart(5, "0")}`;

  // Collect all line items
  const lineItems: Array<{
    type: string;
    description: string;
    warehouse_receipt_id?: string;
    work_order_id?: string;
    shipping_instruction_id?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }> = [];

  // Also include manual line items if provided
  const manualItemsStr = formData.get("manual_line_items") as string | null;
  if (manualItemsStr) {
    const manualItems = JSON.parse(manualItemsStr) as Array<{
      type: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
    for (const item of manualItems) {
      lineItems.push({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: Math.round(item.quantity * item.unit_price * 100) / 100,
      });
    }
  }

  // 1. Shipping line items: dispatched WRs with finalized SIs in the period
  const { data: dispatchedSiItems } = await supabase
    .from("shipping_instruction_items")
    .select(
      "warehouse_receipt_id, shipping_instruction_id, warehouse_receipts!inner(wr_number, total_billable_weight_lb, agency_id, organization_id), shipping_instructions!inner(status, agency_id, destination_id, modality, courier_category, finalized_at)",
    )
    .eq("shipping_instructions.agency_id", agencyId)
    .eq("shipping_instructions.status", "finalized")
    .gte("shipping_instructions.finalized_at", periodStart)
    .lte("shipping_instructions.finalized_at", periodEnd + "T23:59:59Z");

  if (dispatchedSiItems?.length) {
    for (const item of dispatchedSiItems) {
      const wr = item.warehouse_receipts as any;
      const si = item.shipping_instructions as any;
      const weight = wr?.total_billable_weight_lb ?? 0;

      // Look up applicable tariff rate
      let ratePerKg = 0;
      let minimumCharge = 0;

      // Weight brackets are inline in tariff_schedules (no tariff_rates table)
      const weightKg = weight * 0.453592; // convert lb to kg for rate lookup

      const { data: tariffMatch } = await supabase
        .from("tariff_schedules")
        .select("rate_per_kg, minimum_charge")
        .eq("organization_id", orgId)
        .eq("agency_id", agencyId)
        .eq("destination_id", si.destination_id)
        .eq("modality", si.modality)
        .eq("rate_type", "agency_rate")
        .eq("is_active", true)
        .lte("effective_from", periodEnd)
        .lte("min_weight_kg", weightKg)
        .gte("max_weight_kg", weightKg)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (tariffMatch?.length) {
        ratePerKg = tariffMatch[0]!.rate_per_kg;
        minimumCharge = tariffMatch[0]!.minimum_charge;
      }

      const shippingTotal = Math.max(weightKg * ratePerKg, minimumCharge);

      lineItems.push({
        type: "shipping",
        description: `Envío ${wr?.wr_number ?? "?"} — ${weightKg.toFixed(2)} kg @ $${ratePerKg}/kg`,
        warehouse_receipt_id: item.warehouse_receipt_id,
        shipping_instruction_id: item.shipping_instruction_id,
        quantity: weightKg,
        unit_price: ratePerKg,
        total: Math.round(shippingTotal * 100) / 100,
      });
    }
  }

  // 2. Storage charge line items
  const { data: storageCharges } = await supabase
    .from("storage_charges")
    .select("*, warehouse_receipts!inner(wr_number, agency_id)")
    .eq("warehouse_receipts.agency_id", agencyId)
    .gte("charge_date", periodStart)
    .lte("charge_date", periodEnd)
    .is("invoice_line_item_id", null);

  if (storageCharges?.length) {
    // Group by WR for cleaner line items
    const byWr = new Map<string, { wrNumber: string; wrId: string; total: number; days: number }>();
    for (const sc of storageCharges) {
      const wrId = sc.warehouse_receipt_id;
      const existing = byWr.get(wrId);
      if (existing) {
        existing.total += sc.amount;
        existing.days += 1;
      } else {
        byWr.set(wrId, {
          wrNumber: (sc.warehouse_receipts as any)?.wr_number ?? "?",
          wrId,
          total: sc.amount,
          days: 1,
        });
      }
    }

    for (const [, entry] of byWr) {
      lineItems.push({
        type: "storage",
        description: `Almacenaje ${entry.wrNumber} — ${entry.days} día(s)`,
        warehouse_receipt_id: entry.wrId,
        quantity: entry.days,
        unit_price: Math.round((entry.total / entry.days) * 100) / 100,
        total: Math.round(entry.total * 100) / 100,
      });
    }
  }

  // 3. Work order charge line items
  const { data: completedWos } = await supabase
    .from("work_orders")
    .select("id, wo_number, type, work_order_items!inner(warehouse_receipt_id, warehouse_receipts!inner(agency_id))")
    .eq("work_order_items.warehouse_receipts.agency_id", agencyId)
    .eq("status", "completed")
    .gte("completed_at", periodStart)
    .lte("completed_at", periodEnd + "T23:59:59Z");

  if (completedWos?.length) {
    // Resolve wo_charge_default setting
    const { data: woChargeSetting } = await supabase.rpc("resolve_setting", {
      p_org_id: orgId,
      p_key: "wo_charge_default",
    });

    const woCharge = woChargeSetting ? parseFloat(String(woChargeSetting)) : 5.0;

    for (const wo of completedWos) {
      lineItems.push({
        type: "work_order",
        description: `OT ${wo.wo_number} — ${wo.type}`,
        work_order_id: wo.id,
        quantity: 1,
        unit_price: woCharge,
        total: woCharge,
      });
    }
  }

  // 4. Surcharge line items (additional_charges on SIs)
  const { data: siCharges } = await supabase
    .from("shipping_instructions")
    .select("id, si_number, additional_charges")
    .eq("agency_id", agencyId)
    .not("additional_charges", "is", null)
    .gte("finalized_at", periodStart)
    .lte("finalized_at", periodEnd + "T23:59:59Z");

  if (siCharges?.length) {
    for (const si of siCharges) {
      const charges = (si.additional_charges ?? []) as Array<{
        description: string;
        amount: number;
      }>;
      for (const charge of charges) {
        lineItems.push({
          type: "surcharge",
          description: `${charge.description} (${si.si_number})`,
          shipping_instruction_id: si.id,
          quantity: 1,
          unit_price: charge.amount,
          total: charge.amount,
        });
      }
    }
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;

  // Resolve tax rate
  const { data: taxRateSetting } = await supabase.rpc("resolve_setting", {
    p_org_id: orgId,
    p_key: "invoice_tax_rate",
  });

  const taxRate = taxRateSetting ? parseFloat(String(taxRateSetting)) : 0;
  const tax = Math.round(roundedSubtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((roundedSubtotal + tax) * 100) / 100;

  // Resolve credit days for due_date
  const { data: creditDaysSetting } = await supabase.rpc("resolve_setting", {
    p_org_id: orgId,
    p_key: "invoice_credit_days",
    p_agency_id: agencyId,
  });

  const creditDays = creditDaysSetting ? parseInt(String(creditDaysSetting), 10) : 30;
  const dueDate = new Date(periodEnd);
  dueDate.setDate(dueDate.getDate() + creditDays);

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      organization_id: orgId,
      agency_id: agencyId,
      invoice_number: invoiceNumber,
      status: "draft",
      period_start: periodStart,
      period_end: periodEnd,
      subtotal: roundedSubtotal,
      tax,
      total,
      due_date: dueDate.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (invoiceError) return { error: invoiceError.message };

  // Insert line items
  if (lineItems.length > 0) {
    const rows = lineItems.map((item) => ({
      invoice_id: invoice.id,
      type: item.type,
      description: item.description,
      warehouse_receipt_id: item.warehouse_receipt_id ?? null,
      work_order_id: item.work_order_id ?? null,
      shipping_instruction_id: item.shipping_instruction_id ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    const { error: itemsError } = await supabase.from("invoice_line_items").insert(rows);

    if (itemsError) {
      // Rollback invoice on line item failure
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return { error: itemsError.message };
    }

    // Link storage charges to their invoice line items
    if (storageCharges?.length) {
      const { data: insertedItems } = await supabase
        .from("invoice_line_items")
        .select("id, warehouse_receipt_id")
        .eq("invoice_id", invoice.id)
        .eq("type", "storage");

      if (insertedItems) {
        for (const li of insertedItems) {
          if (li.warehouse_receipt_id) {
            await supabase
              .from("storage_charges")
              .update({ invoice_line_item_id: li.id })
              .eq("warehouse_receipt_id", li.warehouse_receipt_id)
              .gte("charge_date", periodStart)
              .lte("charge_date", periodEnd)
              .is("invoice_line_item_id", null);
          }
        }
      }
    }
  }

  revalidatePath("/invoicing");
  return { id: invoice.id };
}

export async function updateInvoiceStatus(
  id: string,
  newStatus: string,
): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const supabase = auth.supabase;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (!invoice) return { error: "Factura no encontrada" };

  const allowed = INVOICE_VALID_TRANSITIONS[invoice.status];
  if (!allowed?.includes(newStatus)) {
    return { error: `No se puede cambiar de "${invoice.status}" a "${newStatus}"` };
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/invoicing");
  return {};
}

export async function voidInvoice(id: string, reason: string): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const supabase = auth.supabase;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (!invoice) return { error: "Factura no encontrada" };

  if (invoice.status !== "draft" && invoice.status !== "sent") {
    return { error: "Solo se pueden anular facturas en borrador o enviadas" };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "void", notes: reason })
    .eq("id", id);

  if (error) return { error: error.message };

  // Unlink storage charges so they can be re-invoiced
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("id")
    .eq("invoice_id", id)
    .eq("type", "storage");

  if (lineItems?.length) {
    const liIds = lineItems.map((li) => li.id);
    await supabase
      .from("storage_charges")
      .update({ invoice_line_item_id: null })
      .in("invoice_line_item_id", liIds);
  }

  revalidatePath("/invoicing");
  return {};
}

export async function getAgencyBillingDashboard(agencyId?: string) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  // For agency users, use their scoped agency
  const targetAgencyId = agencyId ?? (agencyScope?.length === 1 ? agencyScope[0] : null);

  if (!targetAgencyId) {
    return { data: null, error: null };
  }

  // Outstanding balance: sum of sent + overdue invoices
  const { data: outstandingInvoices } = await supabase
    .from("invoices")
    .select("total, status")
    .eq("agency_id", targetAgencyId)
    .in("status", ["sent", "overdue"]);

  const outstandingBalance = outstandingInvoices?.reduce((sum, inv) => sum + inv.total, 0) ?? 0;
  const pendingCount = outstandingInvoices?.length ?? 0;

  // Recent invoices (last 5)
  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total, due_date, paid_at, period_start, period_end")
    .eq("agency_id", targetAgencyId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Payment history (last 5 paid)
  const { data: paymentHistory } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, paid_at")
    .eq("agency_id", targetAgencyId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(5);

  return {
    data: {
      outstandingBalance,
      pendingCount,
      recentInvoices: recentInvoices ?? [],
      paymentHistory: paymentHistory ?? [],
    },
    error: null,
  };
}
