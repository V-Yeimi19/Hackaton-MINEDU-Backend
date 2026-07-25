function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    ',' +
    String(ms).padStart(3, '0')
  );
}

const CHARS_PER_SECOND = 15;

export function estimateSpeechDuration(text: string): number {
  return Math.max(1, text.length / CHARS_PER_SECOND);
}

export function generateSrt(text: string, durationSeconds: number): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) {
    return '1\n00:00:00,000 --> 00:00:01,000\n' + text + '\n';
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  let currentTime = 0;

  return sentences
    .map((sentence, i) => {
      const proportion = sentence.length / totalChars;
      const segmentDuration = durationSeconds * proportion;
      const start = currentTime;
      const end = Math.min(currentTime + segmentDuration, durationSeconds);
      currentTime = end;

      return `${i + 1}\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\n${sentence}`;
    })
    .join('\n\n');
}
