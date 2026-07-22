// recommendation/recommendation.rules.ts
export function buildRecommendation(reasons: string[]): { type: string; message: string } {
  if (reasons.includes('attendance_below_threshold')) {
    return {
      type: 'teacher_alert',
      message: 'Estudiante con asistencia por debajo del 80%. Considerar contacto con familia.',
    };
  }
  if (reasons.includes('grade_below_threshold')) {
    return {
      type: 'differentiated_activity',
      message: 'Proponer actividad de refuerzo diferenciada según competencia más débil.',
    };
  }
  if (reasons.includes('attendance_below_threshold') && reasons.includes('grade_below_threshold')) {
    return {
      type: 'teacher_alert',
      message: 'Estudiante con asistencia y calificación por debajo del umbral. Considerar contacto con familia y actividad de refuerzo.',
    };
  }
  if (reasons.includes('suspicion_neurodivergence')) {
    return {
      type: 'teacher_alert',
      message: 'Estudiante con sospecha de neurodivergencia. Considerar contacto con familia y estrategias de apoyo.',
    };
  }
  return { type: 'general_alert', message: 'Revisar progreso del estudiante.' };
}