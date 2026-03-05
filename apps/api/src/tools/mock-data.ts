import type { CustomerStatus, InvoiceStatus, OrderStatus } from './types.js';

export const mockOrders: Record<string, OrderStatus> = {
  'ORD-1001': {
    orderId: 'ORD-1001',
    status: 'PICKING',
    updatedAt: '2026-03-04T13:45:00Z',
    channel: 'B2B',
  },
  'ORD-1002': {
    orderId: 'ORD-1002',
    status: 'SHIPPED',
    updatedAt: '2026-03-04T12:10:00Z',
    channel: 'B2C',
  },
  'ORD-1003': {
    orderId: 'ORD-1003',
    status: 'ON_HOLD',
    updatedAt: '2026-03-03T21:30:00Z',
    channel: 'B2B',
  },
};

export const mockInvoices: Record<string, InvoiceStatus> = {
  'INV-2001': {
    invoiceId: 'INV-2001',
    status: 'APPROVED',
    updatedAt: '2026-03-04T15:20:00Z',
    amountCurrency: 'USD 12400.00',
  },
  'INV-2002': {
    invoiceId: 'INV-2002',
    status: 'PENDING',
    updatedAt: '2026-03-04T14:05:00Z',
    amountCurrency: 'ARS 980000.00',
  },
};

export const mockCustomers: Record<string, CustomerStatus> = {
  'CUS-3001': {
    customerId: 'CUS-3001',
    tier: 'PLATINUM',
    accountStatus: 'ACTIVE',
    updatedAt: '2026-03-04T16:01:00Z',
  },
  'CUS-3002': {
    customerId: 'CUS-3002',
    tier: 'STANDARD',
    accountStatus: 'REVIEW',
    updatedAt: '2026-03-04T11:40:00Z',
  },
};

