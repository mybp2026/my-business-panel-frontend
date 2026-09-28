import { useEffect, useState } from "react";

import { warehouseApi } from "@/api/warehouse.api";

export function useBranchWarehouse(tenantId: string, branchId: string): string {
  const [branchWarehouseId, setBranchWarehouseId] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!tenantId) return;
    warehouseApi
      .listByTenant()
      .then((rows) => {
        if (cancelled) return;
        const w = rows.find((r) => r.branch_id === branchId && r.is_branch);
        setBranchWarehouseId(w?.warehouse_id ?? "");
      })
      .catch(() => {
        if (!cancelled) setBranchWarehouseId("");
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, branchId]);

  return branchWarehouseId;
}
