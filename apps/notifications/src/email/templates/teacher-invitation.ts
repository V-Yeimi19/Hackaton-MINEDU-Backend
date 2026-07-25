interface TeacherInvitationProps {
  directorName: string;
  institutionName: string;
  url: string;
}

export function teacherInvitationTemplate(data: TeacherInvitationProps): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a56db; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">Plataforma <strong>${data.institutionName}</strong> </h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937;">Has sido invitado como docente</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      <strong>${data.directorName}</strong> te ha invitado a formar parte de la institución educativa <strong>${data.institutionName}</strong>
    </p>
    <p style="color: #4b5563; line-height: 1.6;">
      Haz clic en el siguiente botón para aceptar la invitación y crear tu cuenta:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.url}"
         style="background: #1a56db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Aceptar invitación
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 12px;">
      Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:<br>
      ${data.url}
    </p>
  </div>
</body>
</html>`;
}
