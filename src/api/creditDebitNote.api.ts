import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  CreateCreditDebitNotePayload,
  CreditDebitNote,
} from "@/interfaces/entities/CreditDebitNote.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const creditDebitNoteApi = {
  async create(data: CreateCreditDebitNotePayload): Promise<CreditDebitNote> {
    const response = await fetch(`${url}/credit-debit-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await buildError(response, "Error al registrar la nota");
    }
    const json: ApiResponse<CreditDebitNote> = await response.json();
    return json.data;
  },

  async listByInvoice(invoiceId: string): Promise<CreditDebitNote[]> {
    const response = await fetch(
      `${url}/credit-debit-notes/invoice/${invoiceId}`,
      { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" },
    );
    if (!response.ok) {
      await buildError(response, "Error al cargar las notas");
    }
    const json: ApiResponse<CreditDebitNote[]> = await response.json();
    return json.data ?? [];
  },

  async voidNote(noteId: string, reason: string): Promise<CreditDebitNote> {
    const response = await fetch(`${url}/credit-debit-notes/${noteId}/void`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      await buildError(response, "Error al anular la nota");
    }
    const json: ApiResponse<CreditDebitNote> = await response.json();
    return json.data;
  },
};
