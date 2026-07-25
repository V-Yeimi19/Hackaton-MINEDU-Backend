// recommendation/recommendation.rules.ts
export function buildRecommendation(reasons: string[]): { type: string; message: string } {
  const hasAttendance = reasons.includes('attendance_below_threshold');
  const hasGrade = reasons.includes('grade_below_threshold');
  const hasNeuro = reasons.includes('suspicion_neurodivergence');

  if (hasAttendance && hasGrade) {
    return {
      type: 'urgent_intervention',
      message: 'Estudiante con asistencia y calificación por debajo del umbral. Considerar contacto con familia y actividad de refuerzo.',
    };
  }
  if (hasAttendance) {
    return {
      type: 'teacher_alert',
      message: 'Estudiante con asistencia por debajo del 80%. Considerar contacto con familia.',
    };
  }
  if (hasGrade) {
    return {
      type: 'differentiated_activity',
      message: 'Proponer actividad de refuerzo diferenciada según competencia más débil.',
    };
  }
  if (hasNeuro) {
    return {
      type: 'teacher_alert',
      message: 'Estudiante con sospecha de neurodivergencia. Considerar contacto con familia y estrategias de apoyo.',
    };
  }
  return { type: 'general_alert', message: 'Revisar progreso del estudiante.' };
}