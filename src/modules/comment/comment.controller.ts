import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentService } from './comment.service';

class AddCommentDto {
  @IsInt()
  @Min(1)
  bookId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  chapterId?: number;

  @IsString()
  @MaxLength(500)
  content: string;
}

@Controller('api/comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('list/:bookId')
  list(@Param('bookId') bookId: string) {
    return this.commentService.findByBookId(Number(bookId));
  }

  @Post('add')
  @UseGuards(JwtAuthGuard)
  add(@Req() req: Request & { user: any }, @Body() dto: AddCommentDto) {
    return this.commentService.addComment(req.user.id, dto);
  }

  @Post('like/:id')
  like(@Param('id') id: string) {
    return this.commentService.likeComment(Number(id));
  }
}
