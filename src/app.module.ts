import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ConversationModule } from './conversation/conversation.module';
import { DevelopmentModule } from './development/development.module';
import { MemoryModule } from './memory/memory.module';
import { MessagesModule } from './messages/messages.module';
import { McpModule } from './mcp/mcp.module';
import { ProfileModule } from './profile/profile.module';
import { StateModule } from './state/state.module';
import { StrategyModule } from './strategy/strategy.module';

const developmentModules =
  process.env.ENABLE_DEVELOPMENT_PLAYGROUND === 'true'
    ? [DevelopmentModule]
    : [];

@Module({
  imports: [
    ConversationModule,
    ProfileModule,
    MemoryModule,
    StateModule,
    StrategyModule,
    MessagesModule,
    ConfigModule,
    McpModule,
    ...developmentModules,
  ],
})
export class AppModule {}
