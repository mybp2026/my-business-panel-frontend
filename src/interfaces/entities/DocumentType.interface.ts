/**
 * Shape real que devuelve GET /document (identification_type en el backend).
 * Antes este interface tenia campos que nunca existieron en la respuesta
 * (doc_type_id, doc_type_name, abbreviation) -- documentApi.getAll() nunca
 * se habia conectado a ninguna ruta, por eso el drift no se notaba.
 */
export interface DocumentType {
  identification_type_id: string;
  type_name: string;
  ident_code: string;
  description?: string;
}
