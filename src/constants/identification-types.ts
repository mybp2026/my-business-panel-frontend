// Los ids siguen el orden de seeds/catalog/general/002-insert-document-types.sql.
// `code` es el ident_code que se imprime junto al documento en la factura.
export const identificationTypes = [
  { value: 1, code: "V", label: "Cédula de Identidad (V)" },
  { value: 2, code: "J", label: "RIF Persona Jurídica (J)" },
  { value: 3, code: "E", label: "Cédula de Identidad Extranjero (E)" },
  { value: 4, code: "G", label: "RIF Ente Gubernamental (G)" },
  { value: 5, code: "P", label: "Pasaporte (P)" },
  { value: 6, code: "C", label: "RIF Consejo Comunal (C)" },
];
