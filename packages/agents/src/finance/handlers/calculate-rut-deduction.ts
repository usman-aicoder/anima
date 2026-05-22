import { WorldModelClient } from '@anima/core';

const RUT_CAP_ANNUAL = 75_000;
const RUT_RATE = 0.5; // 50% of labor cost

export interface RutCalculation {
  eligible: boolean;
  labor_cost: number;
  rut_used_ytd: number;
  remaining_allowance: number;
  deduction: number;
  net_labor: number;
  reasoning: string;
}

export async function calculateRutDeduction(
  _company_name: string,
  labor_cost: number,
  customer_id: string,
): Promise<RutCalculation> {
  const customer = await WorldModelClient.customers.findById(customer_id);

  if (!customer) {
    return {
      eligible: false,
      labor_cost,
      rut_used_ytd: 0,
      remaining_allowance: 0,
      deduction: 0,
      net_labor: labor_cost,
      reasoning: `Customer ${customer_id} not found. No deduction applied.`,
    };
  }

  if (!customer.rut_eligible) {
    return {
      eligible: false,
      labor_cost,
      rut_used_ytd: customer.rut_used_ytd,
      remaining_allowance: 0,
      deduction: 0,
      net_labor: labor_cost,
      reasoning: `Customer ${customer_id} is not RUT-eligible.`,
    };
  }

  // Reset yearly usage if the stored year differs from the current year
  const currentYear = new Date().getFullYear();
  const effectiveUsed = customer.rut_year === currentYear ? customer.rut_used_ytd : 0;
  const remaining = Math.max(0, RUT_CAP_ANNUAL - effectiveUsed);

  if (remaining <= 0) {
    return {
      eligible: true,
      labor_cost,
      rut_used_ytd: effectiveUsed,
      remaining_allowance: 0,
      deduction: 0,
      net_labor: labor_cost,
      reasoning: `Customer ${customer_id} has reached the SEK ${RUT_CAP_ANNUAL} annual RUT cap (used: ${effectiveUsed} SEK).`,
    };
  }

  // Deduction = min(labor_cost × 50%, remaining allowance)
  const maxDeduction = labor_cost * RUT_RATE;
  const deduction = Math.min(maxDeduction, remaining);

  return {
    eligible: true,
    labor_cost,
    rut_used_ytd: effectiveUsed,
    remaining_allowance: remaining,
    deduction: parseFloat(deduction.toFixed(2)),
    net_labor: parseFloat((labor_cost - deduction).toFixed(2)),
    reasoning: `Customer RUT-eligible. Labor: ${labor_cost}, 50% = ${maxDeduction}, remaining allowance: ${remaining}. Deduction: ${deduction.toFixed(2)} SEK.`,
  };
}
