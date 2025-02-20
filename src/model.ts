import { supabase, Installation, InsertInstallation } from './supabase';

export enum AppUserType {
  Company = "Company",
  Location = "Location",
}

export enum TokenType {
  Bearer = "Bearer",
}

export interface InstallationDetails {
  access_token: string;
  token_type: TokenType.Bearer;
  expires_in: number;
  refresh_token: string;
  scope: string;
  userType: AppUserType;
  companyId?: string;
  locationId?: string;
}

/* The Model class is responsible for saving and retrieving installation details, access tokens, and
refresh tokens. */
export class Model {
  public installationObjects: { [key: string]: InstallationDetails } = {};

  constructor() {
    this.loadFromDatabase();
  }

  private async loadFromDatabase() {
    try {
      const { data: installations, error } = await supabase
        .from('installations')
        .select('*');

      if (error) throw error;

      // Convert database format to in-memory format
      installations?.forEach(installation => {
        const resourceId = installation.resource_id;
        this.installationObjects[resourceId] = {
          access_token: installation.access_token,
          token_type: TokenType.Bearer,
          expires_in: installation.expires_in,
          refresh_token: installation.refresh_token,
          scope: installation.scope,
          userType: installation.user_type as AppUserType,
          companyId: installation.company_id,
          locationId: installation.location_id
        };
      });

      console.log('Loaded installations from database:', this.getAllInstallations());
    } catch (error) {
      console.error('Error loading installation data:', error);
    }
  }

  private async saveToDatabase(resourceId: string, details: InstallationDetails) {
    try {
      const installation: InsertInstallation = {
        resource_id: resourceId,
        access_token: details.access_token,
        refresh_token: details.refresh_token,
        token_type: details.token_type,
        expires_in: details.expires_in,
        scope: details.scope,
        user_type: details.userType,
        company_id: details.companyId,
        location_id: details.locationId
      };

      const { error } = await supabase
        .from('installations')
        .upsert({ 
          ...installation,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'resource_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving installation data:', error);
      throw error;
    }
  }

  /**
   * Returns all current installations for debugging
   */
  getAllInstallations() {
    return Object.keys(this.installationObjects).map(key => ({
      resourceId: key,
      userType: this.installationObjects[key].userType,
      companyId: this.installationObjects[key].companyId,
      locationId: this.installationObjects[key].locationId,
      hasAccessToken: !!this.installationObjects[key].access_token
    }));
  }

  /**
   * The function saves installation information based on either the location ID or the company ID.
   * @param {InstallationDetails} details - The `details` parameter is an object of type
   * `InstallationDetails`.
   */
  async saveInstallationInfo(details: InstallationDetails) {
    console.log("Saving installation info:", {
      userType: details.userType,
      companyId: details.companyId,
      locationId: details.locationId,
      hasAccessToken: !!details.access_token,
      hasRefreshToken: !!details.refresh_token
    });

    if (details.companyId) {
      this.installationObjects[details.companyId] = details;
      await this.saveToDatabase(details.companyId, details);
      console.log(`Saved installation for company: ${details.companyId}`);
    }
    
    if (details.locationId) {
      this.installationObjects[details.locationId] = details;
      await this.saveToDatabase(details.locationId, details);
      console.log(`Saved installation for location: ${details.locationId}`);
    }

    if (!details.locationId && !details.companyId) {
      console.warn("No locationId or companyId found in installation details");
    }

    console.log("Current installations:", this.getAllInstallations());
  }

/**
 * The function `getAccessToken` returns the access token associated with a given resource ID i.e companyId or locationId from the
 * `installationObjects` object.
 * @param {string} resourceId - The `resourceId` parameter is a string that represents either locationId or companyId
 * It is used to retrieve the access token associated with that resource.
 * @returns The access token associated with the given resourceId.
 */
  getAccessToken(resourceId: string) {
    return this.installationObjects[resourceId]?.access_token;
  }


/**
 * The function sets an access token for a specific resource ID in an installation object.
 * @param {string} resourceId - The resourceId parameter is a string that represents the unique
 * identifier of a resource. It is used to identify a specific installation object in the
 * installationObjects array.
 * @param {string} token - The "token" parameter is a string that represents the access token that you
 * want to set for a specific resource.
 */
  async setAccessToken(resourceId: string, token: string) {
    if (this.installationObjects[resourceId]) {
      this.installationObjects[resourceId].access_token = token;
      await this.saveToDatabase(resourceId, this.installationObjects[resourceId]);
    }
  }

/**
 * The function `getRefreshToken` returns the refresh_token associated with a given location or company from the
 * installationObjects object.
 * @param {string} resourceId - The resourceId parameter is a string that represents the unique
 * identifier of a resource.
 * @returns The companyId associated with the installation object for the given resourceId.
 */
  getRefreshToken(resourceId: string) {
    return this.installationObjects[resourceId]?.refresh_token;
  }

/**
 * The function saves the refresh token for a specific resource i.e. location or company.
 * @param {string} resourceId - The resourceId parameter is a string that represents the unique
 * identifier of a resource. It is used to identify a specific installation object in the
 * installationObjects array.
 * @param {string} token - The "token" parameter is a string that represents the refresh token. A
 * refresh token is a credential used to obtain a new access token when the current access token
 * expires. It is typically used in authentication systems to maintain a user's session without
 * requiring them to re-enter their credentials.
 */
  async setRefreshToken(resourceId: string, token: string) {
    if (this.installationObjects[resourceId]) {
      this.installationObjects[resourceId].refresh_token = token;
      await this.saveToDatabase(resourceId, this.installationObjects[resourceId]);
    }
  }
}
