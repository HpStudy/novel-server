import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  createOrder(userId: number, dto: { type: number; targetId?: number; bookId?: number; amount: number; coins?: number }) {
    const orderNo = `NO${Date.now()}${Math.random().toString().slice(2, 8)}`;
    const order = this.orderRepository.create({
      orderNo,
      userId,
      type: dto.type,
      targetId: dto.targetId,
      bookId: dto.bookId,
      amount: dto.amount,
      coins: dto.coins ?? 0,
      status: 0,
    });

    return this.orderRepository.save(order);
  }

  async notify(orderNo: string) {
    const order = await this.orderRepository.findOne({ where: { orderNo } });
    if (!order) {
      return { success: false };
    }

    order.status = 1;
    order.paidAt = new Date();
    await this.orderRepository.save(order);
    return { success: true, order };
  }

  async findByUser(userId: number) {
    return this.orderRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
