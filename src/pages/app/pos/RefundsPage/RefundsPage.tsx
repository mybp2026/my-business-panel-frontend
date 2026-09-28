import { useState } from "react";
import { useLoaderData } from "react-router-dom";

import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import type { RefundsPageLoaderData } from "@/router/loaders/returns.loaders";
import { DeferredPage } from "@/components/routing/DeferredPage";

import { RefundModeTabs } from "./RefundModeTabs";
import { RefundsHistoryTable } from "./RefundsHistoryTable";
import { ReturnDetailModal } from "./ReturnDetailModal";
import { SaleContextPanel } from "./SaleContextPanel";
import { SaleLookupForm } from "./SaleLookupForm";
import { useRefundFlow } from "@/hooks/useRefundFlow";

export function RefundsPage() {
  const { data } = useLoaderData() as {
    data: Promise<RefundsPageLoaderData>;
  };

  return (
    <DeferredPage resolve={data}>
      {({ initialReturns }) => (
        <RefundsPageContent initialReturns={initialReturns} />
      )}
    </DeferredPage>
  );
}

function RefundsPageContent({
  initialReturns,
}: Pick<RefundsPageLoaderData, "initialReturns">) {
  const flow = useRefundFlow({ initialReturns });
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  return (
    <div className="p-6 lg:p-8">
      {flow.toast && (
        <Toast
          mode={flow.toast.mode}
          message={flow.toast.message}
          onClose={() => flow.setToast(null)}
        />
      )}

      <PageHeaderBanner
        eyebrow="POS"
        title="Reembolsos"
        description="Procese reembolsos parciales o completos sobre una venta facturada."
      />

      <RefundModeTabs mode={flow.mode} onChange={flow.switchMode} />

      <SaleLookupForm
        saleIdInput={flow.saleIdInput}
        onChange={flow.setSaleIdInput}
        onLookup={flow.lookupSale}
        onClear={flow.clearSale}
        isLoading={flow.isLoadingContext}
        error={flow.contextError}
        hasContext={Boolean(flow.context)}
      />

      {flow.context && (
        <SaleContextPanel
          context={flow.context}
          mode={flow.mode}
          currencySymbol={flow.currencySymbol}
          selections={flow.selections}
          onToggleItem={flow.toggleItemSelection}
          onUpdateQuantity={flow.updateItemQuantity}
          refundMethod={flow.refundMethod}
          onRefundMethodChange={flow.setRefundMethod}
          returnStatusId={flow.returnStatusId}
          onReturnStatusChange={flow.setReturnStatusId}
          refundTotal={flow.refundTotal}
          description={flow.description}
          onDescriptionChange={flow.setDescription}
          isSubmitting={flow.isSubmitting}
          canSubmitPartial={flow.productsToRefund.length > 0}
          onSubmitPartial={flow.submitPartial}
          onSubmitFull={flow.submitFull}
        />
      )}

      <RefundsHistoryTable
        returns={flow.returns}
        onViewDetail={(id) => setSelectedReturnId(id)}
      />

      {selectedReturnId && (
        <ReturnDetailModal
          returnId={selectedReturnId}
          onClose={() => setSelectedReturnId(null)}
        />
      )}
    </div>
  );
}
