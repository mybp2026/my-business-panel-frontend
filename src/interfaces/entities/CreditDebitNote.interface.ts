export type CreditDebitNoteType = "credit" | "debit";

export type CreditDebitNoteReasonKind =
  | "devolucion"
  | "descuento"
  | "error"
  | "mercancia_danada"
  | "mora"
  | "cargo_adicional"
  | "otro";

/** Nota de credito/debito sobre una factura de venta (Venezuela). */
export interface CreditDebitNote {
  note_id: string;
  note_number: number;
  invoice_id: string;
  note_type: CreditDebitNoteType;
  reason_kind: CreditDebitNoteReasonKind;
  description: string | null;
  amount: string | number;
  currency_id: number | null;
  is_voided: boolean;
  voided_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** Fila del listado tenant-wide (GET /credit-debit-notes) -- incluye
 *  contexto de la venta/cliente que la nota ajusta. */
export interface CreditDebitNoteListItem extends CreditDebitNote {
  sale_id: string;
  customer_name: string | null;
}

export interface CreateCreditDebitNotePayload {
  invoice_id: string;
  note_type: CreditDebitNoteType;
  reason_kind: CreditDebitNoteReasonKind;
  description?: string;
  amount: number;
  currency_id?: number;
}
