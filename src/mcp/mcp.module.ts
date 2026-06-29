import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { ToolRegistry } from './tool-registry';

@Module({
  imports: [ConversationModule],
  controllers: [McpController],
  providers: [McpServerFactory, ToolRegistry],
})
export class McpModule {}
