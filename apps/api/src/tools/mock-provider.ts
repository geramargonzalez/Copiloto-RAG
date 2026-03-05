import type { StatusProvider } from './types.js';
import { mockCustomers, mockInvoices, mockOrders } from './mock-data.js';

export class MockStatusProvider implements StatusProvider {
  async getOrderStatus(input: { orderId: string }) {
    return (
      mockOrders[input.orderId] ?? {
        orderId: input.orderId,
        status: 'CREATED',
        updatedAt: new Date().toISOString(),
        channel: 'B2B',
      }
    );
  }

  async getInvoiceStatus(input: { invoiceId: string }) {
    return (
      mockInvoices[input.invoiceId] ?? {
        invoiceId: input.invoiceId,
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
        amountCurrency: 'USD 0.00',
      }
    );
  }

  async getCustomerStatus(input: { customerId: string }) {
    return (
      mockCustomers[input.customerId] ?? {
        customerId: input.customerId,
        tier: 'STANDARD',
        accountStatus: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      }
    );
  }
}

