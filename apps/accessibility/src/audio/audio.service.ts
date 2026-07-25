import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  textToSpeech(text: string): Promise<Buffer> {
    const input = text.slice(0, 4096);
    this.logger.log(`Generando audio TTS con espeak-ng (${input.length} caracteres)`);

    return new Promise((resolve, reject) => {
      const child = spawn('espeak-ng', ['-v', 'es', '-s', '150', '--stdout']);
      const chunks: Buffer[] = [];
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`espeak-ng salió con código ${code}: ${stderr}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });

      child.stdin.write(input, 'utf-8');
      child.stdin.end();
    });
  }
}
