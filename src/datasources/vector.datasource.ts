import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class VectorDataSource implements OnModuleDestroy {
  private readonly logger = new Logger(VectorDataSource.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      host: config.get<string>('VECTOR_DB_HOST', '127.0.0.1'),
      port: config.get<number>('VECTOR_DB_PORT', 5432),
      user: config.get<string>('VECTOR_DB_USER', 'postgres'),
      password: config.get<string>('VECTOR_DB_PASSWORD', ''),
      database: config.get<string>('VECTOR_DB_NAME', 'novel_vectors'),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    this.pool.on('error', (error) =>
      this.logger.error(`Vector database pool error: ${error.message}`),
    );
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
