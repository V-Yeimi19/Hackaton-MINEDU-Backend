// risk/risk.rules.ts
export const RISK_THRESHOLDS = {
  ATTENDANCE_LOW: 0.8,
  ATTENDANCE_CRITICAL: 0.6,
  GRADE_LOW: 11,
  GRADE_CRITICAL: 8,
};

export function calculateRiskLevel(indicator: {
  attendanceRate: number;
  avgGrade: number;
}): { level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'; reasons: string[] } {
  const reasons: string[] = [];
  let severity = 0;

  if (indicator.attendanceRate < RISK_THRESHOLDS.ATTENDANCE_LOW) {
    reasons.push('attendance_below_threshold');
    severity += indicator.attendanceRate < RISK_THRESHOLDS.ATTENDANCE_CRITICAL ? 2 : 1;
  }
  if (indicator.avgGrade < RISK_THRESHOLDS.GRADE_LOW) {
    reasons.push('grade_below_threshold');
    severity += indicator.avgGrade < RISK_THRESHOLDS.GRADE_CRITICAL ? 2 : 1;
  }

  if (reasons.length === 0) return { level: 'NONE', reasons };
  if (severity === 1) return { level: 'LOW', reasons };
  if (severity === 2) return { level: 'MEDIUM', reasons };
  return { level: 'HIGH', reasons };
}
