import qs from "qs";
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

import { Model, TokenType } from "./model";

interface AuthorizationResult {
  error?: string;
  error_description?: string;
  access_token?: string;
  refresh_token?: string;
  [key: string]: any;
}

/* The GHL class is responsible for handling authorization, making API requests, and managing access
tokens and refresh tokens for a specific resource. */
export class GHL {
  public model: Model;

  constructor() {
    this.model = new Model();
  }

/**
 * The `authorizationHandler` function handles the authorization process by generating an access token
 * and refresh token pair.
 * @param {string} code - The code parameter is a string that represents the authorization code
 * obtained from the authorization server. It is used to exchange for an access token and refresh token
 * pair.
 */
  async authorizationHandler(code: string): Promise<AuthorizationResult> {
    if (!code) {
      console.warn(
        "Please provide code when making call to authorization Handler"
      );
      return { error: "no_code", error_description: "No authorization code provided" };
    }
    return await this.generateAccessTokenRefreshTokenPair(code);
  }

  decryptSSOData(key: string){
    const data = CryptoJS.AES.decrypt(key, process.env.GHL_APP_SSO_KEY as string).toString(CryptoJS.enc.Utf8)
    return JSON.parse(data)
  }

/**
 * The function creates an instance of Axios with a base URL and interceptors for handling
 * authorization and refreshing access tokens.
 * @param {string} resourceId - The `resourceId` parameter is a string that represents the locationId or companyId you want
 * to make api call for.
 * @returns an instance of the Axios library with some custom request and response interceptors.
 */
  requests(resourceId: string) {
    const baseUrl = process.env.GHL_API_DOMAIN;

    if (!this.model.getAccessToken(resourceId)) {
      throw new Error("Installation not found for the following resource");
    }

    const axiosInstance = axios.create({
      baseURL: baseUrl,
    });

    axiosInstance.interceptors.request.use(
      async (requestConfig: InternalAxiosRequestConfig) => {
        try {
          requestConfig.headers["Authorization"] = `${
            TokenType.Bearer
          } ${this.model.getAccessToken(resourceId)}`;
        } catch (e) {
          console.error(e);
        }
        return requestConfig;
      }
    );

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const originalRequest = error.config;

        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          return this.refreshAccessToken(resourceId).then(() => {
            originalRequest.headers.Authorization = `Bearer ${this.model.getAccessToken(
              resourceId
            )}`;
            return axios(originalRequest);
          });
        }

        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }

/**
 * The function checks if an installation exists for a given resource ID i.e locationId or companyId.
 * @param {string} resourceId - The `resourceId` parameter is a string that represents the ID of a
 * resource.
 * @returns a boolean value.
 */
  checkInstallationExists(resourceId: string){
    return !!this.model.getAccessToken(resourceId)
  }

/**
 * The function `getLocationTokenFromCompanyToken` retrieves a location token from a company token and
 * saves the installation information.
 * @param {string} companyId - A string representing the ID of the company.
 * @param {string} locationId - The `locationId` parameter is a string that represents the unique
 * identifier of a location within a company.
 */
  async getLocationTokenFromCompanyToken(
    companyId: string,
    locationId: string
  ) {
    try {
      console.log("Attempting to get location token with params:", {
        companyId,
        locationId,
        hasCompanyToken: !!this.model.getAccessToken(companyId),
        scopes: this.model.installationObjects[companyId]?.scope?.split(' ')
      });

      const res = await this.requests(companyId).post(
        "/oauth/locationToken",
        {
          companyId,
          locationId,
        },
        {
          headers: {
            Version: "2021-07-28",
          },
        }
      );

      console.log("Location token response:", {
        status: res.status,
        hasData: !!res.data,
        data: res.data
      });

      this.model.saveInstallationInfo(res.data);
    } catch (error: any) {
      console.error("Error getting location token:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  }

  private async refreshAccessToken(resourceId: string) {
    try {
      const resp = await axios.post(
        `${process.env.GHL_API_DOMAIN}/oauth/token`,
        qs.stringify({
          client_id: process.env.GHL_APP_CLIENT_ID,
          client_secret: process.env.GHL_APP_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: this.model.getRefreshToken(resourceId),
        }),
        { headers: { "content-type": "application/x-www-form-urlencoded" } }
      );
      this.model.setAccessToken(resourceId, resp.data.access_token);
      this.model.setRefreshToken(resourceId, resp.data.refresh_token);
    } catch (error: any) {
      console.error(error?.response?.data);
    }
  }

  private async generateAccessTokenRefreshTokenPair(code: string) {
    try {
      console.log("Attempting to exchange code for tokens with params:", {
        client_id: process.env.GHL_APP_CLIENT_ID,
        // Don't log the full secret
        client_secret: process.env.GHL_APP_CLIENT_SECRET ? '***' : 'undefined',
        grant_type: "authorization_code",
        code: code,
        api_domain: process.env.GHL_API_DOMAIN
      });

      const resp = await axios.post(
        `${process.env.GHL_API_DOMAIN}/oauth/token`,
        qs.stringify({
          client_id: process.env.GHL_APP_CLIENT_ID,
          client_secret: process.env.GHL_APP_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
        }),
        { headers: { "content-type": "application/x-www-form-urlencoded" } }
      );
      console.log("Token exchange response:", resp.data);
      this.model.saveInstallationInfo(resp.data);
      return resp.data;
    } catch (error: any) {
      console.error("Token exchange error details:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        headers: error?.response?.headers
      });
      return error?.response?.data || { error: "unknown_error", error_description: "An unknown error occurred" };
    }
  }
}
