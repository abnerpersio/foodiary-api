type DateType = string | Date;

export class DateUtils {
  static formatLongDate(date: DateType) {
    return Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(date).getTime());
  }

  static formatHours(date: DateType) {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }

  static startOfDay(date: DateType) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0);
    startOfDay.setMinutes(0);
    startOfDay.setSeconds(0);
    return startOfDay;
  }

  static isAfter(dateA: DateType, dateB: DateType) {
    return this.startOfDay(dateA).getTime() > this.startOfDay(dateB).getTime();
  }
}
