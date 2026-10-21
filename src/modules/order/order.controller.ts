import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';

class CreateOrderDto {
  @IsInt()
  @Min(1)
  type: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bookId?: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coins?: number;
}

class NotifyDto {
  @IsString()
  @MaxLength(32)
  orderNo: string;
}

@Controller('api/order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  create(@Req() req: Request & { user: any }, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(req.user.id, dto);
  }

  @Post('notify')
  notify(@Body() dto: NotifyDto) {
    return this.orderService.notify(dto.orderNo);
  }

  @Get('list')
  list(@Req() req: Request & { user: any }) {
    return this.orderService.findByUser(req.user.id);
  }
}
