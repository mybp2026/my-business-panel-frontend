import { saleApi } from "@/api/sale.api";

import type { CreateSaleRequest } from "@/interfaces/api/requests/CreateSaleRequest.interface";
import type {
  CreateSaleResult,
  InvoiceInfo,
  SaleItemDetail,
} from "@/interfaces/entities/Sale.interface";

export const createFullSale = async (
  data: CreateSaleRequest,
): Promise<CreateSaleResult> => saleApi.createFullSale(data);

export const getInvoiceForSale = async (
  saleId: string,
): Promise<InvoiceInfo | null> => saleApi.getInvoice(saleId);

export const getSaleItemsForSale = async (
  saleId: string,
): Promise<SaleItemDetail[]> => saleApi.getSaleItems(saleId);
