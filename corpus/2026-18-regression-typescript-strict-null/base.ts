interface Order {
  id: string;
  customerEmail?: string;
}

export function notifyCustomer(order: Order): string {
  if (!order.customerEmail) {
    return "skipped — no email on file";
  }
  return `notifying ${order.customerEmail}`;
}
