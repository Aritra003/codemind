import type { Command } from 'commander'
import type { UserConfig } from '@codemind/shared'

export function registerServeCommand(program: Command, config: UserConfig): void {
  program
    .command('serve')
    .description('Start the MCP server for use with Claude Code and other MCP clients')
    .option('--port <n>', 'Port for the MCP server (default: stdio transport)', '0')
    .action(async (_opts: { port: string }) => {
      const { startMcpServer } = await import('../lib/mcp/server')
      await startMcpServer(config)
    })
}
