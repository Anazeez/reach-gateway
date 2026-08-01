import type { AdapterRegistry } from "./adapters/registry";
import type { ReachEnvelope, ReachSource } from "./contracts";

export async function gatewayHealth(
  registry: AdapterRegistry,
  sources: readonly ReachSource[],
  signal: AbortSignal,
): Promise<ReachEnvelope<unknown>> {
  const channels = await registry.health(sources, signal);
  const unavailable = channels.filter((channel) => channel.status !== "passed");
  return {
    status: unavailable.length === 0 ? "passed" : "unavailable",
    source: "web",
    operation: "health",
    canonicalUrl: null,
    retrievedAt: new Date().toISOString(),
    backend: "reach-health@1",
    content: null,
    items: channels,
    citations: [],
    warnings: unavailable.map((channel) => `${channel.source}:${channel.reasonCode}`),
    reasonCode: unavailable.length === 0 ? null : "BACKEND_UNAVAILABLE",
  };
}
