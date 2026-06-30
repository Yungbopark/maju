import {
  All,
  Controller,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Request, Response } from 'express';
import { McpServerFactory } from './mcp-server.factory';
import { mcpRequestContext } from './tool-invocation-trace';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpServerFactory: McpServerFactory) {}

  @All()
  async handleMcpRequest(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const server = this.mcpServerFactory.create();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await mcpRequestContext.run(
        {
          method: request.method,
          headers: request.headers,
          body: request.body,
        },
        async () => {
          await server.connect(transport);
          await transport.handleRequest(request, response, request.body);
        },
      );
    } catch (error) {
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  }
}
