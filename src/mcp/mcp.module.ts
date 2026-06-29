import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { ToolRegistry } from './tool-registry';

@Module({
  controllers: [McpController],
  providers: [McpServerFactory, ToolRegistry],
})
export class McpModule {}
