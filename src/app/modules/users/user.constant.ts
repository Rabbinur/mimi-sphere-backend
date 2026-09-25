export type IRoles = 'USER' | 'ADMIN' | 'CASHIER';

export const roles: IRoles[] = ['USER', 'ADMIN', 'CASHIER'];

export const UserRole = {
  USER: 'USER' as IRoles,
  ADMIN: 'ADMIN' as IRoles,
  CASHIER: 'CASHIER' as IRoles,
};
