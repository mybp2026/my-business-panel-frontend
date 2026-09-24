import { useEffect, useState } from "react";

import { employeeApi } from "@/api/employee.api";

interface SessionUser {
  user_id?: string;
  email?: string;
}

export function useSellerDisplayName(user: SessionUser | null | undefined): string {
  const [sellerDisplayName, setSellerDisplayName] = useState("");

  useEffect(() => {
    const userId = user?.user_id;
    const fallback = user?.email ?? "";
    if (!userId) {
      setSellerDisplayName(fallback);
      return;
    }
    let cancelled = false;
    employeeApi
      .getByUserId(userId)
      .then((emp) => {
        if (cancelled) return;
        const fullName =
          emp?.first_name || emp?.last_name
            ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim()
            : fallback;
        setSellerDisplayName(fullName);
      })
      .catch(() => {
        if (!cancelled) setSellerDisplayName(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.user_id, user?.email]);

  return sellerDisplayName;
}
