import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsEmail,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Banner } from '../../entities/banner.entity';
import { Book } from '../../entities/book.entity';
import { Category } from '../../entities/category.entity';
import { Chapter } from '../../entities/chapter.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

class AdminLoginDto {
  @IsString()
  @MaxLength(50)
  phone: string;

  @IsString()
  @MaxLength(128)
  password: string;
}

class CreateBannerDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(255)
  imageUrl: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3])
  linkType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkTarget?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsDateString()
  startAt?: string | null;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;
}

class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3])
  linkType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkTarget?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsDateString()
  startAt?: string | null;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;
}

class CreateBookDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  coverUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  chapterCount?: number;

  @IsOptional()
  @IsIn([1, 2])
  status?: number;

  @IsOptional()
  @IsIn([0, 1])
  isVip?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerChapter?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeChapters?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}

class UpdateBookDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  coverUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  chapterCount?: number;

  @IsOptional()
  @IsIn([1, 2])
  status?: number;

  @IsOptional()
  @IsIn([0, 1])
  isVip?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerChapter?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeChapters?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}

class CreateChapterDto {
  @IsInt()
  @Min(1)
  bookId: number;

  @IsInt()
  @Min(1)
  chapterNum: number;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number;

  @IsOptional()
  @IsIn([0, 1])
  isFree?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}

class UpdateChapterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  bookId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  chapterNum?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number;

  @IsOptional()
  @IsIn([0, 1])
  isFree?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}

class BatchChapterDto {
  @IsInt()
  @Min(1)
  chapterNum: number;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number;
}

class BatchCreateChaptersDto {
  @IsInt()
  @Min(1)
  bookId: number;

  @IsOptional()
  @IsIn([0, 1])
  isFree?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchChapterDto)
  chapters: BatchChapterDto[];
}

class UpdateUserVipDto {
  @IsInt()
  @Min(0)
  @Max(5)
  vipLevel: number;
}

class UpdateAdminSettingsDto {
  @IsString()
  @MaxLength(100)
  siteName: string;

  @IsString()
  @MaxLength(50)
  contact: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(30)
  version: string;
}

class CreateCategoryDto {
  @IsString()
  @MaxLength(30)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  login(@Body() body: AdminLoginDto) {
    return this.adminService.login(body.phone, body.password);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  users() {
    return this.adminService.users();
  }

  @Patch('users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  toggleUserStatus(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleUserStatus(id);
  }

  @Patch('users/:id/vip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateUserVip(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserVipDto,
  ) {
    return this.adminService.updateUserVip(id, body.vipLevel);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  orders() {
    return this.adminService.orders();
  }

  @Get('comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  comments() {
    return this.adminService.comments();
  }

  @Patch('comments/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  toggleCommentStatus(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleCommentStatus(id);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  settings() {
    return this.adminService.settings();
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateSettings(@Body() body: UpdateAdminSettingsDto) {
    return this.adminService.updateSettings(body);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  stats() {
    return this.adminService.stats();
  }

  @Get(['books', 'book', 'books/list', 'book/list'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  books() {
    return this.adminService.books();
  }

  @Get(['books/:id', 'book/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  book(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.book(id);
  }

  @Post(['books', 'book', 'books/create', 'book/create'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createBook(@Body() body: CreateBookDto) {
    return this.adminService.createBook(this.toBookInput(body));
  }

  @Put([
    'books/:id',
    'book/:id',
    'books/update/:id',
    'book/update/:id',
  ])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateBook(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBookDto,
  ) {
    return this.adminService.updateBook(id, this.toBookInput(body));
  }

  @Delete([
    'books/:id',
    'book/:id',
    'books/delete/:id',
    'book/delete/:id',
  ])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteBook(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteBook(id);
  }

  @Get(['chapters', 'chapter', 'chapters/list', 'chapter/list'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  chapters() {
    return this.adminService.chapters();
  }

  @Get(['chapters/:id', 'chapter/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  chapter(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.chapter(id);
  }

  @Post(['chapters', 'chapter', 'chapters/create', 'chapter/create'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createChapter(@Body() body: CreateChapterDto) {
    return this.adminService.createChapter(this.toChapterInput(body));
  }

  @Post('chapters/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createChaptersBatch(@Body() body: BatchCreateChaptersDto) {
    return this.adminService.createChaptersBatch(
      body.bookId,
      body.isFree ?? 1,
      body.chapters,
    );
  }

  @Put([
    'chapters/:id',
    'chapter/:id',
    'chapters/update/:id',
    'chapter/update/:id',
  ])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateChapter(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateChapterDto,
  ) {
    return this.adminService.updateChapter(id, this.toChapterInput(body));
  }

  @Delete([
    'chapters/:id',
    'chapter/:id',
    'chapters/delete/:id',
    'chapter/delete/:id',
  ])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteChapter(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteChapter(id);
  }

  @Get(['categories', 'category', 'categories/list', 'category/list'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  categories() {
    return this.adminService.categories();
  }

  @Get(['categories/:id', 'category/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  category(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.category(id);
  }

  @Post(['categories', 'category', 'categories/create', 'category/create'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.adminService.createCategory(body);
  }

  @Put([
    'categories/:id',
    'category/:id',
    'categories/update/:id',
    'category/update/:id',
  ])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @Delete([
    'categories/:id',
    'category/:id',
    'categories/delete/:id',
    'category/delete/:id',
  ])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCategory(id);
  }

  @Get(['banners', 'banner'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  banners() {
    return this.adminService.banners();
  }

  @Post(['banners', 'banner'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createBanner(@Body() body: CreateBannerDto) {
    return this.adminService.createBanner(this.toBannerInput(body));
  }

  @Put(['banners/:id', 'banner/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBannerDto,
  ) {
    return this.adminService.updateBanner(id, this.toBannerInput(body));
  }

  @Delete(['banners/:id', 'banner/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteBanner(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteBanner(id);
  }

  private toBannerInput(
    body: CreateBannerDto | UpdateBannerDto,
  ): Partial<Banner> {
    return {
      ...body,
      startAt:
        body.startAt == null ? body.startAt : new Date(body.startAt),
      endAt: body.endAt == null ? body.endAt : new Date(body.endAt),
    };
  }

  private toBookInput(
    body: CreateBookDto | UpdateBookDto,
  ): Partial<Book> {
    return {
      ...body,
      publishedAt:
        body.publishedAt == null ? body.publishedAt : new Date(body.publishedAt),
    };
  }

  private toChapterInput(
    body: CreateChapterDto | UpdateChapterDto,
  ): Partial<Chapter> {
    return {
      ...body,
      publishedAt:
        body.publishedAt == null ? body.publishedAt : new Date(body.publishedAt),
    };
  }
}
