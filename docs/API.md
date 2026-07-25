# API Completa — MINEDU Backend

Referencia definitiva para consumo desde frontend. Generada el 2026-07-25.

---

## Tabla de contenidos

1. [Información general](#1-información-general)
2. [Autenticación y roles](#2-autenticación-y-roles)
3. [Auth — `/api/auth`](#3-auth)
4. [Users — `/api/users`](#4-users)
5. [Storage — `/api/storage`](#5-storage)
6. [Notifications — `/api/notifications`](#6-notifications)
7. [Classroom — `/api/classroom`](#7-classroom)
8. [Analytics — `/api/analytics`](#8-analytics)
9. [Reports — `/api/reports`](#9-reports)
10. [AI — `/api/ai`](#10-ai)
11. [Accessibility — `/api/accessibility`](#11-accessibility)
12. [WebSocket — Notificaciones en tiempo real](#12-websocket)
13. [Eventos entre servicios](#13-eventos-entre-servicios)
14. [Mapa de integraciones](#14-mapa-de-integraciones)
15. [Flujos de usuario completos](#15-flujos-de-usuario-completos)

---

## 1. Información general

| Propiedad | Valor |
|-----------|-------|
| Base URL (desarrollo) | `http://localhost:3000` |
| Base URL (producción) | `https://<tu-dominio>` |
| Formato request body | `application/json` (excepto upload: `multipart/form-data`) |
| Formato respuesta | `application/json` |
| Rate limit | 100 requests/min por IP |
| Paginación | Query params: `page` (default 1), `limit` (default 20, max 100) |

### Headers estándar

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Convención de errores

```json
{
  "statusCode": 400,
  "message": ["mensaje de error"],
  "error": "Bad Request"
}
```

Los códigos de error comunes:
- `400` — Validación de DTO fallida
- `401` — JWT faltante o inválido
- `403` — Rol insuficiente o no es el dueño del recurso
- `404` — Recurso no encontrado
- `409` — Conflicto (duplicado, estado inválido)
- `429` — Rate limit excedido

---

## 2. Autenticación y roles

### Roles disponibles

| Rol | Descripción | Permisos principales |
|-----|-------------|---------------------|
| `ADMIN` | Super-administrador | Acceso total a todos los servicios y datos |
| `DIRECTIVO` | Director de institución educativa | Crea IE, invita docentes, ve reportes institucionales |
| `DOCENTE` | Docente de aula | Crea aulas/cursos, registra asistencia/notas, invita familias |
| `FAMILIAR` | Padre/madre de familia | Registra hijos, acepta invitaciones, ve datos de sus hijos |

### Flujo de autenticación

```
1. POST /api/auth/register  →  { accessToken, user }
2. POST /api/auth/login     →  { accessToken, user }
3. Usar accessToken como Bearer token en todas las requests
4. El Gateway verifica el JWT antes de proxyar al servicio
5. Cada servicio re-verifica el JWT internamente (defensa en profundidad)
```

### Registro

```typescript
// POST /api/auth/register (PÚBLICO — no necesita token)
// Request
{
  email: string;      // formato email
  password: string;   // mínimo 8 caracteres
  fullName: string;   // nombre completo
  role: "ADMIN" | "DIRECTIVO" | "DOCENTE" | "FAMILIAR";
}

// Response
{
  accessToken: string;    // JWT
  user: {
    id: string;           // UUID
    email: string;
    fullName: string;
    role: string;
    createdAt: string;    // ISO date
  }
}
```

### Login

```typescript
// POST /api/auth/login (PÚBLICO)
// Request
{
  email: string;
  password: string;
}

// Response
{
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    createdAt: string;
  }
}
```

### Cambio de rol (solo ADMIN)

```typescript
// PATCH /api/auth/:authUserId/role
// Requiere: Bearer token de ADMIN
// Request
{
  role: "ADMIN" | "DIRECTIVO" | "DOCENTE" | "FAMILIAR";
}

// Response: AuthUser actualizado
// Efecto colateral: el JWT anterior del usuario deja de funcionar (debe hacer login de nuevo)
```

---

## 3. Auth

**Ruta base**: `/api/auth`
**Puerto interno**: 3001
**Acceso**: Público (el prefijo `auth` no requiere JWT en el Gateway)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/register` | Público | `{ email, password, fullName, role }` | `{ accessToken, user }` |
| `POST` | `/login` | Público | `{ email, password }` | `{ accessToken, user }` |
| `PATCH` | `/:authUserId/role` | ADMIN | `{ role }` | `AuthUser` |
| `POST` | `/internal/register` | Internal (x-internal-key) | `{ email, password, fullName, role }` | `AuthUser` |

---

## 4. Users

**Ruta base**: `/api/users`
**Puerto interno**: 3002

| Método | Ruta | Acceso | Body/Query | Response |
|--------|------|--------|------------|----------|
| `GET` | `/` | ADMIN, DIRECTIVO | `?role=&page=&limit=` | Paginated `User[]` |
| `GET` | `/:id` | Self o ADMIN/DIRECTIVO | — | `User` |
| `PATCH` | `/:id` | Self o ADMIN/DIRECTIVO | `{ fullName? }` | `User` |
| `DELETE` | `/:id` | ADMIN, DIRECTIVO | — | `{ deleted: true }` |
| `POST` | `/internal` | Internal | `{ authUserId, email, fullName, role }` | `User` |

### User type

```typescript
{
  id: string;           // UUID
  authUserId: string;   // FK a AuthUser
  email: string;
  fullName: string;
  role: "ADMIN" | "DIRECTIVO" | "DOCENTE" | "FAMILIAR";
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Storage

**Ruta base**: `/api/storage`
**Puerto interno**: 3003

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/upload` | Cualquier autenticado | `multipart/form-data` (field: `file`) | `File` metadata |
| `GET` | `/` | Cualquier autenticado | `?page=&limit=` | Paginated `File[]` (del usuario actual) |
| `GET` | `/:id` | Owner o ADMIN/DIRECTIVO | — | `File` metadata |
| `GET` | `/:id/download` | Owner o ADMIN/DIRECTIVO | — | `302` → URL prefirmada de MinIO |
| `DELETE` | `/:id` | Owner o ADMIN/DIRECTIVO | — | `{ deleted: true }` |

### File type

```typescript
{
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;           // bytes
  ownerId: string;        // authUserId del dueño
  createdAt: string;
}
```

### Upload ejemplo (fetch)

```typescript
const formData = new FormData();
formData.append('file', archivoSeleccionado);

const res = await fetch('/api/storage/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
const file = await res.json(); // { id, filename, ... }
```

### Descarga

```typescript
// La descarga redirige (302) a una URL prefirmada de MinIO
// Simplemente abre en nueva pestaña o usa <a href="/api/storage/:id/download">
window.open(`/api/storage/${fileId}/download`);
```

---

## 6. Notifications

**Ruta base**: `/api/notifications`
**Puerto interno**: 3004

| Método | Ruta | Acceso | Body/Query | Response |
|--------|------|--------|------------|----------|
| `GET` | `/` | Cualquier autenticado | `?page=&limit=` | Paginated `Notification[]` |
| `PATCH` | `/:id/read` | Cualquier autenticado | — | `Notification` (marcada como leída) |
| `POST` | `/internal` | Internal | `{ userId, type, title, message, payload? }` | Job encolado |

### Notification type

```typescript
{
  id: string;
  userId: string;       // authUserId del destinatario
  type: string;         // "welcome" | "invitation_accepted" | custom
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
```

### WebSocket — ver sección 12

---

## 7. Classroom

**Ruta base**: `/api/classroom`
**Puerto interno**: 3006

Este es el servicio más grande. Contiene 10 sub-recursos.

### 7a. Instituciones (`/institutions`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/institutions` | DIRECTIVO | `{ name, code?, address? }` | `Institution` |
| `GET` | `/institutions` | DIRECTIVO, ADMIN | — | `Institution[]` (ADMIN: todas, DIRECTIVO: propias) |
| `GET` | `/institutions/:id` | DIRECTIVO, ADMIN | — | `Institution` con classrooms y teachers |
| `PATCH` | `/institutions/:id` | DIRECTIVO, ADMIN | `{ name?, code?, address? }` | `Institution` |
| `DELETE` | `/institutions/:id` | DIRECTIVO, ADMIN | — | `{ deleted: true }` |

```typescript
// Institution
{
  id: string;
  name: string;
  code?: string;
  address?: string;
  directorId: string;   // authUserId del DIRECTIVO que la creó
  classrooms: Classroom[];
  teachers: InstitutionTeacher[];
  createdAt: string;
}
```

### 7b. Aulas (`/classrooms`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/classrooms` | DOCENTE, ADMIN | `{ name, gradeLevel, institutionId? }` | `Classroom` |
| `GET` | `/classrooms` | Todos los roles | — | `Classroom[]` (FAMILIAR: solo aulas de sus hijos) |
| `GET` | `/classrooms/:id` | Todos los roles | — | `Classroom` con courses + enrollments |
| `PATCH` | `/classrooms/:id` | DOCENTE, ADMIN, DIRECTIVO | `{ name?, gradeLevel? }` | `Classroom` |
| `DELETE` | `/classrooms/:id` | DOCENTE, ADMIN, DIRECTIVO | — | `{ deleted: true }` |
| `GET` | `/classrooms/:id/enrollments` | DOCENTE, ADMIN, DIRECTIVO | — | `Enrollment[]` con student |
| `DELETE` | `/classrooms/:id/enrollments/:enrollmentId` | DOCENTE, ADMIN | — | `{ deleted: true }` |

```typescript
// Classroom
{
  id: string;
  name: string;
  gradeLevel: string;       // ej: "1ro Primaria", "5to Secundaria"
  institutionId?: string;   // null = aula independiente del docente
  teacherId: string;        // authUserId del DOCENTE
  courses: Course[];
  enrollments: Enrollment[];
  createdAt: string;
}
```

### 7c. Cursos (`/courses`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/courses` | DOCENTE, ADMIN | `{ name, classroomId }` | `Course` |
| `GET` | `/courses` | DOCENTE, ADMIN, DIRECTIVO | — | `Course[]` |
| `GET` | `/courses/:id` | DOCENTE, ADMIN, DIRECTIVO | — | `Course` con classroom |
| `PATCH` | `/courses/:id` | DOCENTE, ADMIN | `{ name? }` | `Course` |
| `DELETE` | `/courses/:id` | DOCENTE, ADMIN | — | `{ deleted: true }` |

```typescript
// Course
{
  id: string;
  name: string;          // ej: "Matemática", "Comunicación"
  classroomId: string;
  classroom: Classroom;
  createdAt: string;
}
```

### 7d. Notas (`/grades`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/grades` | DOCENTE, ADMIN, DIRECTIVO | `{ studentId, courseId, evaluation, score }` | `Grade` |
| `GET` | `/grades/classroom/:classroomId` | Todos los roles | — | `Grade[]` con course |
| `GET` | `/grades/student/:studentId` | Todos los roles | — | `Grade[]` con course |
| `PATCH` | `/grades/:id` | DOCENTE, ADMIN, DIRECTIVO | `{ evaluation?, score? }` | `Grade` |
| `DELETE` | `/grades/:id` | DOCENTE, ADMIN, DIRECTIVO | — | `{ deleted: true }` |

```typescript
// CreateGradeDto
{
  studentId: string;       // Student.id (no authUserId)
  courseId: string;         // UUID del curso
  evaluation: string;       // ej: "Primer parcial", "Proyecto final"
  score: number;            // 0 a 20 (escala peruana)
}

// Grade
{
  id: string;
  studentId: string;
  courseId: string;
  course: Course;
  evaluation: string;
  score: number;
  date: string;             // ISO date
}
```

### 7e. Competencias (`/competencies`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/competencies` | DOCENTE, ADMIN | `{ name, area }` | `Competency` |
| `GET` | `/competencies` | DOCENTE, ADMIN, DIRECTIVO | — | `Competency[]` |
| `GET` | `/competencies/:id` | DOCENTE, ADMIN, DIRECTIVO | — | `Competency` |
| `GET` | `/competencies/student/:studentId` | DOCENTE, ADMIN, DIRECTIVO | — | `StudentCompetency[]` |
| `POST` | `/competencies/evaluate` | DOCENTE, ADMIN | `{ competencyId, studentId, courseId, level }` | Evaluación |

```typescript
// EvaluateCompetencyDto
{
  competencyId: string;
  studentId: string;
  courseId: string;
  level: "BASICO" | "INTERMEDIO" | "AVANZADO" | "LOGRADO";
}

// StudentCompetency
{
  id: string;
  studentId: string;
  courseId: string;
  competencyId: string;
  competency: Competency;
  level: string;
  date: string;
}
```

### 7f. Asistencia (`/attendance`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/attendance` | DOCENTE, ADMIN, DIRECTIVO | `{ classroomId, date, records[] }` | `Attendance[]` |
| `PATCH` | `/attendance/:id` | DOCENTE, ADMIN, DIRECTIVO | `{ status }` | `Attendance` |
| `GET` | `/attendance/classroom/:classroomId` | Todos los roles | — | `Attendance[]` |
| `GET` | `/attendance/student/:studentId` | Todos los roles | — | `Attendance[]` |

```typescript
// CreateAttendanceDto
{
  classroomId: string;
  date: string;              // ISO date string
  records: Array<{
    studentId: string;       // Student.id
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  }>;
}

// Attendance
{
  id: string;
  studentId: string;
  classroomId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  createdAt: string;
}
```

### 7g. Necesidades de apoyo (`/support-needs`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/support-needs` | DOCENTE, ADMIN, FAMILIAR | `{ studentId, type, level?, description? }` | `StudentSupportNeed` |
| `GET` | `/support-needs/student/:studentId` | Todos los roles | — | `StudentSupportNeed[]` |
| `PATCH` | `/support-needs/:id` | DOCENTE, ADMIN | `{ type?, level?, description? }` | `StudentSupportNeed` |
| `DELETE` | `/support-needs/:id` | ADMIN | — | `{ deleted: true }` |

```typescript
// CreateSupportNeedDto
{
  studentId: string;
  type: "DISCAPACIDAD_VISUAL" | "DISCAPACIDAD_AUDITIVA" | "DISCAPACIDAD_INTELECTUAL"
      | "DISCAPACIDAD_MOTORA" | "TRASTORNO_ESPECTRO_AUTISTA" | "DIFICULTAD_APRENDIZAJE"
      | "TDAH" | "MULTIDISCAPACIDAD" | "OTRO";
  level?: "LEVE" | "MODERADO" | "SIGNIFICATIVO";  // default: MODERADO
  description?: string;
}

// StudentSupportNeed
{
  id: string;
  studentId: string;
  type: SupportNeedType;
  level: SupportLevel;
  description?: string;
  registeredBy: string;    // authUserId de quien lo registró
  createdAt: string;
}
```

### 7h. Estudiantes (`/students`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/students` | FAMILIAR | `{ fullName, birthDate?, supportNeeds? }` | `Student` |
| `GET` | `/students` | FAMILIAR | — | `Student[]` (hijos del FAMILIAR) |
| `GET` | `/students/:id` | FAMILIAR, DOCENTE, ADMIN, DIRECTIVO | — | `Student` |
| `PATCH` | `/students/:id` | FAMILIAR | `{ fullName?, birthDate? }` | `Student` |
| `DELETE` | `/students/:id` | FAMILIAR | — | `{ deleted: true }` |

```typescript
// CreateStudentDto
{
  fullName: string;
  birthDate?: string;        // ISO date
  supportNeeds?: Array<{
    type: SupportNeedType;
    level?: SupportLevel;
    description?: string;
  }>;
}

// Student
{
  id: string;
  fullName: string;
  birthDate?: string;
  familiarId: string;        // authUserId del FAMILIAR
  supportNeeds: StudentSupportNeed[];
  enrollments: Enrollment[];
  createdAt: string;
}
```

### 7i. Invitaciones (`/invitations`)

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/invitations` | DOCENTE, DIRECTIVO | `{ email, type, classroomId?, institutionId? }` | `Invitation` |
| `POST` | `/invitations/accept/teacher` | Público (sin JWT, pero requiere JWT) | `{ token }` | `InstitutionTeacher` + aulas importadas |
| `POST` | `/invitations/accept/family` | FAMILIAR | `{ token, studentId }` | `Enrollment` |
| `GET` | `/invitations/token/:token` | Público (sin JWT) | — | `Invitation` |
| `GET` | `/invitations` | JWT | — | `Invitation[]` (propias) |
| `PATCH` | `/invitations/:id/revoke` | Cualquier autenticado | — | `Invitation` (REVOKED) |

**Flujo de invitación docente**:
1. El docente se registra normalmente (`POST /auth/register` con rol `DOCENTE`) — tiene su cuenta propia.
2. El DIRECTIVO crea la invitación (`POST /invitations` con `type: "TEACHER_TO_INSTITUTION"`).
3. Se envía email con link a `/invitations/{token}`.
4. El docente abre el link → `GET /invitations/token/:token` muestra los detalles (público, sin JWT).
5. El docente acepta con su JWT: `POST /invitations/accept/teacher` con `{ token }`. Se crea `InstitutionTeacher` y se importan sus aulas independientes a la IE.

**Flujo de invitación familiar**:
1. El FAMILIAR se registra y registra a sus hijos (`POST /students`).
2. El DOCENTE crea la invitación (`POST /invitations` con `type: "FAMILY_TO_CLASSROOM"`).
3. Se envía email con link.
4. El FAMILIAR abre el link → `GET /invitations/token/:token` (público).
5. El FAMILIAR acepta con su JWT: `POST /invitations/accept/family` con `{ token, studentId }`. Se crea `Enrollment` para ese hijo.

```typescript
// CreateInvitationDto
{
  email: string;               // email del invitado
  type: "TEACHER_TO_INSTITUTION" | "FAMILY_TO_CLASSROOM";
  institutionId?: string;      // requerido si type = TEACHER_TO_INSTITUTION
  classroomId?: string;        // requerido si type = FAMILY_TO_CLASSROOM
}

// Invitation
{
  id: string;
  token: string;              // token único para el link
  type: "TEACHER_TO_INSTITUTION" | "FAMILY_TO_CLASSROOM";
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  email: string;              // email del invitado
  institutionId?: string;
  classroomId?: string;
  createdBy: string;          // authUserId de quien invitó
  expiresAt?: string;
  createdAt: string;
}
```

### 7j. Endpoints internos (`/internal`)

Protegidos con `InternalKeyGuard` (header `x-internal-key`). Usados por otros servicios backend, no por frontend.

| Método | Ruta | Consumido por |
|--------|------|---------------|
| `GET` | `/internal/classrooms` | Reports, AI |
| `GET` | `/internal/classroom/:id` | Reports, AI |
| `GET` | `/internal/classroom/:id/attendances` | Reports, AI |
| `GET` | `/internal/classroom/:id/grades` | Reports, AI |
| `GET` | `/internal/classroom/:id/enrollments` | Reports |
| `GET` | `/internal/courses` | Reports |
| `GET` | `/internal/support-needs/student/:studentId` | Accessibility |
| `GET` | `/internal/students/familiar/:familiarId` | — |

---

## 8. Analytics

**Ruta base**: `/api/analytics`
**Puerto interno**: 3007

### 8a. Indicadores (`/indicators`)

| Método | Ruta | Acceso | Query | Response |
|--------|------|--------|-------|----------|
| `GET` | `/indicators/classroom/:classroomId` | DOCENTE, ADMIN, DIRECTIVO | `?page=&limit=` | `StudentIndicator[]` |
| `GET` | `/indicators/student/:studentId/classroom/:classroomId` | Todos | — | `StudentIndicator` |
| `GET` | `/indicators/student/:studentId` | Todos | `?page=&limit=` | `StudentIndicator[]` |

```typescript
// StudentIndicator
{
  id: string;
  studentId: string;
  classroomId: string;
  attendanceRate: number;      // 0-100
  avgGrade: number;            // 0-20
  gradeCount: number;
  competencyScore: number;     // 0-100
  competencyCount: number;
  lastCalculatedAt: string;
}
```

### 8b. Gemelo Digital (`/digital-twin`)

| Método | Ruta | Acceso | Response |
|--------|------|--------|----------|
| `GET` | `/digital-twin/classroom/:classroomId` | DOCENTE, ADMIN, DIRECTIVO | `ClassroomTwinResponse` |
| `GET` | `/digital-twin/classroom/:classroomId/student/:studentId` | DOCENTE, ADMIN, DIRECTIVO | `StudentTwinSnapshot` |

```typescript
// ClassroomTwinResponse
{
  classroomId: string;
  studentsCount: number;
  atRiskCount: number;
  students: StudentTwinSnapshot[];
}

// StudentTwinSnapshot
{
  studentId: string;
  attendanceRate: number;
  avgGrade: number;
  participationScore: number;
  competencyScore: number;
  riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  riskReasons: string[];
  recommendations: string[];
  lastUpdated: string;
}
```

### 8c. Recomendaciones (`/recommendations`)

| Método | Ruta | Acceso | Query | Response |
|--------|------|--------|-------|----------|
| `GET` | `/recommendations/classroom/:classroomId` | DOCENTE, ADMIN, DIRECTIVO | `?page=&limit=` | `Recommendation[]` |
| `GET` | `/recommendations/student/:studentId` | Todos | `?page=&limit=` | `Recommendation[]` |
| `PATCH` | `/recommendations/:id/dismiss` | DOCENTE, ADMIN, DIRECTIVO | — | `Recommendation` |

```typescript
// Recommendation
{
  id: string;
  studentId: string;
  classroomId: string;
  type: string;
  message: string;
  source: string;
  status: "ACTIVE" | "DISMISSED";
  createdAt: string;
}
```

---

## 9. Reports

**Ruta base**: `/api/reports`
**Puerto interno**: 3005

Reportes institucionales agregados (multi-aula). Genera CSV + PDF, sube a Storage.

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/reports/generate` | ADMIN, DIRECTIVO | `{ gradeLevel?, courseId?, periodStart, periodEnd }` | `{ report, csvFileId, pdfFileId }` |
| `POST` | `/reports/generate/pdf` | ADMIN, DIRECTIVO | Mismo que arriba | PDF binario |
| `POST` | `/reports/generate/classroom` | ADMIN, DIRECTIVO, DOCENTE | `{ classroomId, periodStart, periodEnd }` | PDF binario (on-demand) |
| `POST` | `/reports/generate/student` | ADMIN, DIRECTIVO, DOCENTE | `{ studentId, classroomId, periodStart, periodEnd }` | PDF binario (on-demand) |
| `GET` | `/reports` | ADMIN, DIRECTIVO | `?gradeLevel=&courseId=` | `Report[]` |
| `GET` | `/reports/:id` | ADMIN, DIRECTIVO | — | `Report` |
| `GET` | `/reports/:id/download` | ADMIN, DIRECTIVO | — | `302` → CSV en Storage |
| `GET` | `/reports/:id/download/pdf` | ADMIN, DIRECTIVO | — | `302` → PDF en Storage |

```typescript
// Report
{
  id: string;
  title: string;
  type: "INSTITUTIONAL" | "CLASSROOM" | "STUDENT";
  gradeLevel?: string;
  csvFileId?: string;        // ID del archivo en Storage
  pdfFileId?: string;
  generatedBy: string;       // authUserId o "system"
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}
```

---

## 10. AI

**Ruta base**: `/api/ai`
**Puerto interno**: 3008

Reportes semanales PDF por aula (una sola aula, no agregado).

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/ai/reports/generate` | ADMIN, DIRECTIVO, DOCENTE | `{ classroomId, weekStart, weekEnd }` | `{ report, attendanceSummary, gradeSummary, anomalies }` |
| `POST` | `/ai/reports/generate/pdf` | ADMIN, DIRECTIVO, DOCENTE | Mismo que arriba | PDF binario |
| `GET` | `/ai/reports` | ADMIN, DIRECTIVO, DOCENTE | `?classroomId=&courseId=` | `Report[]` |
| `GET` | `/ai/reports/:id` | ADMIN, DIRECTIVO, DOCENTE | — | `Report` |

```typescript
// Report (AI)
{
  id: string;
  classroomId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  fileId?: string;            // PDF en Storage
  attendanceSummary: object;
  gradeSummary: object;
  anomalies: string[];
  createdAt: string;
}
```

---

## 11. Accessibility

**Ruta base**: `/api/accessibility`
**Puerto interno**: 3009

Pipeline de adaptación: OCR → texto adaptado (Groq) → audio (ElevenLabs) → subtítulos SRT → pictogramas ARASAAC → fichas didácticas PDF.

| Método | Ruta | Acceso | Body | Response |
|--------|------|--------|------|----------|
| `POST` | `/accessibility/process` | ADMIN, DOCENTE | `{ fileId, fileName, fileType, adaptationLevel }` | `{ job, audioSize }` |
| `POST` | `/accessibility/process/audio` | ADMIN, DOCENTE | Mismo que arriba | MP3 binario |
| `POST` | `/accessibility/process/worksheet` | ADMIN, DOCENTE | `{ ...processDto, studentId? }` | `{ job, worksheetSize }` |
| `GET` | `/accessibility/jobs` | ADMIN, DOCENTE, DIRECTIVO | — | `Job[]` |
| `GET` | `/accessibility/jobs/:id` | ADMIN, DOCENTE, DIRECTIVO | — | `Job` con archivos |

```typescript
// ProcessContentDto
{
  fileId: string;              // ID del archivo en Storage
  fileName: string;
  fileType: string;            // MIME type
  adaptationLevel: "LEVE" | "MODERADO" | "SIGNIFICATIVO";  // default MODERADO
}

// GenerateWorksheetDto (extiende ProcessContentDto)
{
  fileId: string;
  fileName: string;
  fileType: string;
  adaptationLevel: SupportLevel;
  studentId?: string;          // Opcional: personaliza根据 necesidades de apoyo
}

// AccessibilityJob
{
  id: string;
  fileId: string;
  fileName: string;
  fileType: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  originalText?: string;
  adaptedText?: string;
  summaryText?: string;
  audioFileId?: string;        // ID del audio en Storage
  subtitlesFileId?: string;    // ID de subtítulos SRT en Storage
  pictogramData?: object;      // JSON con pictogramas ARASAAC
  adaptationLevel: SupportLevel;
  worksheetFileId?: string;    // ID del PDF de ficha en Storage
  worksheetContent?: object;   // JSON con ejercicios generados
  error?: string;
  createdAt: string;
}
```

---

## 12. WebSocket

### Conexión

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  path: '/ws/notifications',
  auth: { token: accessToken },
});

socket.on('connect', () => {
  console.log('Conectado a notificaciones');
});

socket.on('notification', (data) => {
  // data: Notification
  console.log('Nueva notificación:', data);
});

socket.on('connect_error', (err) => {
  console.error('Error de conexión:', err.message);
});
```

### Autenticación

El WebSocket pasa por el Gateway, que valida el JWT en `handshake.auth.token`. Si el token es inválido, la conexión se rechaza.

### Eventos del servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `notification` | `Notification` | Nueva notificación para el usuario conectado |

### Namespace

- **Namespace**: `/notifications`
- **Path**: `/ws/notifications`
- **Auth**: JWT en `handshake.auth.token`

---

## 13. Eventos entre servicios

Redis Pub/Sub. Los eventos se publican desde Classroom y Analytics reacciona.

| Evento | Publicador | Consumidor | Datos |
|--------|-----------|------------|-------|
| `user.created` | Auth | Notifications | `{ authUserId, email, fullName, role }` |
| `user.role_changed` | Auth | Users | `{ authUserId, newRole }` |
| `institution.created` | Classroom | — | `{ id, name, directorId }` |
| `institution.updated` | Classroom | — | `{ id, name }` |
| `institution.deleted` | Classroom | — | `{ id }` |
| `course.created` | Classroom | — | `{ id, name, classroomId }` |
| `classroom.created` | Classroom | — | `{ id, name, teacherId, institutionId? }` |
| `classroom.updated` | Classroom | — | `{ id, name, teacherId }` |
| `classroom.deleted` | Classroom | — | `{ id }` |
| `student.created` | Classroom | — | `{ id, fullName, familiarId }` |
| `student.unenrolled` | Classroom | — | `{ id, studentId, classroomId }` |
| `enrollment.created` | Classroom | — | `{ id, classroomId, studentId, familiarId }` |
| `invitation.created` | Classroom | Notifications | `{ id, token, type, email, classroomName? }` |
| `invitation.accepted` | Classroom | Notifications | `{ invitationId, type, usedBy, createdBy, email }` |
| `attendance.registered` | Classroom | Analytics | `{ studentId, classroomId, status, date }` |
| `attendance.updated` | Classroom | Analytics | `{ studentId, classroomId, status, previousStatus, date }` |
| `attendance.batch.registered` | Classroom | Analytics | `{ classroomId, date, count, teacherId }` |
| `grade.registered` | Classroom | Analytics | `{ studentId, courseId, classroomId, score, evaluation }` |
| `grade.updated` | Classroom | Analytics | `{ studentId, courseId, classroomId, score, evaluation }` |
| `competency.evaluated` | Classroom | Analytics | `{ studentId, courseId, classroomId, competencyId, level }` |
| `risk.detected` | Analytics | — | `{ studentId, classroomId, level, reasons }` |
| `accessibility.pipeline.completed` | Accessibility | — | `{ jobId, status }` |

---

## 14. Mapa de integraciones

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vue)                       │
│                                                                     │
│   Register → Login → JWT → Todas las requests con Bearer token    │
│   WebSocket → /ws/notifications → notificaciones en tiempo real    │
└───────────────┬─────────────────────────────────────┬───────────────┘
                │                                     │
                ▼                                     ▼
┌───────────────────────┐              ┌──────────────────────────────┐
│   GATEWAY (:3000)     │              │   WebSocket Proxy            │
│   - JWT validation    │──────────────│   - /ws/notifications → :3004│
│   - Rate limiting     │              │   - Auth con JWT             │
│   - Proxy por prefijo │              └──────────────────────────────┘
└───┬───┬───┬───┬───┬───┘
    │   │   │   │   │
    │   │   │   │   └──────────────────────┐
    │   │   │   │                          │
    ▼   ▼   ▼   ▼                          ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────────────────────────────────┐
│ Auth ││Users ││Store ││Notif ││ CLASSROOM (:3006)                │
│ :3001││ :3002││ :3003││ :3004││ - Institution, Course, Student   │
└──┬───┘└──┬───┘└──────┘└──┬───┘│ - Invitation, Enrollment        │
   │       │               │    │ - Grade, Attendance, Competency  │
   │       │               │    │ - SupportNeed                    │
   │       │               │    └──┬────────────┬──────────────────┘
   │       │               │       │            │
   │       │    ┌──────────┘       │            │
   │       │    │                  │            │
   │       ▼    ▼                  ▼            ▼
   │  ┌──────────────┐    ┌──────────────┐ ┌──────────────┐
   │  │ Notifications │    │  Analytics   │ │     AI       │
   │  │ Email (SMTP)  │    │  :3007       │ │  :3008       │
   │  │ BullMQ Queue  │    │  Indicadores │ │  Reportes    │
   │  │ WebSocket     │    │  Riesgo      │ │  semanales   │
   │  └───────────────┘    │  Gemelo      │ │  PDF por aula│
   │                       │  Recomendac. │ └──────┬───────┘
   │                       └──────────────┘        │
   │                                               │
   │  ┌──────────────┐    ┌──────────────┐         │
   └─▶│    Reports    │    │ Accessibility│         │
      │  :3005        │    │  :3009       │         │
      │  CSV+PDF      │    │  OCR + Groq  │         │
      │  Multi-aula   │    │  ElevenLabs  │         │
      │  Institucional│    │  ARASAAC     │         │
      └───────────────┘    └──────────────┘         │
                                                     │
      ┌──────────────────────────────────────────────┘
      │  (llamadas internas HTTP)
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS POR SERVICIO               │
│                                                             │
│  auth_db ──┐    classroom_db ──┐    analytics_db ──┐       │
│            │                   │                   │       │
│  users_db ─┤    storage_db ────┤    ai_db ─────────┤       │
│            │                   │                   │       │
│  notifications_db ────────────┘    accessibility_db ┤       │
│                                                     │       │
│  reports_db ────────────────────────────────────────┘       │
│                                                             │
│  Redis: Pub/Sub + BullMQ queues + JWT role versioning      │
│  MinIO: Archivos (PDFs, audio, subtítulos, pictogramas)    │
└─────────────────────────────────────────────────────────────┘
```

### Conexiones internas (HTTP)

| Origen | Destino | Endpoint | Propósito |
|--------|---------|----------|-----------|
| AI | Classroom | `GET /internal/classroom/:id` | Obtener aula para reporte semanal |
| AI | Classroom | `GET /internal/classroom/:id/attendances` | Asistencia para reporte |
| AI | Classroom | `GET /internal/classroom/:id/grades` | Notas para reporte |
| AI | Analytics | `GET /internal/indicators/classroom/:id` | Indicadores para reporte |
| AI | Analytics | `GET /internal/risk/classroom/:id` | Riesgo para reporte |
| AI | Analytics | `GET /internal/recommendations/classroom/:id` | Recomendaciones para reporte |
| AI | Storage | `POST /internal/upload` | Subir PDF generado |
| Reports | Classroom | `GET /internal/classrooms` | Listar aulas |
| Reports | Classroom | `GET /internal/classroom/:id` | Detalle de aula |
| Reports | Classroom | `GET /internal/classroom/:id/attendances` | Asistencia |
| Reports | Classroom | `GET /internal/classroom/:id/grades` | Notas |
| Reports | Classroom | `GET /internal/classroom/:id/enrollments` | Matrículas |
| Reports | Analytics | `GET /internal/indicators/classroom/:id` | Indicadores |
| Reports | Analytics | `GET /internal/risk/classroom/:id` | Riesgo |
| Reports | Analytics | `GET /internal/recommendations/classroom/:id` | Recomendaciones |
| Reports | Storage | `POST /internal/upload` | Subir CSV + PDF |
| Accessibility | Classroom | `GET /internal/support-needs/student/:id` | Necesidades para ficha personalizada |

---

## 15. Flujos de usuario completos

### Flujo 1: Registro y primer login

```
1. POST /api/auth/register
   Body: { email, password, fullName, role: "FAMILIAR" }
   → { accessToken, user }

2. Guardar accessToken en localStorage/cookie

3. GET /api/users/:id  (con Bearer token)
   → Datos del perfil
```

### Flujo 2: DIRECTIVO — Crear institución e invitar docente

```
1. El DOCENTE se registra primero:
   POST /api/auth/register
   Body: { email: "docente@minedu.edu.pe", password: "...", fullName: "María López", role: "DOCENTE" }
   → { accessToken, user }

2. El DIRECTIVO crea la institución:
   POST /api/classroom/institutions
   Body: { name: "IE San Martín", code: "0912345" }
   → Institution

3. El DIRECTIVO invita al docente:
   POST /api/classroom/invitations
   Body: { email: "docente@minedu.edu.pe", type: "TEACHER_TO_INSTITUTION", institutionId: "..." }
   → Invitation { token: "abc123..." }

4. → Se envía email automáticamente con link: /invitations/abc123...

5. El docente abre el link (puede sin JWT):
   GET /api/classroom/invitations/token/abc123
   → Invitation (detalles de la invitación)

6. El docente acepta (con su JWT):
   POST /api/classroom/invitations/accept/teacher
   Body: { token: "abc123..." }
   → Se crea InstitutionTeacher + se importan aulas independientes
```

### Flujo 3: DOCENTE — Crear aula, curso, invitar familiar

```
1. POST /api/classroom/classrooms
   Body: { name: "1ro A", gradeLevel: "1ro Primaria", institutionId: "..." }
   → Classroom

2. POST /api/classroom/courses
   Body: { name: "Matemática", classroomId: "..." }
   → Course

3. POST /api/classroom/courses
   Body: { name: "Comunicación", classroomId: "..." }
   → Course

4. POST /api/classroom/invitations/family
   Body: { email: "familia@email.com", classroomId: "..." }
   → Invitation { token: "xyz789..." }

5. → Se envía email automáticamente con link: /invitations/xyz789...

6. Registrar asistencia:
   POST /api/classroom/attendance
   Body: {
     classroomId: "...",
     date: "2026-07-25",
     records: [
       { studentId: "student-uuid-1", status: "PRESENT" },
       { studentId: "student-uuid-2", status: "ABSENT" },
     ]
   }
   → Attendance[]
   → Analytics recalcula indicadores automáticamente

7. Registrar notas:
   POST /api/classroom/grades
   Body: {
     studentId: "student-uuid-1",
     courseId: "course-uuid-1",
     evaluation: "Primer parcial",
     score: 16
   }
   → Grade
   → Analytics recalcula indicadores automáticamente
```

### Flujo 4: FAMILIAR — Registrar hijo y aceptar invitación

```
1. Registrar hijo (con JWT):
   POST /api/classroom/students
   Body: {
     fullName: "Juan Pérez",
     birthDate: "2018-03-15",
     supportNeeds: [{
       type: "TDAH",
       level: "LEVE",
       description: "Necesita apoyo en lectura"
     }]
   }
   → Student { id: "student-uuid" }

2. Abrir link del email (puede sin JWT):
   GET /api/classroom/invitations/token/xyz789
   → Invitation (detalles)

3. Aceptar invitación (con JWT):
   POST /api/classroom/invitations/accept/family
   Body: { token: "xyz789...", studentId: "student-uuid" }
   → Enrollment

4. Ver notas de su hijo:
   GET /api/classroom/grades/student/student-uuid
   → Grade[]

5. Ver asistencia de su hijo:
   GET /api/classroom/attendance/student/student-uuid
   → Attendance[]
```

### Flujo 5: Ver gemelo digital y recomendaciones

```
1. Ver resumen del aula:
   GET /api/analytics/digital-twin/classroom/:classroomId
   → ClassroomTwinResponse {
       studentsCount: 30,
       atRiskCount: 3,
       students: [...]
     }

2. Ver estudiante individual:
   GET /api/analytics/digital-twin/classroom/:classroomId/student/:studentId
   → StudentTwinSnapshot {
       attendanceRate: 85,
       avgGrade: 14.5,
       riskLevel: "MEDIO",
       recommendations: ["Refuerzo en matemática"]
     }

3. Ver indicadores detallados:
   GET /api/analytics/indicators/student/:studentId/classroom/:classroomId
   → StudentIndicator
```

### Flujo 6: Generar reporte institucional

```
1. Generar CSV + PDF:
   POST /api/reports/generate
   Body: {
     gradeLevel: "1ro Primaria",
     periodStart: "2026-07-01",
     periodEnd: "2026-07-31"
   }
   → { report, csvFileId, pdfFileId }

2. Descargar CSV:
   GET /api/reports/:reportId/download
   → 302 → descarga archivo

3. Descargar PDF:
   GET /api/reports/:reportId/download/pdf
   → 302 → descarga archivo

4. Generar reporte por aula (on-demand):
   POST /api/reports/generate/classroom
   Body: { classroomId: "...", periodStart: "...", periodEnd: "..." }
   → PDF binario

5. Generar reporte por estudiante (on-demand):
   POST /api/reports/generate/student
   Body: { studentId: "...", classroomId: "...", periodStart: "...", periodEnd: "..." }
   → PDF binario
```

### Flujo 7: Generar reporte semanal con IA

```
POST /api/ai/reports/generate
Body: {
  classroomId: "...",
  weekStart: "2026-07-21",
  weekEnd: "2026-07-25"
}
→ {
    report: Report,
    attendanceSummary: { present: 85, absent: 10, late: 5 },
    gradeSummary: { avg: 14.2, min: 8, max: 19 },
    anomalies: ["Estudiante X: asistencia bajó 40% esta semana"]
  }
```

### Flujo 8: Fichas didácticas personalizadas

```
1. Subir archivo de contenido:
   POST /api/storage/upload (multipart)
   → File { id: "file-uuid" }

2. Generar ficha personalizada (con estudiante):
   POST /api/accessibility/process/worksheet
   Body: {
     fileId: "file-uuid",
     fileName: "ejercicios-matematica.pdf",
     fileType: "application/pdf",
     adaptationLevel: "MODERADO",
     studentId: "student-uuid"   // ← opcional, personaliza según necesidades
   }
   → { job, worksheetSize }
   → El job contiene worksheetFileId (PDF) y worksheetContent (ejercicios JSON)

3. Generar ficha genérica (sin estudiante):
   POST /api/accessibility/process/worksheet
   Body: {
     fileId: "file-uuid",
     fileName: "ejercicios.pdf",
     fileType: "application/pdf",
     adaptationLevel: "LEVE"
   }
   → { job, worksheetSize }
```

### Flujo 9: Notificaciones en tiempo real

```
1. Conectar WebSocket:
   const socket = io('http://localhost:3000/notifications', {
     path: '/ws/notifications',
     auth: { token: accessToken }
   });

2. Escuchar notificaciones:
   socket.on('notification', (notification) => {
     // notification: { id, type, title, message, ... }
     mostrarToast(notification.title, notification.message);
   });

3. Las notificaciones llegan cuando:
   - Se registra un usuario (welcome)
   - Se acepta una invitación
   - (cualquier evento que el backend encole vía BullMQ)
```

### Flujo 10: Verificar riesgo y tomar acción

```
1. DOCENTE ve recomendaciones pendientes:
   GET /api/analytics/recommendations/classroom/:classroomId
   → Recommendation[] con status: "ACTIVE"

2. DOCente descarta una recomendación:
   PATCH /api/analytics/recommendations/:id/dismiss
   → Recommendation { status: "DISMISSED" }

3. DOCENTE ve el gemelo digital completo:
   GET /api/analytics/digital-twin/classroom/:classroomId
   → Resumen con estudiantes en riesgo, tasas de asistencia, promedios
```

---

## Apéndice: Variables de entorno relevantes para frontend

El frontend solo necesita conocer la **Base URL del Gateway**. Todas las demás variables son internas del backend.

| Variable | Valor (desarrollo) | Descripción |
|----------|-------------------|-------------|
| `GATEWAY_URL` | `http://localhost:3000` | URL del Gateway para API calls |
| `WS_URL` | `http://localhost:3000` | URL del Gateway para WebSocket |
| `FRONTEND_URL` | `http://localhost:3000` | URL del frontend (usada en emails de invitación) |
