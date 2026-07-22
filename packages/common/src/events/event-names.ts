export const EVENTS = {
  USER_CREATED: 'user.created',
  
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

  // Analytics
  INDICATOR_CALCULATED: 'indicator.calculated',
  DIGITAL_TWIN_UPDATED: 'digital-twin.updated',
  RISK_DETECTED: 'risk.detected',
  RISK_UPDATED: 'risk.updated',
  LAG_DETECTED: 'lag.detected', // rezago
  RECOMMENDATION_GENERATED: 'recommendation.generated',

  // IA Services
  CHAT_MESSAGE_SENT: 'chat.message.sent',
  CHAT_RESPONSE_GENERATED: 'chat.response.generated',
  EMBEDDING_CREATED: 'embedding.created',
  AI_RECOMMENDATION_GENERATED: 'ai.recommendation.generated',
  AI_COST_TRACKED: 'ai.cost.tracked',

  // Accesibility
  CONTENT_UPLOAD_REQUESTED: 'content.upload.requested',
  CONTENT_OCR_COMPLETED: 'content.ocr.completed',
  CONTENT_ADAPTED: 'content.adapted',  // lectura fácil / resumen
  CONTENT_AUDIO_GENERATED: 'content.audio.generated',
  CONTENT_PICTOGRAM_GENERATED: 'content.pictogram.generated',
  CONTENT_SIGNLANGUAGE_GENERATED: 'content.signlanguage.generated',
  CONTENT_SUBTITLE_GENERATED: 'content.subtitle.generated',
  ACCESSIBILITY_PIPELINE_COMPLETED: 'accessibility.pipeline.completed',

} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
