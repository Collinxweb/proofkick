import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";

// Tatum serves Sui over native gRPC (HTTP/2), not grpc-web. Same Tatum API key, sent as x-api-key metadata.
const TATUM_HOST = "sui-mainnet-grpc.gateway.tatum.io:443";

export function getClient(via = "tatum") {
  if (via === "public") return new SuiGrpcClient({ network: "mainnet", baseUrl: "https://fullnode.mainnet.sui.io:443" });
  const key = process.env.TATUM_API_KEY?.trim();
  if (!key) throw new Error("TATUM_API_KEY is not set in this deployment");
  const transport = new GrpcTransport({ host: process.env.SUI_GRPC_HOST?.trim() || TATUM_HOST, channelCredentials: ChannelCredentials.createSsl(), meta: { "x-api-key": key } });
  return new SuiGrpcClient({ network: "mainnet", transport });
}
