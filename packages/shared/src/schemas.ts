import { z } from 'zod';

export const chatRequestSchema = z.object({
  message: z.string().min(3).max(4000),
  conversationId: z.string().uuid().optional(),
});

export const feedbackSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  rating: z.enum(['up', 'down']),
  comment: z.string().min(1).max(500).optional(),
});

export const orderStatusInputSchema = z.object({
  orderId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ORD-\d{4,10}$/),
});

export const invoiceStatusInputSchema = z.object({
  invoiceId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^INV-\d{4,10}$/),
});

export const customerStatusInputSchema = z.object({
  customerId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^CUS-\d{4,10}$/),
});

export const toolNameSchema = z.enum(['getOrderStatus', 'getInvoiceStatus', 'getCustomerStatus']);

