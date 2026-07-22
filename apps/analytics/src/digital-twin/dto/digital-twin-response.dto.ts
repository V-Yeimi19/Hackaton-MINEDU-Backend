// digital-twin/dto/digital-twin-response.dto.ts
export interface StudentTwinSnapshot {
  studentId: string;
  attendanceRate: number;
  avgGrade: number;
  participationScore: number;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  riskReasons: string[];
  recommendations: {
    id: string;
    type: string;
    message: string;
    source: string;
    status: string;
  }[];
  lastUpdated: Date;
}

export interface ClassroomTwinResponse {
  classroomId: string;
  studentsCount: number;
  atRiskCount: number;
  students: StudentTwinSnapshot[];
}