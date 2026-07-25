// recommendation/recommendation.rules.ts
export function buildRecommendation(reasons: string[]): { type: string; message: string } {
  const hasAttendance = reasons.includes('attendance_below_threshold');
  const hasGrade = reasons.includes('grade_below_threshold');
  const hasCompetency = reasons.includes('competency_below_threshold');
  const hasNeuro = reasons.includes('suspicion_neurodivergence');

  const criticalCount = [hasAttendance, hasGrade, hasCompetency].filter(Boolean).length;

  if (criticalCount >= 2) {
    return {
      type: 'urgent_intervention',
      message: 'Estudiante con múltiples indicadores por debajo del umbral. Considerar contacto con familia y plan de apoyo integral.',
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
  if (hasCompetency) {
    return {
      type: 'differentiated_activity',
      message: 'Estudiante con nivel de competencia por debajo de lo esperado. Aplicar estrategias de refuerzo por competencia.',
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