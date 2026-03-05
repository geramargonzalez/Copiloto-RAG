import {
  customerStatusInputSchema,
  invoiceStatusInputSchema,
  orderStatusInputSchema,
} from '@copiloto/shared';
import { randomUUID } from 'node:crypto';

import { safeLogValue } from '../logger.js';
import type { StatusProvider, ToolTraceRecord } from './types.js';

const TOOL_ALLOWLIST = new Set(['getOrderStatus', 'getInvoiceStatus', 'getCustomerStatus']);

const idPatterns = {
  orderId: /(ORD-\d{4,10})/i,
  invoiceId: /(INV-\d{4,10})/i,
  customerId: /(CUS-\d{4,10})/i,
};

const extractId = (message: string, pattern: RegExp): string | null => {
  const match = message.match(pattern);
  return match?.[1]?.toUpperCase() ?? null;
};

export type ToolExecutionResult = {
  traces: ToolTraceRecord[];
  summary: string;
};

export const executeStatusTools = async (
  message: string,
  provider: StatusProvider,
): Promise<ToolExecutionResult> => {
  const traces: ToolTraceRecord[] = [];
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  const orderId = extractId(message, idPatterns.orderId);
  const invoiceId = extractId(message, idPatterns.invoiceId);
  const customerId = extractId(message, idPatterns.customerId);

  const summaries: string[] = [];

  if (orderId && TOOL_ALLOWLIST.has('getOrderStatus')) {
    const parsed = orderStatusInputSchema.parse({ orderId });
    const output = await provider.getOrderStatus(parsed);
    traces.push({
      toolName: 'getOrderStatus',
      requestId,
      timestamp,
      status: 'ok',
      input: safeLogValue(parsed) as Record<string, unknown>,
      output: safeLogValue(output) as Record<string, unknown>,
    });
    summaries.push(
      `Pedido ${output.orderId}: ${output.status} (canal ${output.channel}) actualizado ${output.updatedAt}.`,
    );
  }

  if (invoiceId && TOOL_ALLOWLIST.has('getInvoiceStatus')) {
    const parsed = invoiceStatusInputSchema.parse({ invoiceId });
    const output = await provider.getInvoiceStatus(parsed);
    traces.push({
      toolName: 'getInvoiceStatus',
      requestId,
      timestamp,
      status: 'ok',
      input: safeLogValue(parsed) as Record<string, unknown>,
      output: safeLogValue(output) as Record<string, unknown>,
    });
    summaries.push(
      `Factura ${output.invoiceId}: ${output.status}, monto ${output.amountCurrency}, actualizado ${output.updatedAt}.`,
    );
  }

  if (customerId && TOOL_ALLOWLIST.has('getCustomerStatus')) {
    const parsed = customerStatusInputSchema.parse({ customerId });
    const output = await provider.getCustomerStatus(parsed);
    traces.push({
      toolName: 'getCustomerStatus',
      requestId,
      timestamp,
      status: 'ok',
      input: safeLogValue(parsed) as Record<string, unknown>,
      output: safeLogValue(output) as Record<string, unknown>,
    });
    summaries.push(
      `Cliente ${output.customerId}: cuenta ${output.accountStatus}, nivel ${output.tier}, actualizado ${output.updatedAt}.`,
    );
  }

  if (traces.length === 0) {
    return {
      traces,
      summary:
        'No lo sé con certeza con la información disponible. Compartí un ID válido (ORD-..., INV-... o CUS-...).',
    };
  }

  return {
    traces,
    summary: summaries.join(' '),
  };
};
