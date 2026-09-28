import { authApi } from "@/api/auth.api";
import { promotionApi } from "@/api/promotion.api";
import { segmentApi } from "@/api/segment.api";

import type {
  Promotion,
  PromotionType,
} from "@/interfaces/entities/Promotion.interface";
import type { Segment } from "@/interfaces/entities/Segment.interface";

export interface PromotionsPageLoaderData {
  promotions: Promotion[];
  promotionTypes: PromotionType[];
  segments: Segment[];
  tenantId: string;
}

const fetchPromotionsPageData =
  async (): Promise<PromotionsPageLoaderData> => {
    const currentUser = await authApi.getCurrentUser();
    const tenantId = currentUser?.tenant?.tenant_id ?? "";

    const [promotions, promotionTypes, segments] = await Promise.all([
      tenantId
        ? promotionApi.getByTenant(tenantId).catch(() => [])
        : Promise.resolve<Promotion[]>([]),
      promotionApi.getTypes().catch(() => []),
      segmentApi.getAll().catch(() => []),
    ]);

    return { promotions, promotionTypes, segments, tenantId };
  };

/**
 * Carga diferida: el loader retorna de inmediato (sin await) para que la
 * navegación no espere la respuesta del backend. La página resuelve la
 * promesa con <Suspense>+<Await> y muestra un loader animado mientras tanto.
 */
export const getPromotionsPageData = () => ({
  data: fetchPromotionsPageData(),
});

export const getPromotionsByTenant = (tenantId: string): Promise<Promotion[]> =>
  promotionApi.getByTenant(tenantId);

export const getPromotionTypes = (): Promise<PromotionType[]> =>
  promotionApi.getTypes();
