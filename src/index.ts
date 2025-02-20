/*you provided is a TypeScript code that sets up an Express server and defines several routes
for handling HTTP requests. */
import dotenv from "dotenv";
// Load environment variables before any other imports
dotenv.config();

import express, { Express, Request, Response } from "express";
import { GHL } from "./ghl";
import * as CryptoJS from 'crypto-js'
import { json } from "body-parser";
import { createApiHandler } from "./middleware/api";

const path = __dirname + "/ui/dist/";

const app: Express = express();
app.use(json({ type: 'application/json' }))

// Verify environment variables at startup
console.log("Environment check:", {
  GHL_APP_CLIENT_ID: process.env.GHL_APP_CLIENT_ID ? "✓ Set" : "✗ Missing",
  GHL_APP_CLIENT_SECRET: process.env.GHL_APP_CLIENT_SECRET ? "✓ Set" : "✗ Missing",
  GHL_API_DOMAIN: process.env.GHL_API_DOMAIN || "https://services.leadconnectorhq.com",
  PORT: process.env.PORT || 3000
});

/*`app.use(express.static(path));` is setting up a middleware in the Express server. The
`express.static` middleware is used to serve static files such as HTML, CSS, JavaScript, and images. */
app.use(express.static(path));

/* The line `const ghl = new GHL();` is creating a new instance of the `GHL` class. It is assigning
this instance to the variable `ghl`. This allows you to use the methods and properties defined in
the `GHL` class to interact with the GoHighLevel API. */
const ghl = new GHL();

const port = process.env.PORT;

/*`app.get("/authorize-handler", async (req: Request, res: Response) => { ... })` sets up an example how you can authorization requests */
app.get("/authorize-handler", async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      console.error("No authorization code provided");
      return res.status(400).send("No authorization code provided");
    }

    const result = await ghl.authorizationHandler(code as string);
    
    if (result?.error) {
      console.error("Authorization failed:", result);
      return res.status(400).send(`Authorization failed: ${result.error_description || result.error}`);
    }

    // If successful, redirect to GHL
    res.redirect("https://app.gohighlevel.com/");
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).send("Authorization failed. Please try again.");
  }
});

/*`app.get("/example-api-call", async (req: Request, res: Response) => { ... })` shows you how you can use ghl object to make get requests
 ghl object in abstract would handle all of the authorization part over here. */
