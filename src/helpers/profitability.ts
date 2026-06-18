import { CRC_CURRENCY_ID, convertCurrency } from "@/utils/currency";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type {
  BranchProfitability,
  BucketUnit,
  ProfitabilityPoint,
  ProfitabilityRawData,
  ProfitabilityResult,
  ProfitabilitySeries,
} from "@/interfaces/entities/Profitability.interface";

// Componentes monetarios acumulados de un (sucursal, bucket), ya en moneda destino.
interface BucketAccumulator {
  net_sales: number;
  discounts: number;
  cogs: number;
  returns: number;
  returns_cogs: number;
  expenses: number;
}

function emptyAccumulator(): BucketAccumulator {
  return {
    net_sales: 0,
    discounts: 0,
    cogs: 0,
    returns: 0,
    returns_cogs: 0,
    expenses: 0,
  };
}

// Etiqueta del eje X segun el paso del bucket.
function formatBucketLabel(iso: string, unit: BucketUnit): string {
  const d = new Date(iso);
  switch (unit) {
    case "hour":
      return d.toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "month":
      return d.toLocaleDateString("es-CR", {
        month: "short",
        year: "2-digit",
      });
    default: // day | week
      return d.toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit" });
  }
}

// Aplica las formulas de rentabilidad a un acumulador.
//   VN = ventas netas - devoluciones
//   UB = (ventas netas - cogs) - (devoluciones - cogs devuelto)
//   UN = UB - gastos
//   MB = UB / VN * 100 ; MN = UN / VN * 100
function computePoint(
  bucketStart: string,
  unit: BucketUnit,
  acc: BucketAccumulator,
): ProfitabilityPoint {
  const vn = acc.net_sales - acc.returns;
  const ub = acc.net_sales - acc.cogs - (acc.returns - acc.returns_cogs);
  const un = ub - acc.expenses;
  return {
    bucket_start: bucketStart,
    label: formatBucketLabel(bucketStart, unit),
    vn,
    ub,
    un,
    mb_pct: vn > 0 ? (ub / vn) * 100 : 0,
    mn_pct: vn > 0 ? (un / vn) * 100 : 0,
  };
}

function seriesFromBuckets(
  buckets: Map<string, BucketAccumulator>,
  unit: BucketUnit,
): ProfitabilitySeries {
  const points = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucketStart, acc]) => computePoint(bucketStart, unit, acc));

  return {
    points,
    total_vn: points.reduce((s, p) => s + p.vn, 0),
    total_ub: points.reduce((s, p) => s + p.ub, 0),
    total_un: points.reduce((s, p) => s + p.un, 0),
  };
}

// Pipeline puro: data cruda + moneda destino + tasas -> series para los graficos.
export function computeProfitability(
  raw: ProfitabilityRawData,
  targetCurrencyId: number,
  rates: ExchangeRate[],
): ProfitabilityResult {
  const unit = raw.bucket_unit;

  // Acumuladores por sucursal -> por bucket. Y un acumulador general por bucket.
  const byBranch = new Map<string, Map<string, BucketAccumulator>>();
  const general = new Map<string, BucketAccumulator>();

  const branchBucket = (branchId: string, bucket: string): BucketAccumulator => {
    let buckets = byBranch.get(branchId);
    if (!buckets) {
      buckets = new Map();
      byBranch.set(branchId, buckets);
    }
    let acc = buckets.get(bucket);
    if (!acc) {
      acc = emptyAccumulator();
      buckets.set(bucket, acc);
    }
    return acc;
  };

  const generalBucket = (bucket: string): BucketAccumulator => {
    let acc = general.get(bucket);
    if (!acc) {
      acc = emptyAccumulator();
      general.set(bucket, acc);
    }
    return acc;
  };

  const toTarget = (amount: number, fromCurrencyId: number) =>
    convertCurrency(Number(amount), fromCurrencyId, targetCurrencyId, rates);

  for (const row of raw.sales) {
    const netSales = toTarget(Number(row.net_sales), row.currency_id);
    const discounts = toTarget(Number(row.discounts), row.currency_id);
    const cogs = toTarget(Number(row.cogs), CRC_CURRENCY_ID);
    for (const acc of [
      branchBucket(row.branch_id, row.bucket_start),
      generalBucket(row.bucket_start),
    ]) {
      acc.net_sales += netSales;
      acc.discounts += discounts;
      acc.cogs += cogs;
    }
  }

  for (const row of raw.returns) {
    const returns = toTarget(Number(row.returns), row.currency_id);
    const returnsCogs = toTarget(Number(row.returns_cogs), CRC_CURRENCY_ID);
    for (const acc of [
      branchBucket(row.branch_id, row.bucket_start),
      generalBucket(row.bucket_start),
    ]) {
      acc.returns += returns;
      acc.returns_cogs += returnsCogs;
    }
  }

  for (const row of raw.expenses) {
    const expenses = toTarget(Number(row.amount_crc), CRC_CURRENCY_ID);
    for (const acc of [
      branchBucket(row.branch_id, row.bucket_start),
      generalBucket(row.bucket_start),
    ]) {
      acc.expenses += expenses;
    }
  }

  const generalSeries = seriesFromBuckets(general, unit);
  const tenantUn = generalSeries.total_un;

  // Una serie por sucursal (incluye sedes sin ventas -> serie vacia).
  const branches: BranchProfitability[] = raw.branches.map((b) => {
    const buckets = byBranch.get(b.branch_id) ?? new Map();
    const series = seriesFromBuckets(buckets, unit);
    return {
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      ...series,
      contribution_pct: tenantUn !== 0 ? (series.total_un / tenantUn) * 100 : 0,
    };
  });

  return { general: generalSeries, branches };
}
