import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@browserbasehq/stagehand",
    "pdf-parse",
    "@anthropic-ai/sdk",
    "@elastic/elasticsearch",
    "@modelcontextprotocol/sdk",
  ],
};

export default nextConfig;
