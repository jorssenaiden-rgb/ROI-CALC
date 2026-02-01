export type Assumptions = {
  downPaymentPct: number; // 0-100
  interestRatePct: number; // annual %
  amortYears: number; // 15/20/25/30
  vacancyPct: number; // 0-100 (reduces rent)
  expensePct: number; // 0-100 (operating expenses as % of effective rent)
};

export type Metrics = {
  loanAmount: number | null;
  monthlyMortgage: number | null;
  effectiveRentMonthly: number | null;
  opexMonthly: number | null;
  noiAnnual: number | null;
  cashFlowMonthly: number | null;
  cashOnCashPct: number | null;
  dscr: number | null;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function mortgagePaymentMonthly(
  principal: number,
  annualRatePct: number,
  amortYears: number
): number {
  const r = (annualRatePct / 100) / 12;
  const n = amortYears * 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function computeMetrics(
  price: number | null,
  estRentMonthly: number | null,
  listingNoiAnnual: number | null,
  assumptions: Assumptions
): Metrics {
  if (!price || price <= 0) {
    return {
      loanAmount: null,
      monthlyMortgage: null,
      effectiveRentMonthly: null,
      opexMonthly: null,
      noiAnnual: listingNoiAnnual ?? null,
      cashFlowMonthly: null,
      cashOnCashPct: null,
      dscr: null,
    };
  }

  const dp = clamp(assumptions.downPaymentPct, 0, 100) / 100;
  const loanAmount = price * (1 - dp);
  const monthlyMortgage = mortgagePaymentMonthly(
    loanAmount,
    assumptions.interestRatePct,
    assumptions.amortYears
  );

  // If rent missing, we can’t compute cashflow (but still return mortgage)
  if (!estRentMonthly || estRentMonthly <= 0) {
    return {
      loanAmount,
      monthlyMortgage,
      effectiveRentMonthly: null,
      opexMonthly: null,
      noiAnnual: listingNoiAnnual ?? null,
      cashFlowMonthly: null,
      cashOnCashPct: null,
      dscr: null,
    };
  }

  const vacancy = clamp(assumptions.vacancyPct, 0, 100) / 100;
  const effectiveRentMonthly = estRentMonthly * (1 - vacancy);

  const expense = clamp(assumptions.expensePct, 0, 100) / 100;
  const opexMonthly = effectiveRentMonthly * expense;

  const noiAnnual = (effectiveRentMonthly - opexMonthly) * 12;

  const cashFlowMonthly = (effectiveRentMonthly - opexMonthly) - monthlyMortgage;

  const cashInvested = price * dp;
  const cashOnCashPct =
    cashInvested > 0 ? (cashFlowMonthly * 12) / cashInvested * 100 : null;

  const dscr =
    monthlyMortgage > 0
      ? ((effectiveRentMonthly - opexMonthly) / monthlyMortgage)
      : null;

  return {
    loanAmount,
    monthlyMortgage,
    effectiveRentMonthly,
    opexMonthly,
    noiAnnual,
    cashFlowMonthly,
    cashOnCashPct,
    dscr,
  };
}
