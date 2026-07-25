interface TeacherInvitationProps {
  directorName: string;
  institutionName: string;
  url: string;
}

export function teacherInvitationTemplate(data: TeacherInvitationProps): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4fafc; font-family: 'Inter', Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4fafc; padding: 40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Header: Secondary black -->
          <tr>
            <td style="
              background-color: #2b3133;
              padding: 24px;
              border-radius: 16px 16px 0 0;
            ">
              <p style="
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                line-height: 1.3;
                color: #ffffff;
                letter-spacing: -0.01em;
              ">Plataforma Educativa</p>
            </td>
          </tr>

          <!-- Cyan accent bar -->
          <tr>
            <td style="
              height: 4px;
              background: linear-gradient(90deg, #006876, #00bcd4);
              font-size: 0;
              line-height: 0;
            ">&nbsp;</td>
          </tr>

          <!-- Card body: glass-inspired -->
          <tr>
            <td style="
              background-color: #ffffff;
              border: 1px solid #dde3e5;
              border-top: none;
              padding: 40px 32px;
              border-radius: 0 0 16px 16px;
            ">

              <!-- Label -->
              <p style="
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                color: #006876;
              ">INVITACI&Oacute;N DOCENTE</p>

              <!-- Headline -->
              <h2 style="
                margin: 0 0 16px 0;
                font-size: 24px;
                font-weight: 600;
                line-height: 1.4;
                color: #161d1e;
              ">Has sido invitado como docente</h2>

              <!-- Body -->
              <p style="
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 400;
                line-height: 1.5;
                color: #3c494c;
              ">
                <strong>${data.directorName}</strong> te ha invitado a formar parte de la instituci&oacute;n educativa
                <strong>${data.institutionName}</strong>.
              </p>

              <p style="
                margin: 0 0 32px 0;
                font-size: 16px;
                font-weight: 400;
                line-height: 1.5;
                color: #3c494c;
              ">
                Haz clic en el siguiente bot&oacute;n para aceptar la invitaci&oacute;n:
              </p>

              <!-- CTA Button: Cyan primary -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="${data.url}" style="
                      display: inline-block;
                      background-color: #00bcd4;
                      color: #ffffff;
                      font-size: 16px;
                      font-weight: 600;
                      text-decoration: none;
                      padding: 14px 32px;
                      border-radius: 8px;
                      letter-spacing: 0.02em;
                    ">Aceptar invitaci&oacute;n</a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="
                    border-top: 1px solid #dde3e5;
                    padding-top: 24px;
                  ">
                    <!-- Fallback URL -->
                    <p style="
                      margin: 0;
                      font-size: 14px;
                      line-height: 1.5;
                      color: #6c797c;
                    ">
                      Si no puedes hacer clic en el bot&oacute;n, copia y pega esta URL en tu navegador:<br>
                      <a href="${data.url}" style="color: #006876; word-break: break-all;">${data.url}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 16px; text-align: center;">
              <p style="
                margin: 0;
                font-size: 12px;
                line-height: 1.5;
                color: #6c797c;
              ">
                Este es un correo autom&aacute;tico. No respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
