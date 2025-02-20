import { Request } from 'express';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiRequestConfig {
  path: string;
  method: RequestMethod;
  locationId: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, any>;
}

export function buildApiRequest(req: Request, overrides: Partial<ApiRequestConfig> = {}): ApiRequestConfig {
  // Get the API path from the original request, removing the /api prefix
  const path = req.path.replace(/^\/api/, '');
  
  return {
    path,
    method: req.method as RequestMethod,
    locationId: req.query.locationId as string,
    params: req.query,
    body: req.body,
    headers: {
      Version: "2021-07-28",
      ...overrides.headers
    },
    ...overrides
  };
}

export function validateRequest(config: ApiRequestConfig): string | null {
  if (!config.locationId) {
    return "Please provide a locationId";
  }

  // Add more validations as needed
  return null;
} 