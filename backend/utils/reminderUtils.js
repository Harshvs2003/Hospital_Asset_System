import moment from "moment-timezone";

const TZ = process.env.REMINDER_TZ || "Asia/Kolkata";

const ALLOWED_INTERVALS = {
  7: new Set([1]),
  15: new Set([1, 2]),
  30: new Set([1, 2, 3, 5]),
};

export const day = (value = null) => {
  if (!value) return null;
  return moment(value).tz(TZ).startOf("day");
};

export const today = () => moment().tz(TZ).startOf("day");

export const daysLeftFrom = (deadlineDate, referenceDay = today()) => {
  const due = day(deadlineDate);
  if (!due) return null;
  return due.diff(referenceDay, "days");
};

export const isSameDay = (a, b) => {
  const da = day(a);
  const db = day(b);
  if (!da || !db) return false;
  return da.isSame(db);
};

export const isValidReminderInterval = (startDays, intervalDays) => {
  if (!Number.isInteger(startDays) || !Number.isInteger(intervalDays)) return false;
  if (startDays <= 0 || intervalDays <= 0) return false;

  const strict = ALLOWED_INTERVALS[startDays];
  if (strict) return strict.has(intervalDays);

  // custom startDays support
  return intervalDays <= startDays;
};

const getEmailFromAsset = (asset) => asset.reminderEmail || asset.supervisorEmail || null;

export const normalizeReminder = (asset, reminderType) => {
  const service = reminderType === "service";
  const dueDate = service
    ? asset.serviceDueDate || asset.lastServiceDate || null
    : asset.contractExpiryDate || null;
  const startDays = service
    ? asset.serviceReminderStartDays ?? asset.reminderService?.startDays ?? null
    : asset.contractReminderStartDays ?? asset.reminderContract?.startDays ?? null;
  const intervalDays = service
    ? asset.serviceReminderIntervalDays ?? asset.reminderService?.intervalDays ?? null
    : asset.contractReminderIntervalDays ?? asset.reminderContract?.intervalDays ?? null;
  const lastReminderSentAt = service
    ? asset.serviceLastReminderSentAt || asset.reminderServiceLastSentAt || null
    : asset.contractLastReminderSentAt || asset.reminderContractLastSentAt || null;
  const nextReminderAt = service
    ? asset.serviceNextReminderAt || null
    : asset.contractNextReminderAt || null;

  const legacyEnabled = service
    ? asset.reminderService?.enabled
    : asset.reminderContract?.enabled;
  const enabled = typeof legacyEnabled === "boolean"
    ? legacyEnabled
    : Boolean(dueDate && startDays && intervalDays);

  return {
    reminderType,
    dueDate,
    startDays,
    intervalDays,
    lastReminderSentAt,
    nextReminderAt,
    enabled,
    email: getEmailFromAsset(asset),
  };
};

export const getInitialNextReminderAt = ({ dueDate, startDays, referenceDay }) => {
  const due = day(dueDate);
  if (!due || !Number.isInteger(startDays) || startDays <= 0) return null;
  const startDay = due.clone().subtract(startDays, "days");
  return (startDay.isBefore(referenceDay) ? referenceDay.clone() : startDay).toDate();
};

export const shouldSendReminderToday = ({
  daysLeft,
  dueDate,
  startDays,
  nextReminderAt,
  lastReminderSentAt,
  referenceDay,
}) => {
  if (daysLeft === null || !Number.isInteger(startDays)) return false;
  if (daysLeft > startDays || daysLeft < -2) return false;
  if (lastReminderSentAt && isSameDay(lastReminderSentAt, referenceDay)) return false;

  const mandatoryStartDay = daysLeft === startDays;
  const deadlineWindow = daysLeft <= 0 && daysLeft >= -2;
  const deadlineAlreadySent = deadlineWindow
    && lastReminderSentAt
    && !day(lastReminderSentAt).isBefore(day(dueDate));
  const intervalDue = daysLeft > 0 && nextReminderAt && !referenceDay.isBefore(day(nextReminderAt));

  return mandatoryStartDay || (!deadlineAlreadySent && deadlineWindow) || intervalDue;
};

export const getPostSendNextReminderAt = ({
  daysLeft,
  dueDate,
  intervalDays,
  referenceDay,
}) => {
  if (daysLeft <= 0 && daysLeft >= -2) {
    return day(dueDate).clone().add(3, "days").toDate();
  }
  return referenceDay.clone().add(intervalDays, "days").toDate();
};

export const formatDateForEmail = (value) => day(value)?.format("DD MMM YYYY") || "-";
