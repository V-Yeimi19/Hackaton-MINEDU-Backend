import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'al', 'un', 'una', 'uno',
  'y', 'o', 'que', 'en', 'con', 'por', 'para', 'se', 'no', 'es',
  'su', 'a', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'este',
  'ha', 'sí', 'porque', 'esta', 'son', 'entre', 'cuando', 'muy',
  'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien',
  'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni',
  'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto',
  'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras',
  'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada',
  'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algo',
]);

const ARASAAC_URL = 'https://api.arasaac.org/api';
const MAX_PICTOGRAMS = 10;

interface ArasaacPictogram {
  _id: number;
  keywords: { keyword: string }[];
}

export interface PictogramEntry {
  keyword: string;
  arasaacId: number;
  imageUrl: string;
}

@Injectable()
export class PictogramService {
  private readonly logger = new Logger(PictogramService.name);

  constructor(private readonly http: HttpService) {}

  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-záéíóúñü\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PICTOGRAMS)
      .map(([word]) => word);
  }

  async fetchPictograms(text: string): Promise<PictogramEntry[]> {
    const keywords = this.extractKeywords(text);
    const results: PictogramEntry[] = [];

    for (const keyword of keywords) {
      try {
        const { data } = await firstValueFrom(
          this.http.get<ArasaacPictogram[]>(
            `${ARASAAC_URL}/pictograms/es/search/${encodeURIComponent(keyword)}`,
          ),
        );

        if (data.length > 0) {
          const best = data[0];
          results.push({
            keyword,
            arasaacId: best._id,
            imageUrl: `${ARASAAC_URL}/pictograms/${best._id}`,
          });
        }
      } catch (err) {
        this.logger.warn(`No se encontraron pictogramas para la palabra "${keyword}"`);
      }
    }

    return results;
  }
}
