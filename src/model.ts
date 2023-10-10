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

/**
 * The function saves installation information based on either the location ID or the company ID.
 * @param {InstallationDetails} details - The `details` parameter is an object of type
 * `InstallationDetails`.
 */
  async saveInstallationInfo(details: InstallationDetails) {
    console.log(details);
    if (details.locationId) {
      this.installationObjects[details.locationId] = details;
    } else if (details.companyId) {
      this.installationObjects[details.companyId] = details;
    }
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
  setAccessToken(resourceId: string, token: string) {
    if (this.installationObjects[resourceId]) {
        this.installationObjects[resourceId].access_token = token;
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
  setRefreshToken(resourceId: string, token: string) {
    if (this.installationObjects[resourceId]) {
        this.installationObjects[resourceId].refresh_token = token;
    }
  }
}
