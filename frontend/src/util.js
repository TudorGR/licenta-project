import dayjs from "dayjs";

export function getCalendarMonth(month = dayjs().month()) {
  month = Math.floor(month);
  const currentYear = dayjs().year();
  const firstDayOfMonth = dayjs(new Date(currentYear, month, 0)).day();
  let monthCount = 0 - firstDayOfMonth;
  const matrix = new Array(5).fill([]).map(() => {
    return new Array(7).fill(null).map(() => {
      monthCount = monthCount + 1;
      return dayjs(new Date(currentYear, month, monthCount));
    });
  });
  return matrix;
}
