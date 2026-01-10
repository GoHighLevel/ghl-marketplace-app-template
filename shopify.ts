/**
 * @file Shopify Service Abstraction
 * This file defines the contract for interacting with the Shopify API.
 * The implementation will handle authentication and data transformation.
 */

export interface ShopifyOrder {
  id: string;
  name: string;
  totalPrice: { amount: string; currencyCode: string };
  createdAt: string;
}

export interface ShopifyCustomer {
  id: string;
  displayName: string;
  email: string;
}

export interface ShopifyService {
  getOrdersByCustomer(email: string): Promise<ShopifyOrder[]>;
  getCustomer(customerId: string): Promise<ShopifyCustomer>;
}

// A concrete implementation would be created here, likely using a secure
// server-side proxy to communicate with the Shopify Admin API.