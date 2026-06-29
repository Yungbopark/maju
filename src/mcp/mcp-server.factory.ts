import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolRegistry } from './tool-registry';

@Injectable()
export class McpServerFactory {
  constructor(private readonly toolRegistry: ToolRegistry) {}

  create(): McpServer {
    const server = new McpServer({
      name: 'maju',
      title: 'Maju',
      version: '0.1.0',
    });

    this.toolRegistry.register(server);

    return server;
  }
}
