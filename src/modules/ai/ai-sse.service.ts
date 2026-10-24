import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class AiSseService {
  start(response: Response) {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
  }

  send(response: Response, event: string, data: unknown) {
    if (response.writableEnded || response.destroyed) {
      return;
    }
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  close(response: Response) {
    if (!response.writableEnded) {
      response.end();
    }
  }
}
