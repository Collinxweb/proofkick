import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

// Sui switched public JSON-RPC off; Tatum now serves Sui over gRPC. Same Tatum API key, sent as x-api-key metadata.
const TATUM_GRPC = "https://sui-mainnet-grpc.gateway.tatum.io";
const PUBLIC_NODE = "https://fullnode.mainnet.sui.io:443";

export function getClient(via = "tatum") {
  if (via === "public") return new SuiGrpcClient({ network: "mainnet", baseUrl: PUBLIC_NODE });
  const key = process.env.TATUM_API_KEY?.trim();
  if (!key) throw new Error("TATUM_API_KEY is not set in this deployment");
  const transport = new GrpcWebFetchTransport({ baseUrl: process.env.SUI_GRPC_URL?.trim() || TATUM_GRPC, meta: { "x-api-key": key } });
  return new SuiGrpcClient({ network: "mainnet", transport });
}
