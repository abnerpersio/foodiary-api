import { Env } from "@/config/env";
import { s3Client } from "@/lib/clients/s3";
import { DateUtils } from "@/lib/utils/date";
import type { HttpResponse, HttpUseCase } from "@/types/http";
import type { Location, LocationsData } from "@/types/location";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const UPCOMING_EVENTS_DAYS = 5;

export class UpdateLocationsDatesUseCase implements HttpUseCase {
  async execute(): Promise<HttpResponse> {
    const { locations, ...rest } = await this.readConfigFile();

    const updated = locations
      .map((location) => ({
        id: location.id,
        displayName: location.displayName,
        city: location.city,
        schedule: location.schedule,
        nextDate: DateUtils.getNextOccurrence({
          weekDay: location.schedule.weekDay,
          weekIndex: location.schedule.weekIndex,
        }),
      }))
      .sort((a, b) => {
        if (!a.nextDate || !b.nextDate) return 0;
        return DateUtils.diff(a.nextDate, b.nextDate);
      });

    await this.updateLocationsFile({ ...rest, locations: updated });

    const upcomingEvents = this.getUpcomingEvents(updated);
    await this.saveUpcomingEventsFile(upcomingEvents);

    return {
      status: 200,
      data: {
        message: "Locations updated successfully",
        updatedCount: updated.length,
      },
    };
  }

  private async readConfigFile() {
    const command = new GetObjectCommand({
      Bucket: Env.storageBucketName,
      Key: "config.json",
    });

    const response = await s3Client.send(command);
    const fileContent = await response.Body?.transformToString();
    if (!fileContent) throw new Error("Failed to read config.json file");

    return JSON.parse(fileContent) as LocationsData;
  }

  private async updateLocationsFile(data: LocationsData): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: Env.storageBucketName,
      Key: "locations.json",
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    });

    await s3Client.send(command);
  }

  private getUpcomingEvents(locations: Location[]) {
    const today = DateUtils.startOfDay(new Date());
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + UPCOMING_EVENTS_DAYS);

    return locations
      .filter((location) => {
        if (!location.nextDate) return false;
        const eventDate = DateUtils.startOfDay(location.nextDate);
        return eventDate >= today && eventDate < nextWeek;
      })
      .reduce((acc, location) => {
        if (!location.nextDate) return acc;
        const dateKey = location.nextDate;

        return {
          ...acc,
          [dateKey]: (acc[dateKey] || []).concat(location),
        };
      }, {} as Record<string, Location[]>);
  }

  private async saveUpcomingEventsFile(
    events: Record<string, Location[]>
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: Env.storageBucketName,
      Key: "upcoming-events.json",
      Body: JSON.stringify(events, null, 2),
      ContentType: "application/json",
    });

    await s3Client.send(command);
  }
}
