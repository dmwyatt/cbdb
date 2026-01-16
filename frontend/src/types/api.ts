export interface ConfigResponse {
  token_configured: boolean;
}

export interface ValidatePathResponse {
  success: boolean;
  error?: string;
  metadata_size?: number;
}

export interface DownloadLinkResponse {
  success: boolean;
  link?: string;
  error?: string;
}

export interface CoversResponse {
  success: boolean;
  covers?: Record<string, string>;
  error?: string;
}
