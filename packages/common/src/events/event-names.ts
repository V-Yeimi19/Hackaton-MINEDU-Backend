export const EVENTS = {
  USER_CREATED: 'user.created',
  USER_ROLE_CHANGED: 'user.role_changed',

  // Classroom
  COURSE_CREATED: 'course.created',
  CLASSROOM_CREATED: 'classroom.created',
  CLASSROOM_UPDATED: 'classroom.updated',
  STUDENT_ENROLLED: 'student.enrolled',
  STUDENT_UNENROLLED: 'student.unenrolled',
  ATTENDANCE_REGISTERED: 'attendance.registered',
  ATTENDANCE_UPDATED: 'attendance.updated',
  ATTENDANCE_BATCH_REGISTERED: 'attendance.batch.registered',
  GRADE_REGISTERED: 'grade.registered',
  GRADE_UPDATED: 'grade.updated',
  COMPETENCY_EVALUATED: 'competency.evaluated',

  // Invitation / Enrollment
  INVITATION_CREATED: 'invitation.created',
  INVITATION_ACCEPTED: 'invitation.accepted',
  STUDENT_CREATED: 'student.created',
  ENROLLMENT_CREATED: 'enrollment.created',

  // Analytics
  RISK_DETECTED: 'risk.detected',

  // Accessibility
  ACCESSIBILITY_PIPELINE_COMPLETED: 'accessibility.pipeline.completed',

} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
