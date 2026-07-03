export interface IvaSummary {
  iva_debito: number;
  iva_credito: number;
  iva_cxp: number;
  iva_recuperable: number;
  iva_notas_credito: number;
  iva_debito_ajustado: number;
  /** Positivo = deuda con Hacienda. Negativo = saldo a favor. */
  iva_neto: number;
}
