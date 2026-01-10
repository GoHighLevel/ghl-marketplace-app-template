import { useQuery } from "@tanstack/react-query";

/**
 * =================================================================
 * API CLIENT ABSTRACTION (Contract for Gemini, Implemented by Claude)
 * =================================================================
 * This is the central function for making API calls.
 * It will be responsible for:
 *  - Proxying requests through our backend to avoid exposing secrets.
 *  - Automatically injecting the Authorization header with the GHL token.
 *  - Handling 401/403 errors by triggering a token refresh or redirecting to login.
 *  - Intercepting calls to use the mock service when enabled.
 */
async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // In a real app, this would call our own backend proxy, not GHL directly.
  // e.g., const response = await fetch(`/api/ghl-proxy/${endpoint}`, { ... });
  // The proxy would then add the real auth headers and call GHL_API_DOMAIN.
  
  console.log(`[apiClient] Mock call to: ${endpoint}`);

  // For now, returning a mock response.
  if (endpoint.startsWith("contacts")) {
    return {
      contacts: [
        { id: 'contact_1', name: 'John Doe', email: 'john@example.com' },
        { id: 'contact_2', name: 'Jane Smith', email: 'jane@example.com' },
      ]
    } as T;
  }

  return {} as T;
}

// =================================================================
// DATA FETCHING HOOKS (Implemented by Gemini)
// =================================================================

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiClient<{ contacts: any[] }>("v1/contacts/"),
  });
}