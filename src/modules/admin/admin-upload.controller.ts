import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const uploadDirectory = join(process.cwd(), 'uploads');
const imageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

@Controller('api/admin')
export class AdminUploadController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile()
    file?: { buffer: Buffer; mimetype: string },
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }
    const extension = imageTypes.get(file.mimetype);
    if (!extension) {
      throw new BadRequestException('仅支持 JPG、PNG、WebP 或 GIF 图片');
    }

    await mkdir(uploadDirectory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(uploadDirectory, filename), file.buffer, { flag: 'wx' });
    return { url: `/api/admin/uploads/${filename}` };
  }

  @Get('uploads/:filename')
  async getImage(
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(filename)) {
      throw new NotFoundException('图片不存在');
    }

    const path = join(uploadDirectory, filename);
    if (!existsSync(path)) {
      throw new NotFoundException('图片不存在');
    }
    const image = await readFile(path);
    const extension = filename.split('.').pop()!;
    const contentType = [...imageTypes].find(([, value]) => value === extension)?.[0];
    if (!contentType) {
      throw new NotFoundException('图片不存在');
    }

    response
      .set('Content-Type', contentType)
      .set('Cache-Control', 'public, max-age=31536000, immutable')
      .send(image);
  }
}
