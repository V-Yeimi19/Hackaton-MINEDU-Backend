import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import PDFDocument from 'pdfkit';
import { PictogramEntry } from './pictogram.service';
import { WorksheetContent } from './worksheet.types';

const logger = new Logger('WorksheetPdf');

async function downloadPictogramImage(http: HttpService, url: string): Promise<Buffer | null> {
  try {
    const response = await firstValueFrom(http.get(url, { responseType: 'arraybuffer' }));
    return Buffer.from(response.data as ArrayBuffer);
  } catch (err) {
    logger.warn(`No se pudo descargar el pictograma ${url}`, err);
    return null;
  }
}

export async function buildWorksheetPdf(
  content: WorksheetContent,
  pictograms: PictogramEntry[],
  http: HttpService,
): Promise<Buffer> {
  const pictogramImages = await Promise.all(
    pictograms.slice(0, 6).map(async (p) => ({ ...p, image: await downloadPictogramImage(http, p.imageUrl) })),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(content.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(content.instructions);
    doc.moveDown();

    const availablePictograms = pictogramImages.filter((p) => p.image);
    if (availablePictograms.length > 0) {
      doc.fontSize(14).text('Palabras clave:', { underline: true });
      doc.moveDown(0.5);
      let x = doc.x;
      const y = doc.y;
      for (const p of availablePictograms) {
        if (p.image) {
          doc.image(p.image, x, y, { width: 60, height: 60 });
          doc.fontSize(9).text(p.keyword, x, y + 62, { width: 60, align: 'center' });
        }
        x += 80;
      }
      doc.x = doc.page.margins.left;
      doc.y = y + 80;
      doc.moveDown();
    }

    content.exercises.forEach((exercise, index) => {
      doc.fontSize(13).text(`${index + 1}. ${exercise.prompt}`, { align: 'left' });
      if (exercise.options?.length) {
        exercise.options.forEach((option, optIndex) => {
          doc.fontSize(11).text(`   ${String.fromCharCode(97 + optIndex)}) ${option}`);
        });
      }
      if (exercise.type !== 'texto') {
        doc.moveDown(0.5);
        doc.fontSize(10).text('Respuesta: ______________________________');
      }
      doc.moveDown();
    });

    doc.end();
  });
}
