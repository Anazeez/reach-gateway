import ipaddr from "ipaddr.js";

import { ReachError } from "../errors";

export type DnsResolver = (hostname: string) => Promise<string[]>;

export interface ValidatedPublicUrl {
  url: URL;
  addresses: string[];
}

function denied(message: string): never {
  throw new ReachError("POLICY_DESTINATION_DENIED", message);
}

function parseAddress(raw: string): ipaddr.IPv4 | ipaddr.IPv6 {
  const value = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;
  try {
    const address = ipaddr.parse(value);
    return address instanceof ipaddr.IPv6 && address.isIPv4MappedAddress()
      ? address.toIPv4Address()
      : address;
  } catch {
    denied("Destination resolved to an invalid address");
  }
}

function requirePublicAddress(raw: string): void {
  const address = parseAddress(raw);
  if (address.range() !== "unicast") denied("Destination is not public unicast");
}

export async function dohResolver(hostname: string): Promise<string[]> {
  const addresses = new Set<string>();
  for (const type of ["A", "AAAA"] as const) {
    const endpoint = new URL("https://cloudflare-dns.com/dns-query");
    endpoint.searchParams.set("name", hostname);
    endpoint.searchParams.set("type", type);
    const response = await fetch(endpoint, {
      headers: { accept: "application/dns-json" },
      redirect: "error",
    });
    if (!response.ok) continue;
    const body = (await response.json()) as { Answer?: Array<{ type: number; data: string }> };
    for (const answer of body.Answer ?? []) {
      if (answer.type === 1 || answer.type === 28) addresses.add(answer.data);
    }
  }
  return [...addresses];
}

export async function validatePublicUrl(
  input: URL,
  resolver: DnsResolver = dohResolver,
): Promise<ValidatedPublicUrl> {
  const url = new URL(input.href);
  if (url.protocol !== "https:") {
    throw new ReachError("POLICY_PROTOCOL_DENIED", "Only HTTPS destinations are allowed");
  }
  if (url.username || url.password) denied("Destination credentials are forbidden");
  if (url.port && url.port !== "443") denied("Non-default destination ports are forbidden");
  if (!url.hostname || url.hostname.endsWith(".")) denied("Ambiguous destination hostname");

  const literal = url.hostname.startsWith("[")
    ? url.hostname.slice(1, -1)
    : url.hostname;
  const addresses = ipaddr.isValid(literal) ? [literal] : await resolver(url.hostname);
  if (addresses.length === 0) {
    throw new ReachError("BACKEND_UNAVAILABLE", "Destination did not resolve", "unavailable");
  }
  for (const address of addresses) requirePublicAddress(address);

  url.hash = "";
  return { url, addresses: [...new Set(addresses)].sort() };
}
