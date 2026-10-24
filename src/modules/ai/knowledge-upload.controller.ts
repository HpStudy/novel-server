import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const documentTypes = new Map([
  ['text/plain', 'txt'],
  ['text/markdown', 'md'],
  ['application/pdf', 'pdf'],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'docx',
  ],
]);

@Controller('api/admin/ai/knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class KnowledgeUploadController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('请选择知识库文件');
    }
    const extension = documentTypes.get(file.mimetype);
    const originalExtension = file.originalname
      .slice(file.originalname.lastIndexOf('.') + 1)
      .toLowerCase();
    if (!extension || extension !== originalExtension) {
      throw new BadRequestException('仅支持 TXT、MD、PDF 或 DOCX 文件');
    }

    const directory = join(process.cwd(), 'uploads', 'knowledge');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(directory, filename), file.buffer, { flag: 'wx' });
    return {
      fileUrl: `/api/admin/ai/knowledge/files/${filename}`,
      filename,
      size: file.buffer.byteLength,
    };
  }
}
