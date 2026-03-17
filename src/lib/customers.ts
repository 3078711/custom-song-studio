const STORAGE_KEY = "custom-song-studio-customers";

export type CustomerLevel = "普通" | "重点" | "VIP";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  wechat?: string;
  sourceChannel?: string;
  remark?: string;
  level: CustomerLevel;
  createdAt: string;
  updatedAt: string;
}

function getCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomers(customers: Customer[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export function listCustomers(): Customer[] {
  const list = getCustomers();
  return list.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getCustomerById(id: string): Customer | undefined {
  return getCustomers().find((c) => c.id === id);
}

export function createCustomer(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Customer {
  const customers = getCustomers();
  const now = new Date().toISOString();
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const customer: Customer = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  customers.push(customer);
  saveCustomers(customers);
  return customer;
}

export function updateCustomer(id: string, data: Partial<Customer>): Customer | null {
  const customers = getCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const updated = {
    ...customers[index],
    ...data,
    id: customers[index].id,
    createdAt: customers[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  customers[index] = updated;
  saveCustomers(customers);
  return updated;
}

export function deleteCustomer(id: string): boolean {
  const customers = getCustomers().filter((c) => c.id !== id);
  if (customers.length === getCustomers().length) return false;
  saveCustomers(customers);
  return true;
}
