import type { ReachConfig } from "../config";

export function protectedResourceMetadata(config: ReachConfig) {
  return {
    resource: config.publicOrigin,
    authorization_servers: [config.oauthIssuer],
    scopes_supported: ["reach:read"],
    bearer_methods_supported: ["header"],
  } as const;
}

export function oauthChallenge(config: ReachConfig): string {
  const metadataUrl = `${config.publicOrigin}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${metadataUrl}", scope="reach:read"`;
}
