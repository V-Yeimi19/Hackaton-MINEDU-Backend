import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AdaptationService {
  private readonly logger = new Logger(AdaptationService.name);
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('GROQ_API_KEY'),
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async generateEasyRead(text: string, level: string): Promise<string> {
    this.logger.log(`Generando lectura facil (nivel: ${level})`);

    const levelInstructions: Record<string, string> = {
      LEVE: 'Simplifica ligeramente el texto. Usa oraciones un poco mas cortas y vocabulario mas directo.',
      MODERADO: 'Simplifica el texto significativamente. Usa oraciones cortas, vocabulario simple, evita metáforas y lenguaje figurado.',
      SIGNIFICATIVO: 'Reescribe el texto en el nivel mas simple posible. Oraciones muy cortas, vocabulario basico, frases simples sin conectores complejos.',
    };

    const instruction = levelInstructions[level] ?? levelInstructions.MODERADO;

    const response = await this.openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en adaptar textos para personas con discapacidad cognitiva o dificultades de lectura. Sigue las guias de "Lectura Facil" / "Plain Language". ${instruction} Mantén el significado original. No agregues información que no esté en el texto.`,
        },
        {
          role: 'user',
          content: `Adapta el siguiente texto a lectura facil:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    return response.choices[0].message.content ?? text;
  }

  async generateSummary(text: string): Promise<string> {
    this.logger.log('Generando resumen del contenido');

    const response = await this.openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en crear resúmenes concisos y claros. Resume el siguiente texto manteniendo los puntos clave. Usa un lenguaje claro y directo.',
        },
        {
          role: 'user',
          content: `Resume el siguiente texto:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content ?? text;
  }
}
