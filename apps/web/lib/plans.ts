export type PlanId =
  | "ONE_DAY"
  | "THREE_DAY"
  | "FOUR_DAY";

export const PLAN_CONFIG: Record<
  PlanId,
  {
    label: string;
    amountPaise: number;
    displayPrice: string;
    days: number;
  }
> = {
  ONE_DAY: {
    label: "1 Day",
    amountPaise: 9900,
    displayPrice: "₹99",
    days: 1,
  },
  THREE_DAY: {
    label: "3 Days",
    amountPaise: 29900,
    displayPrice: "₹299",
    days: 3,
  },
  FOUR_DAY: {
    label: "4 Days",
    amountPaise: 49900,
    displayPrice: "₹499",
    days: 4,
  },
};
