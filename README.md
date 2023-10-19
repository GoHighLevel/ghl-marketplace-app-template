# GoHighLevel Marketplace App Server

This is an Express.js server template for interacting with the GoHighLevel (GHL) API. It demonstrates how to set up an Express server to handle authorization and make GET requests to the GoHighLevel API.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Routes](#routes)
- [SSO](#sso)
- [Vue 3 Web Application](#vue-3-web-application)
- [How to Deploy on Render](#how-to-deploy-on-render)
- [License](#license)

## Prerequisites

Before you get started, make sure you have the following prerequisites:

- Node.js installed on your machine.

## Installation

1. Clone this repository to your local machine:

   ```bash
   git clone git@github.com:GoHighLevel/ghl-marketplace-app-template.git
   cd ghl-marketplace-app-template
   ```

2. Install the project dependencies:

   ```bash
   npm install
   ```

3. Set up your environment variables:

   Create a `.env` file by copying .env.example in the project root directory and add the following variables:

   ```
        GHL_APP_CLIENT_ID=<CLIENT_ID> #Change it to you apps client id
        GHL_APP_CLIENT_SECRET=<CLIENT_SECRET> #Change it to your apps secret
   ```

4. Start the dev Express server:

   ```bash
   npm run dev
   ```

   Your server will now be running at `http://localhost:3000` (or your specified port).

## Usage

This Express server template provides routes for handling authorization and making API calls to GoHighLevel. Here's how you can use it:

### Authorization

To setup the authorization process, you can add the below URL to redirect url section on Your marketplace app:

```
http://localhost:3000/authorize-handler
```

After obtaining the Installation details from GHL you can make changes in code to redirect user to anywhere you would like user journey to continue.

### Making API Calls

For showcasing use of obtained installation i have created two example api call.

#### Example API Call

This dummy api calls GHL user api to fetch users for a specific company. Note: Your app must have users read scope added to you app.
To make an example API call to GoHighLevel, access the following route:

```
http://localhost:3000/example-api-call?companyId=your-company-id
```

Replace `your-company-id` with the company ID for which you want to make the API call. Make sure your aop is installed for that specific company. This route demonstrates making a GET request to the GoHighLevel API using the `ghl.requests` method.

#### Example API Call with Location

This is another example where we are making call to contacts API. This flow searches for installation of the location you are trying to make call
To make an example API call for a specific location, access the following route:

```
http://localhost:3000/example-api-call-location?companyId=your-company-id&locationId=your-location-id
```

Replace `your-company-id` and `your-location-id` with the respective company and location IDs. This route checks if an installation exists for the location, retrieves the location token if needed, and then makes the API request.

## Routes

- `/authorize-handler`: Handles GoHighLevel authorization flow.
- `/example-api-call`: Makes an example API call to GoHighLevel for a company.
- `/example-api-call-location`: Makes an example API call to GoHighLevel for a specific location within a company.
- `/`: Serves the main HTML file and static assets of your web application.
- `Webhook Handling`: A route (/example-webhook-handler) has been added to handle incoming POST requests, likely for handling webhooks. It logs the body of the incoming request. You can add it tou your webhook URL section under your app to start receiving requests.
- `/decrypt-sso`: A route (/decrypt-sso) has been added to decrypt sso request response received from parent app (Please refer UI app for more details).

## SSO

Single Sign-On (SSO) is a centralized authentication method that streamlines access to various applications or services with a single set of login credentials. In the context of GoHighLevel, their SSO functionality currently supports integration exclusively with custom pages. When you implement SSO with custom pages through your application's UI, accessible via an iframe, you have the capability to request encrypted SSO details. These encrypted details can be decrypted using the SSOKey provided by GoHighLevel's marketplace, and an example API for this purpose has been included in the repository for straightforward integration.

## Vue 3 Web Application

This project includes a Vue 3 web application located in the `ui` folder under the `src` directory. The Vue application is designed to be served by the Express.js server.You can use this UI section to build custom pages. To work with the Vue 3 application, follow these steps:

1. Navigate to the `ui` folder:

   ```bash
   cd src/ui
   ```

2. Install the Vue application dependencies:

   ```bash
   npm install
   ```

3. Build the Vue application for production (if not already built):

   ```bash
   npm run build
   ```

   This will generate optimized static files in the `dist` directory, which will be served by the Express server.

4. Start the Express server (if not already running):

   ```bash
   cd ../../   # Navigate back to the project root directory
   npm start
   ```

   Your Vue 3 application will be served alongside the API functionality at `http://localhost:3000/`. You can access the Vue application by visiting this URL in your web browser.

## How to Deploy on Render

Follow these steps to deploy your GoHighLevel Marketplace App Server on Render:

1. **Sign Up on Render**:

   Create a Render account at [Render](https://render.com/).

2. **Create an new Web service**:

   - Log in to Render.
   - Click "Web Service" option to create new web service

3. **Connect Your Repository**:

   - Connect your github account
   - Select your Git repository with the app's code.

4. **Configure Build and Start Commands**:

   - Specify build and start commands:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`

5. **Set Environment Variables**:

   - In the environment settings, add:
     - `GHL_APP_CLIENT_ID`: Your GoHighLevel app's client ID.
     - `GHL_APP_CLIENT_SECRET`: Your GoHighLevel app's client secret.
     - `GHL_API_DOMAIN`: https://services.leadconnectorhq.com
     - `GHL_APP_SSO_KEY`: Your app's active SSO Key.

6. **Deploy Your App**:

   Your app deployment would automatically start once everything configured.

7. **Monitor Deployment**:

   Watch the progress in the Render dashboard in Logs section.

8. **Access Your App**:

   Once deployed, access your app using the provided URL.

9. **Troubleshooting**:

    Refer to Render's docs or contact support for help.

Your GoHighLevel Marketplace App Server is now live on Render.


## License

This project is licensed under the [MIT License](LICENSE).
