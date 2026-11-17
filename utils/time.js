import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function tashkentTimestamp(date = new Date()) {
  return dayjs(date).tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss");
}

export function parseTashkentTimestamp(value) {
  const localTimestamp =
    typeof value === "string" &&
    /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?))?$/.exec(
      value.trim(),
    );

  if (localTimestamp) {
    const [, date, time = "00:00:00"] = localTimestamp;
    return new Date(`${date}T${time}+05:00`);
  }

  return new Date(value);
}
