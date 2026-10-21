import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite])],
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
