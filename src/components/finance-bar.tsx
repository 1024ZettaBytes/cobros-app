import { BarLegend, StackedBar } from '@/components/stacked-bar';
import type { ServiceFinance } from '@/utils/finance';

/** La barra de cobro de un servicio, con su leyenda. */
export function FinanceBar({ finance }: { finance: ServiceFinance }) {
  return (
    <div className="flex flex-col gap-2">
      <StackedBar
        collected={finance.collected}
        expectedTotal={finance.expectedTotal}
        expense={finance.monthlyExpense}
      />
      <BarLegend />
    </div>
  );
}
