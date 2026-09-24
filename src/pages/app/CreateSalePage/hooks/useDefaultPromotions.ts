import { useEffect, useState } from "react";

import { promotionApi } from "@/api/promotion.api";
import { isPromotionWithinDate } from "@/utils/promotion";
import type { Promotion } from "@/interfaces/entities/Promotion.interface";

export function useDefaultPromotions(tenantId: string): Promotion[] {
  const [defaultPromotions, setDefaultPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    promotionApi
      .getActiveDefaults(tenantId)
      .then((rows) => {
        if (cancelled) return;
        setDefaultPromotions(
          rows.filter(
            (p) =>
              p.is_active &&
              isPromotionWithinDate(
                p.promotion_start_date,
                p.promotion_end_date,
              ),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setDefaultPromotions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return defaultPromotions;
}
