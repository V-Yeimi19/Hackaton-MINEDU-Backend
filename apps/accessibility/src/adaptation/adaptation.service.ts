import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SupportNeedEntry, WorksheetContent } from '../pipeline/worksheet.types';

const SUPPORT_NEED_GUIDANCE: Record<string, string> = {
  DISCAPACIDAD_VISUAL:
    'Prioriza descripciones textuales explícitas y detalladas; no dependas de que el estudiante vea una imagen para entender el ejercicio.',
  DISCAPACIDAD_AUDITIVA:
    'No asumas ninguna referencia auditiva (sonidos, música, "escucha"); todo debe poder entenderse solo con texto e imágenes.',
  DISCAPACIDAD_INTELECTUAL:
    'Usa oraciones muy cortas y una sola idea por ejercicio; evita instrucciones con más de un paso a la vez.',
  DISCAPACIDAD_MOTORA:
    'Prefiere ejercicios de opción múltiple o verdadero/falso sobre ejercicios que requieran escribir mucho texto.',
  TRASTORNO_ESPECTRO_AUTISTA:
    'Usa instrucciones literales y explícitas; evita lenguaje figurado, sarcasmo, dobles sentidos o ambigüedad.',
  DIFICULTAD_APRENDIZAJE:
    'Usa vocabulario simple y repite la idea principal en cada ejercicio para reforzar la comprensión.',
  TDAH: 'Usa ejercicios cortos y variados; evita bloques largos de texto seguido.',
  MULTIDISCAPACIDAD: 'Combina varias de las pautas anteriores según corresponda; prioriza simplicidad ante todo.',
  OTRO: 'Adapta el contenido priorizando claridad y simplicidad.',
};

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

  async generateWorksheet(
    text: string,
    level: string,
    supportNeeds: SupportNeedEntry[],
  ): Promise<WorksheetContent> {
    this.logger.log(`Generando ficha didáctica (nivel: ${level}, necesidades: ${supportNeeds.length})`);

    const guidance = supportNeeds.length
      ? supportNeeds
          .map((need) => `- ${need.type} (${need.level}): ${SUPPORT_NEED_GUIDANCE[need.type] ?? SUPPORT_NEED_GUIDANCE.OTRO}`)
          .join('\n')
      : null;

    const response = await this.openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en diseñar fichas didácticas de lectura fácil para estudiantes de Educación Básica Especial. A partir de un texto ya adaptado, generas una ficha con título, instrucciones breves y entre 3 y 5 ejercicios (tipos posibles: "opcion_multiple", "verdadero_falso", "completar"). Responde ÚNICAMENTE con JSON válido con esta forma exacta: {"title": string, "instructions": string, "exercises": [{"type": string, "prompt": string, "options"?: string[], "answer"?: string}]}. No agregues texto fuera del JSON.${
            guidance
              ? `\n\nEste estudiante tiene las siguientes necesidades de apoyo — ajusta los ejercicios a ellas:\n${guidance}`
              : ''
          }`,
        },
        {
          role: 'user',
          content: `Genera la ficha a partir de este texto (nivel de adaptación: ${level}):\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content ?? '';
    try {
      const parsed = JSON.parse(raw) as WorksheetContent;
      if (!parsed.title || !Array.isArray(parsed.exercises)) {
        throw new Error('Estructura de ficha inválida');
      }
      return parsed;
    } catch (err) {
      this.logger.warn(`No se pudo parsear la ficha como JSON, usando fallback de texto plano`, err);
      return {
        title: 'Ficha de lectura',
        instructions: 'Lee el siguiente texto.',
        exercises: [{ type: 'texto', prompt: raw || text }],
      };
    }
  }
}
