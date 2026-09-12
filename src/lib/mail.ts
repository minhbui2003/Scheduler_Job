import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
  fullName: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Scheduler Job" <noreply@schedulerjob.com>',
    to: email,
    subject: 'Verify your email - Scheduler Job',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Scheduler Job</h1>
            </div>
            <div style="padding:32px 24px;">
              <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Welcome, ${fullName}!</h2>
              <p style="color:#64748b;line-height:1.6;margin:0 0 24px;">
                Thank you for signing up. Please verify your email address to get started.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verificationUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                  Verify Email
                </a>
              </div>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:24px 0 0;">
                This link will expire in 30 minutes. If you did not create an account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                If the button doesn't work, copy and paste this URL:<br/>
                <a href="${verificationUrl}" style="color:#6366f1;word-break:break-all;">${verificationUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export default transporter;
