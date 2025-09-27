enum WeekDayEnum {
  sunday = "sunday",
  monday = "monday",
  tuesday = "tuesday",
  wednesday = "wednesday",
  thursday = "thursday",
  friday = "friday",
  saturday = "saturday",
}
const WeekDay = WeekDayEnum;
type WeekDay = `${WeekDayEnum}`;

export type LocationSchedule = {
  hours: string;
  weekDay: WeekDay;
  weekIndex: number;
  label: string;
};

export type Location = {
  id: string;
  displayName: string;
  city: string;
  schedule: LocationSchedule;
  nextDate: string | null;
  contact?: {
    name: string;
    phone: string;
  };
};

export type LocationsData = {
  version: string;
  locations: Location[];
};
