export type OrderStatus = {
  orderId: string;
  status: 'CREATED' | 'PICKING' | 'SHIPPED' | 'DELIVERED' | 'ON_HOLD';
  updatedAt: string;
  channel: 'B2B' | 'B2C';
};

export type InvoiceStatus = {
  invoiceId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  updatedAt: string;
  amountCurrency: string;
};

export type CustomerStatus = {
  customerId: string;
  tier: 'STANDARD' | 'GOLD' | 'PLATINUM';
  accountStatus: 'ACTIVE' | 'REVIEW' | 'SUSPENDED';
  updatedAt: string;
};

export interface StatusProvider {
  getOrderStatus(input: { orderId: string }): Promise<OrderStatus>;
  getInvoiceStatus(input: { invoiceId: string }): Promise<InvoiceStatus>;
  getCustomerStatus(input: { customerId: string }): Promise<CustomerStatus>;
}

export type ToolTraceRecord = {
  toolName: string;
  requestId: string;
  timestamp: string;
  status: 'ok' | 'error';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

