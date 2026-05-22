import { v4 as uuidv4 } from 'uuid';
import { WorldModelClient } from '@anima/core';
import { Job } from '@anima/core';
import { calculateRutDeduction } from './calculate-rut-deduction.js';

export interface InvoiceResult {
  invoice_id: string;
  job_id: string;
  customer_id: string;
  labor_cost: number;
  platform_fee: number;
  rut_deduction: number;
  net_customer_payment: number;
  rut_reasoning: string;
}

export async function generateInvoice(
  company_name: string,
  job_id: string,
): Promise<string> {
  const job = await WorldModelClient.jobs.findById(job_id);
  if (!job) return `Job ${job_id} not found.`;
  if (job.status !== 'completed') {
    return `Job ${job_id} has status '${job.status}', must be 'completed' before invoicing.`;
  }
  if (job.net_customer_payment > 0) {
    return `Job ${job_id} already has net_customer_payment set (${job.net_customer_payment}). May already be invoiced.`;
  }
  if (!job.customer_id) return `Job ${job_id} has no customer_id — cannot invoice.`;

  // Calculate RUT deduction
  const rut = await calculateRutDeduction(company_name, job.labor_cost, job.customer_id);

  const net = parseFloat(
    (job.labor_cost - rut.deduction + job.platform_fee).toFixed(2),
  );

  const invoiceId = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;
  const now = new Date();

  // Write invoice as a document
  await WorldModelClient.documents.create({
    title: `Invoice ${invoiceId} — Job ${job_id}`,
    type: 'generated',
    content_text: JSON.stringify({
      invoice_id: invoiceId,
      job_id,
      customer_id: job.customer_id,
      service_type: job.service_type,
      labor_cost: job.labor_cost,
      platform_fee: job.platform_fee,
      rut_deduction: rut.deduction,
      net_customer_payment: net,
      generated_at: now.toISOString(),
      rut_reasoning: rut.reasoning,
    }),
    tags: [company_name.toLowerCase().replace(/\s+/g, '-'), 'invoice', job.customer_id],
    uploaded_by: 'finance-agent',
    vector_embedding: [],
  });

  // Update job financials
  await Job.findOneAndUpdate(
    { job_id },
    { rut_deduction: rut.deduction, net_customer_payment: net },
    { new: true },
  );

  // Update customer RUT usage and lifetime value
  if (rut.eligible && rut.deduction > 0) {
    await WorldModelClient.customers.updateRutUsage(
      job.customer_id,
      rut.deduction,
      now.getFullYear(),
    );
  }

  // Increment lifetime_value
  const { Customer } = await import('@anima/core');
  await Customer.findOneAndUpdate(
    { customer_id: job.customer_id },
    { $inc: { lifetime_value: net }, last_interaction_at: now },
    { new: true },
  );

  const result: InvoiceResult = {
    invoice_id: invoiceId,
    job_id,
    customer_id: job.customer_id,
    labor_cost: job.labor_cost,
    platform_fee: job.platform_fee,
    rut_deduction: rut.deduction,
    net_customer_payment: net,
    rut_reasoning: rut.reasoning,
  };

  return JSON.stringify(result, null, 2);
}
