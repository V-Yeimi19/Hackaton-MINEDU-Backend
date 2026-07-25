export interface SupportNeedEntry {
  id: string;
  studentId: string;
  type: string;
  level: string;
  description?: string | null;
}

export interface WorksheetExercise {
  type: 'opcion_multiple' | 'verdadero_falso' | 'completar' | 'texto';
  prompt: string;
  options?: string[];
  answer?: string;
}

export interface WorksheetContent {
  title: string;
  instructions: string;
  exercises: WorksheetExercise[];
}
