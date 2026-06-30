import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { DevelopmentPlaygroundService } from './development-playground.service';
import { developmentPlaygroundHtml } from './development-playground.html';

type PlaygroundMessageBody = {
  message?: string;
};

@Controller('development/playground')
export class DevelopmentPlaygroundController {
  constructor(
    private readonly playgroundService: DevelopmentPlaygroundService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getPlayground(): string {
    return developmentPlaygroundHtml;
  }

  @Post('start')
  async startConversation() {
    return this.playgroundService.startConversation();
  }

  @Post('message')
  async continueConversation(@Body() body: PlaygroundMessageBody) {
    return this.playgroundService.continueConversation(body.message ?? '');
  }
}
