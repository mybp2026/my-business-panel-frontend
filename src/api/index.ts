export const url =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export { regionsApi } from "./regions.api";
export { authApi } from "./auth.api";
export { tenantApi } from "./tenant.api";
export { subscriptionApi } from "./subscription.api";
export { branchApi } from "./branch.api";
export { userApi } from "./user.api";
export { categoryApi } from "./category.api";
export { productApi } from "./product.api";
export { globalAttributeApi, tenantAttributeApi, attributeValueApi } from "./attribute.api";
export {
  productGroupTypeApi,
  productGroupApi,
  productVariantGroupApi,
} from "./productGroup.api";
export { productCompositionApi } from "./productComposition.api";
export { customerApi } from "./customer.api";
export { segmentApi } from "./segment.api";
export { marginApi } from "./margin.api";
export { documentApi } from "./document.api";
export { loyaltyApi } from "./loyalty.api";
export { haciendaApi } from "./hacienda.api";
export { employeeApi } from "./employee.api";
export { contractApi } from "./contract.api";
export { conceptApi } from "./concept.api";
export { clockingApi } from "./clocking.api";
export { turnsApi } from "./turns.api";
export { paysheetApi } from "./paysheet.api";
export { payrollApi } from "./payroll.api";
export { payrollMovementApi } from "./payrollMovement.api";
export { foulApi } from "./foul.api";
export { tardinessApi } from "./tardiness.api";
export { suspentionApi } from "./suspention.api";
export { incapacityApi } from "./incapacity.api";
export { saleApi } from "./sale.api";
export { cashRegisterApi } from "./cashRegister.api";
export { returnsApi } from "./returns.api";
export { promotionApi } from "./promotion.api";
export { warehouseApi } from "./warehouse.api";
export { purchaseApi } from "./purchase.api";
export { specialCodeApi } from "./specialCode.api";
export { currencyApi } from "./currency.api";
export { exchangeRateApi } from "./exchangeRate.api";
export { financesApi } from "./finances.api";
