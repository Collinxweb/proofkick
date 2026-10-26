import { SuiGrpcClient, GrpcWebFetchTransport } from "@mysten/sui/grpc";

// Tatum's Sui gateway is gRPC now (JSON-RPC was switched off by Sui in 2026). Auth is the x-api-key header.
const HOST = "sui-mainnet-grpc.gateway.tatum.io";

export async function getClient(mode = process.env.SUI_GRPC_MODE || "web") {
  const key = process.env.TATUM_API_KEY?.trim();
  if (!key) throw new Error("TATUM_API_KEY is not set in this deployment");
  if (mode === "native") {
    const { GrpcTransport } = await import("@protobuf-ts/grpc-transport");
    const { ChannelCredentials } = await import("@grpc/grpc-js");
    const transport = new GrpcTransport({ host: `${HOST}:443`, channelCredentials: ChannelCredentials.createSsl(), meta: { "x-api-key": key } });
    return new SuiGrpcClient({ network: "mainnet", transport });
  }
  const transport = new GrpcWebFetchTransport({ baseUrl: `https://${HOST}`, meta: { "x-api-key": key } });
  return new SuiGrpcClient({ network: "mainnet", transport });
}
