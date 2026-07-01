import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { memoryCategorizeHtml } from './memory-categorize.html';
import { MemoryService } from './memory.service';

type CategorizeMemoryBody = {
  text?: string;
};

@Controller('api/memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('categorize')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getCategorizeDebugUi(): string {
    return memoryCategorizeHtml;
  }

  @Post('categorize')
  async categorizeMemory(@Body() body: CategorizeMemoryBody) {
    return this.memoryService.categorize(body.text ?? '');
  }
}