app.get("/example-api-call", async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const companyId = req.query.companyId as string;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    // First check if we have a direct location token
    if (ghl.checkInstallationExists(locationId)) {
      console.log("Found existing location token for:", locationId);
      const request = await ghl
        .requests(locationId)
        .get(`/contacts?locationId=${locationId}`, {
          headers: {
            Version: "2021-07-28",
          },
        });
      return res.send(request.data);
    }
    
    // If no location token but we have companyId, try to get location token
    if (companyId && ghl.checkInstallationExists(companyId)) {
      console.log("Attempting to get location token using company token");
      try {
        await ghl.getLocationTokenFromCompanyToken(companyId, locationId);
        console.log("Successfully obtained location token");
        const request = await ghl
          .requests(locationId)
          .get(`/contacts?locationId=${locationId}`, {
            headers: {
              Version: "2021-07-28",
            },
          });
        return res.send(request.data);
      } catch (error: any) {
        console.error("Failed to get location token:", error?.response?.data || error?.message);
        return res.status(error?.response?.status || 500).send({
          error: "Failed to get location token",
          details: error?.response?.data || error?.message
        });
      }
    }

    return res.status(404).send("No valid installation found for this location/company");
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

/*`app.get("/example-api-call-location", async (req: Request, res: Response) => { ... })` shows you how you can use ghl object to make get requests
 ghl object in abstract would handle all of the authorization part over here. */
app.get("/example-api-call-location", async (req: Request, res: Response) => {
  try {
    if (ghl.checkInstallationExists(req.params.locationId)) {
      const request = await ghl
        .requests(req.query.locationId as string)
        .get(`/contacts?locationId=${req.query.locationId}`, {
          headers: {
            Version: "2021-07-28",
          },
        });
      return res.send(request.data);
    } else {
      await ghl.getLocationTokenFromCompanyToken(
        req.query.companyId as string,
        req.query.locationId as string
      );
      const request = await ghl
        .requests(req.query.locationId as string)
        .get(`/contacts?locationId=${req.query.locationId}`, {
          headers: {
            Version: "2021-07-28",
          },
        });
      return res.send(request.data);
    }
  } catch (error) {
    console.log(error);
    res.send(error).status(400)
  }
});

/*`app.post("example-webhook-handler",async (req: Request, res: Response) => {
    console.log(req.body)
})` sets up a route for handling HTTP POST requests to the "/example-webhook-handler" endpoint. The below POST
api can be used to subscribe to various webhook events configured for the app. */
app.post("/example-webhook-handler",async (req: Request, res: Response) => {
    console.log(req.body)
})


/* The `app.post("/decrypt-sso",async (req: Request, res: Response) => { ... })` route is used to
decrypt session details using ssoKey. */
app.post("/decrypt-sso",async (req: Request, res: Response) => {
  const {key} = req.body || {}
  if(!key){
    return res.status(400).send("Please send valid key")
  }
  try {
    const data = ghl.decryptSSOData(key)
    res.send(data)
  } catch (error) {
    res.status(400).send("Invalid Key")
    console.log(error)  
  }
})

/*`app.get("/", function (req, res) {
  res.sendFile(path + "index.html");
});` sets up a route for the root URL ("/") of the server.  This is
 used to serve the main HTML file of a web application. */
app.get("/", function (req, res) {
  res.sendFile(path + "index.html");
});

// Example GET endpoints
app.get("/api/contacts/:contactId", async (req: Request, res: Response) => {
  const { locationId } = req.query;
  const { contactId } = req.params;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    if (!ghl.checkInstallationExists(locationId as string)) {
      return res.status(404).send("No installation found for this location");
    }

    const request = await ghl
      .requests(locationId as string)
      .get(`/contacts/${contactId}`, {
        headers: { Version: "2021-07-28" },
      });
    return res.send(request.data);
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

// Example POST endpoint to create a contact
app.post("/api/contacts", async (req: Request, res: Response) => {
  const { locationId } = req.query;
  const contactData = req.body;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    if (!ghl.checkInstallationExists(locationId as string)) {
      return res.status(404).send("No installation found for this location");
    }

    const request = await ghl
      .requests(locationId as string)
      .post("/contacts", contactData, {
        headers: { Version: "2021-07-28" },
      });
    return res.send(request.data);
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

// Example PUT endpoint to update a contact
app.put("/api/contacts/:contactId", async (req: Request, res: Response) => {
  const { locationId } = req.query;
  const { contactId } = req.params;
  const updateData = req.body;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    if (!ghl.checkInstallationExists(locationId as string)) {
      return res.status(404).send("No installation found for this location");
    }

    const request = await ghl
      .requests(locationId as string)
      .put(`/contacts/${contactId}`, updateData, {
        headers: { Version: "2021-07-28" },
      });
    return res.send(request.data);
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

// Example DELETE endpoint
app.delete("/api/contacts/:contactId", async (req: Request, res: Response) => {
  const { locationId } = req.query;
  const { contactId } = req.params;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    if (!ghl.checkInstallationExists(locationId as string)) {
      return res.status(404).send("No installation found for this location");
    }

    const request = await ghl
      .requests(locationId as string)
      .delete(`/contacts/${contactId}`, {
        headers: { Version: "2021-07-28" },
      });
    return res.send(request.data);
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

// Example endpoint to get tasks
app.get("/api/tasks", async (req: Request, res: Response) => {
  const { locationId, status, page, limit } = req.query;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    if (!ghl.checkInstallationExists(locationId as string)) {
      return res.status(404).send("No installation found for this location");
    }

    const request = await ghl
      .requests(locationId as string)
      .get("/tasks", {
        params: {
          locationId,
          status,
          page,
          limit
        },
        headers: { Version: "2021-07-28" },
      });
    return res.send(request.data);
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

// Example endpoint to create a calendar event
app.post("/api/calendar/events", async (req: Request, res: Response) => {
  const { locationId } = req.query;
  const eventData = req.body;

  if (!locationId) {
    return res.status(400).send("Please provide a locationId");
  }

  try {
    if (!ghl.checkInstallationExists(locationId as string)) {
      return res.status(404).send("No installation found for this location");
    }

    const request = await ghl
      .requests(locationId as string)
      .post("/calendars/events", eventData, {
        headers: { Version: "2021-07-28" },
      });
    return res.send(request.data);
  } catch (error: any) {
    console.error("API call error:", error?.response?.data || error?.message);
    return res.status(error?.response?.status || 500).send(error?.response?.data || error?.message);
  }
});

// API routes using the new middleware
const apiHandler = createApiHandler(ghl);

// Contacts endpoints
app.get("/api/contacts", apiHandler);
app.get("/api/contacts/:contactId", apiHandler);
app.post("/api/contacts", apiHandler);
app.put("/api/contacts/:contactId", apiHandler);
app.delete("/api/contacts/:contactId", apiHandler);

// Calendar endpoints
app.post("/api/calendar/events", apiHandler);

// Start the server
app.listen(port, () => {
  console.log(`GHL app listening on port ${port}`);
});