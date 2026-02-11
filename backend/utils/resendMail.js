const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_EMAIL = "AssetOps <no-reply@assetops.in>";

const buildHtmlBody = ({
  assetName,
  assetId,
  departmentName,
  deadlineDate,
  daysLeft,
  reminderStartDays,
  intervalDays,
  reminderType,
}) => {
  const title = reminderType === "service" ? "Service Due Reminder" : "Contract Expiry Reminder";
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">${title}</h2>
      <p style="margin: 0 0 12px;">Please review the reminder details below:</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr><td style="padding: 6px 0;"><strong>Asset Name:</strong></td><td>${assetName || "-"}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Asset ID:</strong></td><td>${assetId || "-"}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Department:</strong></td><td>${departmentName || "-"}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Deadline Date:</strong></td><td>${deadlineDate || "-"}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Days Left:</strong></td><td>${daysLeft}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Reminder Start Days:</strong></td><td>${reminderStartDays}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Interval Days:</strong></td><td>${intervalDays}</td></tr>
      </table>
    </div>
  `;
};

export const sendReminderEmail = async ({
  to,
  subject,
  assetName,
  assetId,
  departmentName,
  deadlineDate,
  daysLeft,
  reminderStartDays,
  intervalDays,
  reminderType,
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  if (!to) throw new Error("Reminder recipient email missing");

  const html = buildHtmlBody({
    assetName,
    assetId,
    departmentName,
    deadlineDate,
    daysLeft,
    reminderStartDays,
    intervalDays,
    reminderType,
  });

  const text = [
    `${reminderType === "service" ? "Service Due" : "Contract Expiry"} Reminder`,
    `Asset Name: ${assetName || "-"}`,
    `Asset ID: ${assetId || "-"}`,
    `Department: ${departmentName || "-"}`,
    `Deadline Date: ${deadlineDate || "-"}`,
    `Days Left: ${daysLeft}`,
    `Reminder Start Days: ${reminderStartDays}`,
    `Interval Days: ${intervalDays}`,
  ].join("\n");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error: ${res.status} ${body}`);
  }
};
