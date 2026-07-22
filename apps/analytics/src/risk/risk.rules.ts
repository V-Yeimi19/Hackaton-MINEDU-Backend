// risk/risk.rules.ts
export const RISK_THRESHOLDS = {
  ATTENDANCE_LOW: 0.8,   // < 80% asistencia
  GRADE_LOW: 11,          // escala vigesimal
};

export function calculateRiskLevel(indicator: {
  attendanceRate: number;
  avgGrade: number;
}): { level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'; reasons: string[] } {
  const reasons: string[] = [];

  if (indicator.attendanceRate < RISK_THRESHOLDS.ATTENDANCE_LOW) {
    reasons.push('attendance_below_threshold');
  }
  if (indicator.avgGrade < RISK_THRESHOLDS.GRADE_LOW) {
    reasons.push('grade_below_threshold');
  }

  if (reasons.length === 0) return { level: 'NONE', reasons };
  if (reasons.length === 1) return { level: 'LOW', reasons };
  return { level: 'HIGH', reasons };
}