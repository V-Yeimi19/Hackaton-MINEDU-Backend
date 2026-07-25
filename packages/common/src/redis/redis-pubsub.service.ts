import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.publisher = new Redis(url);
    this.subscriber = new Redis(url);
  }

  async publish(event: string, payload: unknown): Promise<void> {
    await this.publisher.publish(event, JSON.stringify(payload));
  }

  subscribe<T = unknown>(event: string, handler: (payload: T) => void): void {
    this.subscriber.subscribe(event, (err) => {
      if (err) {
        this.logger.error(`No se pudo suscribir a "${event}": ${err.message}`);
      }
    });
    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel !== event) {
        return;
      }
      try {
        handler(JSON.parse(message) as T);
      } catch (error) {
        this.logger.error(`Error procesando evento "${event}": ${(error as Error).message}`);
      }
    });
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.publisher.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.publisher.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.publisher.get(key);
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
