import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') as string;
    this.client = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') as string,
      port: this.configService.get<number>('MINIO_PORT'),
      useSSL: this.configService.get<boolean>('MINIO_USE_SSL'),
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') as string,
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') as string,
    });
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket "${this.bucket}" creado`);
    }
  }

  putObject(key: string, buffer: Buffer, mimeType: string): Promise<unknown> {
    return this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
  }

  getObjectStream(key: string) {
    return this.client.getObject(this.bucket, key);
  }

  presignedDownloadUrl(key: string, expirySeconds = 300): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  removeObject(key: string): Promise<void> {
    return this.client.removeObject(this.bucket, key);
  }
}
