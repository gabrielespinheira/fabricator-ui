import { describe, expect, it } from "vitest"

import {
  buildMcpServerConfig,
  CODEX_CONFIG,
  isMcpClient,
  mergeMcpConfig,
} from "./mcp"

describe("mcp init", () => {
  it("builds a fabricator server entry for each client format", () => {
    expect(buildMcpServerConfig("claude")).toEqual({
      mcpServers: {
        fabricator: { command: "npx", args: ["fabricator-ui@latest", "mcp"] },
      },
    })
    expect(buildMcpServerConfig("vscode")).toEqual({
      servers: {
        fabricator: { command: "npx", args: ["fabricator-ui@latest", "mcp"] },
      },
    })
    expect(buildMcpServerConfig("opencode")).toMatchObject({
      mcp: {
        fabricator: {
          type: "local",
          command: ["npx", "fabricator-ui@latest", "mcp"],
          enabled: true,
        },
      },
    })
    expect(CODEX_CONFIG).toContain("[mcp_servers.fabricator]")
  })

  it("keeps existing servers and settings when merging", () => {
    const merged = mergeMcpConfig(
      {
        mcpServers: { github: { command: "gh-mcp" } },
        other: true,
      },
      buildMcpServerConfig("claude")
    )
    expect(merged).toEqual({
      other: true,
      mcpServers: {
        github: { command: "gh-mcp" },
        fabricator: { command: "npx", args: ["fabricator-ui@latest", "mcp"] },
      },
    })
  })

  it("validates client names", () => {
    expect(isMcpClient("cursor")).toBe(true)
    expect(isMcpClient("emacs")).toBe(false)
  })
})
