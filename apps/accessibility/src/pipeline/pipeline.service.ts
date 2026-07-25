import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { OcrService } from '../ocr/ocr.service';
import { AdaptationService } from '../adaptation/adaptation.service';
import { AudioService } from '../audio/audio.service';
import { ProcessContentDto, AdaptationLevel } from './dto/pipeline.dto';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PictogramService } from './pictogram.service';
import { generateSrt, getAudioDurationFromWav } from './srt.util';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private prisma: PrismaService,
    private ocr: OcrService,
    private adaptation: AdaptationService,
    private audio: AudioService,
    private pubsub: RedisPubSubService,
    private config: ConfigService,
    private http: HttpService,
    private pictogram: PictogramService,
  ) {}

  private get storageUrl() {
    return this.config.get<string>('STORAGE_SERVICE_INTERNAL_URL');
  }

  private get internalKey() {
    return this.config.get<string>('INTERNAL_API_KEY');
  }

  private async downloadFile(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
    this.logger.log(`Descargando archivo ${fileId} desde Storage...`);

    const { data: fileInfo } = await firstValueFrom(
      this.http.get(`${this.storageUrl}/internal/${fileId}`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );

    const { data: urlData } = await firstValueFrom(
      this.http.get(`${this.storageUrl}/internal/${fileId}/download-url`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );

    const response = await firstValueFrom(
      this.http.get(urlData.url, { responseType: 'arraybuffer' }),
    );

    return {
      buffer: Buffer.from(response.data),
      contentType: fileInfo.mimeType,
    };
  }

  private async uploadToStorage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.storageUrl}/internal/upload`,
          {
            buffer: buffer.toString('base64'),
            originalName,
            mimeType,
          },
          { headers: { 'x-internal-key': this.internalKey } },
        ),
      );
      return data.id as string;
    } catch (err) {
      this.logger.warn(`Fallo subiendo ${originalName} a Storage`, err);
      return null;
    }
  }

  async process(dto: ProcessContentDto) {
    const job = await this.prisma.accessibilityJob.create({
      data: {
        fileId: dto.fileId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        adaptationLevel: dto.adaptationLevel as AdaptationLevel,
        status: 'PROCESSING',
      },
    });

    this.logger.log(`Job ${job.id} iniciado para archivo: ${dto.fileName}`);

    try {
      let originalText = '';

      const { buffer, contentType } = await this.downloadFile(dto.fileId);

      if (this.ocr.needsOcr(contentType)) {
        this.logger.log(`[${job.id}] Ejecutando OCR...`);
        originalText = await this.ocr.extractText(buffer, contentType);
      } else if (contentType.includes('text')) {
        originalText = buffer.toString('utf-8');
      } else {
        originalText = 'Contenido no procesable directamente como texto';
      }

      await this.prisma.accessibilityJob.update({
        where: { id: job.id },
        data: { originalText },
      });

      this.logger.log(`[${job.id}] Generando lectura facil...`);
      const adaptedText = await this.adaptation.generateEasyRead(
        originalText,
        dto.adaptationLevel,
      );

      this.logger.log(`[${job.id}] Generando resumen...`);
      const summaryText = await this.adaptation.generateSummary(originalText);

      this.logger.log(`[${job.id}] Generando audio...`);
      const audioBuffer = await this.audio.textToSpeech(adaptedText);

      this.logger.log(`[${job.id}] Subiendo audio a Storage...`);
      const audioFileId = await this.uploadToStorage(
        audioBuffer,
        `audio-${job.id}.wav`,
        'audio/wav',
      );

      this.logger.log(`[${job.id}] Generando subtítulos...`);
      const duration = getAudioDurationFromWav(audioBuffer);
      const srtContent = generateSrt(adaptedText, duration);
      const subtitlesFileId = await this.uploadToStorage(
        Buffer.from(srtContent, 'utf-8'),
        `subtitles-${job.id}.srt`,
        'application/x-subrip',
      );

      this.logger.log(`[${job.id}] Buscando pictogramas...`);
      let pictogramData: Prisma.InputJsonValue | undefined;
      try {
        const pictograms = await this.pictogram.fetchPictograms(adaptedText);
        pictogramData = pictograms as unknown as Prisma.InputJsonValue;
      } catch (err) {
        this.logger.warn(`[${job.id}] No se pudieron obtener pictogramas`, err);
      }

      await this.prisma.accessibilityJob.update({
        where: { id: job.id },
        data: {
          adaptedText,
          summaryText,
          audioFileId,
          subtitlesFileId,
          ...(pictogramData !== undefined ? { pictogramData } : {}),
          status: 'COMPLETED',
        },
      });

      try {
        await this.pubsub.publish(EVENTS.ACCESSIBILITY_PIPELINE_COMPLETED, {
          jobId: job.id,
          fileId: dto.fileId,
          fileName: dto.fileName,
        });
      } catch {}

      this.logger.log(`Job ${job.id} completado exitosamente`);

      return {
        job: await this.prisma.accessibilityJob.findUnique({ where: { id: job.id } }),
        audioBuffer,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id} falló: ${errorMessage}`);

      await this.prisma.accessibilityJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: errorMessage },
      });

      throw err;
    }
  }

  async findOne(id: string) {
    return this.prisma.accessibilityJob.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.accessibilityJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
