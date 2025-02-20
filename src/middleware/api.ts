import { Request, Response, NextFunction } from 'express';
import { GHL } from '../ghl';
import { buildApiRequest, validateRequest } from '../utils/api';

export function createApiHandler(ghl: GHL) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locationId = req.query.locationId as string;
      let config = buildApiRequest(req);
      
      // Validate the request
      const validationError = validateRequest(config);
      if (validationError) {
        return res.status(400).send(validationError);
      }

      // Check installation
      if (!ghl.checkInstallationExists(locationId)) {
        return res.status(404).send("No installation found for this location");
      }

      // Adjust paths for location-specific endpoints based on GHL API documentation
      if (req.path.startsWith('/api/tasks')) {
        // Tasks endpoint according to GHL API docs
        config.path = `/locations/${locationId}/tasks`;
        // Ensure we have the correct version header for tasks
        config.headers = {
          ...config.headers,
          Version: "2021-07-28"
        };
      } else if (req.path.startsWith('/api/calendar')) {
        config.path = `/locations/${locationId}/calendars/events`;
        // Ensure we have the correct version header for calendar
        config.headers = {
          ...config.headers,
          Version: "2021-07-28"
        };
      } else if (req.path.startsWith('/api/contacts')) {
        // Contacts are also under location context
        config.path = `/locations/${locationId}/contacts`;
        if (req.params.contactId) {
          config.path += `/${req.params.contactId}`;
        }
        config.headers = {
          ...config.headers,
          Version: "2021-07-28"
        };
      }

      // Make the API request
      const request = await ghl.requests(locationId);
      let response;

      // Remove locationId from params since it's in the path
      if (config.params?.locationId) {
        delete config.params.locationId;
      }

      switch (config.method) {
        case 'GET':
          response = await request.get(config.path, {
            params: config.params,
            headers: config.headers
          });
          break;
        case 'POST':
          response = await request.post(config.path, config.body, {
            headers: config.headers
          });
          break;
        case 'PUT':
          response = await request.put(config.path, config.body, {
            headers: config.headers
          });
          break;
        case 'DELETE':
          response = await request.delete(config.path, {
            headers: config.headers
          });
          break;
        default:
          return res.status(405).send("Method not allowed");
      }

      return res.send(response.data);
    } catch (error: any) {
      console.error("API call error:", error?.response?.data || error?.message);
      return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
    }
  };
} 