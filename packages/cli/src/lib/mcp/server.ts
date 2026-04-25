import type { UserConfig } from '@codemind/shared'
import { Server } from '@modelcontextprotocol/sdk/server'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types'
import * as checkTool       from './tools/check'
import * as seeTool         from './tools/see'
import * as traceTool       from './tools/trace'
import * as graphTool       from './tools/graph'
import * as statusTool      from './tools/status'
import * as watchStatusTool from './tools/watch-status'
import * as askTool         from './tools/ask'
import * as planTool        from './tools/plan'

const ALL_TOOLS = [checkTool, seeTool, traceTool, graphTool, statusTool, watchStatusTool, askTool, planTool]

export async function startMcpServer(config: UserConfig): Promise<void> {
  const server = new Server(
    { name: 'codemind', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map(t => t.TOOL_DEF),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const tool = ALL_TOOLS.find(t => t.TOOL_DEF.name === name)
    if (!tool) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
    }
    return tool.handle(request.params.arguments ?? {}, config)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Keep the process alive until killed. An MCP client connects via stdio pipes —
  // the process should only exit when the client disconnects (transport close) or
  // receives a signal. setInterval prevents Node from exiting if stdin reaches EOF
  // before a real client connects (e.g. when launched by a shell for the first time).
  await new Promise<void>((resolve) => {
    const keepalive = setInterval(() => {}, 30_000)
    const cleanup = () => { clearInterval(keepalive); resolve() }
    server.onclose = cleanup
    process.once('SIGTERM', cleanup)
    process.once('SIGINT',  cleanup)
  })
}
