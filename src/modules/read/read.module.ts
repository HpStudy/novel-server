import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadHistory } from '../../entities/read-history.entity';
import { ReadController } from './read.controller';
import { ReadService } from './read.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReadHistory])],
  controllers: [ReadController],
  providers: [ReadService],
  exports: [ReadService],
})
export class ReadModule {}
