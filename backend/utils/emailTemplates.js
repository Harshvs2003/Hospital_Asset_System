const appName = process.env.APP_NAME || "Asset Operations";

const baseLayout = ({ title, body }) => `
  <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#0f172a;color:#ffffff;padding:16px 20px;">
        <div style="font-size:16px;font-weight:700;">${appName}</div>
      </div>
      <div style="padding:20px;">
        <h2 style="margin:0 0 12px 0;font-size:18px;color:#111827;">${title}</h2>
        <div style="font-size:14px;line-height:1.6;color:#374151;">${body}</div>
      </div>
      <div style="padding:14px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
        If you did not request this, you can ignore this email.
      </div>
    </div>
  </div>
`;

export const verificationEmailTemplate = ({ name, otp, expiresMinutes }) => {
  const body = `
    <p>Hi ${name || "there"},</p>
    <p>Your email verification OTP is:</p>
    <div style="font-size:24px;font-weight:700;letter-spacing:2px;margin:12px 0;color:#111827;">
      ${otp}
    </div>
    <p>This code expires in <strong>${expiresMinutes} minutes</strong>.</p>
  `;
  return baseLayout({ title: "Verify your email", body });
};

export const resetPasswordEmailTemplate = ({ name, otp, expiresMinutes }) => {
  const body = `
    <p>Hi ${name || "there"},</p>
    <p>Your password reset OTP is:</p>
    <div style="font-size:24px;font-weight:700;letter-spacing:2px;margin:12px 0;color:#111827;">
      ${otp}
    </div>
    <p>This code expires in <strong>${expiresMinutes} minutes</strong>.</p>
  `;
  return baseLayout({ title: "Reset your password", body });
};

export const welcomeEmailTemplate = ({ name }) => {
  const body = `
    <p>Hi ${name || "there"},</p>
    <p>Welcome to <strong>${appName}</strong>. Your account is verified and ready to use.</p>
    <p>If you need help, just reply to this email.</p>
  `;
  return baseLayout({ title: "Welcome aboard!", body });
};
