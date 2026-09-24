import { useEffect, useState } from "react";

import { customerApi } from "@/api/customer.api";
import type { CustomerDetail } from "@/interfaces/entities/CustomerDetail.interface";

export interface UseCustomerLoyaltyResult {
  customerDetail: CustomerDetail | null;
  availablePoints: number;
  pointsRate: number;
  loyaltyActive: boolean;
}

export function useCustomerLoyalty(
  customerId: string | undefined,
): UseCustomerLoyaltyResult {
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );

  useEffect(() => {
    if (!customerId) {
      setCustomerDetail(null);
      return;
    }
    let cancelled = false;
    customerApi
      .getDetail(customerId)
      .then((detail) => {
        if (!cancelled) setCustomerDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setCustomerDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const availablePoints = customerDetail?.loyalty_score ?? 0;
  const pointsRate = customerDetail?.points_redeemed_per_currency_unit ?? 0;
  const loyaltyActive = !!(
    customerDetail?.loyalty_program_active &&
    pointsRate > 0 &&
    availablePoints > 0
  );

  return { customerDetail, availablePoints, pointsRate, loyaltyActive };
}
