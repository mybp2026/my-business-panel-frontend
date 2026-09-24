import { useEffect, useState } from "react";

import { documentApi } from "@/api/document.api";
import type { DocumentType } from "@/interfaces/entities/DocumentType.interface";

export function useDocumentTypes(): DocumentType[] {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  useEffect(() => {
    documentApi
      .getAll()
      .then(setDocumentTypes)
      .catch(() => setDocumentTypes([]));
  }, []);

  return documentTypes;
}
