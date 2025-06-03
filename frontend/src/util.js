import dayjs from "dayjs";

export function getCalendarMonth(
  month = dayjs().month(),
  year = dayjs().year()
) {
  month = Math.floor(month);
  // Get the day of week for the first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = dayjs(new Date(year, month, 1)).day();
  // Adjust to make Monday (1) the first day, Sunday (0) becomes the last day (6)
  const adjustedDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  let monthCount = 0 - adjustedDay;
  const matrix = new Array(5).fill([]).map(() => {
    return new Array(7).fill(null).map(() => {
      monthCount = monthCount + 1;
      return dayjs(new Date(year, month, monthCount));
    });
  });
  return matrix;
}
