import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.log(`Iniciando OCR para tipo: ${mimeType}`);

    const worker = await createWorker('spa+eng');

    try {
      const { data } = await worker.recognize(buffer);
      this.logger.log(`OCR completado: ${data.text.length} caracteres extraidos`);
      return data.text;
    } catch (err) {
      this.logger.error('Error en OCR', err);
      throw new Error('Fallo en la extraccion de texto con OCR');
    } finally {
      await worker.terminate();
    }
  }

  needsOcr(mimeType: string): boolean {
    const ocrTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/tiff',
    ];
    return ocrTypes.includes(mimeType);
  }
}
