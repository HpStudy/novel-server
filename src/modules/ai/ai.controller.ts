import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiConversationService } from './conversation.service';
import { RagService } from './rag.service';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';

class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  source?: string;
}

class ChatDto {
  @IsInt()
  @Min(1)
  conversationId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  clientMsgId: string;
}

class FeedbackDto {
  @IsInt()
  @IsIn([0, 1])
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
}

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly conversations: AiConversationService,
    private readonly rag: RagService,
  ) {}

  @Post('session')
  @UseGuards(RateLimitGuard)
  @RateLimit('ai-session', 20)
  createSession(
    @Req() req: Request & { user: { id: number } },
    @Body() body: CreateConversationDto,
  ) {
    return this.conversations.create(req.user.id, body.source ?? 'home');
  }

  @Get('session/:id')
  getSession(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.conversations.get(id, req.user.id);
  }

  @Get('session/:id/messages')
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.conversations.messagesForUser(
      id,
      req.user.id,
      this.pageValue(page, 1),
      this.pageValue(pageSize, 20, 100),
    );
  }

  @Post('chat')
  @UseGuards(RateLimitGuard)
  @RateLimit('ai-chat', 10)
  async chat(
    @Req() req: Request & { user: { id: number } },
    @Body() body: ChatDto,
    @Res() response: Response,
  ) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    req.once('aborted', abort);
    response.once('close', () => {
      if (!response.writableEnded) {
        abort();
      }
    });
    await this.rag.chat(req.user.id, body, response, controller.signal);
  }

  @Post('session/:id/transfer')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.conversations.transfer(id, req.user.id);
  }

  @Post('session/:id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.conversations.close(id, req.user.id);
  }

  @Post('message/:id/feedback')
  feedback(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
    @Body() body: FeedbackDto,
  ) {
    return this.conversations.feedback(
      id,
      req.user.id,
      body.rating,
      body.comment,
    );
  }

  private pageValue(value: string | undefined, fallback: number, max = 100) {
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed >= 1
      ? Math.min(parsed, max)
      : fallback;
  }
}
