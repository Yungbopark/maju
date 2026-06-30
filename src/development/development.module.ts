import { Module } from '@nestjs/common';
import { DevelopmentPlaygroundController } from './playground/development-playground.controller';
import { DevelopmentPlaygroundService } from './playground/development-playground.service';

@Module({
  controllers: [DevelopmentPlaygroundController],
  providers: [DevelopmentPlaygroundService],
})
export class DevelopmentModule {}
