import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly client: ElevenLabsClient;

  constructor(private config: ConfigService) {
    this.client = new ElevenLabsClient({
      apiKey: this.config.get<string>('ELEVENLABS_API_KEY'),
    });
  }

  async textToSpeech(text: string): Promise<Buffer> {
    const input = text.slice(0, 4096);
    this.logger.log(`Generando audio TTS con ElevenLabs (${input.length} caracteres)`);

    const voiceId = this.config.get<string>('ELEVENLABS_VOICE_ID') ?? 'JBFqnCBsd6RMkjVDRZzb';
    const audioStream = await this.client.textToSpeech.convert(voiceId, {
      text: input,
      modelId: 'eleven_multilingual_v2',
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
      },
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
