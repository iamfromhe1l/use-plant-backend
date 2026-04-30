import { api } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { connectToDatabase } from "@/db/mongodb";
import { ObjectId } from "mongodb";
import { IApiResponse } from "@/types/error";
import { successResponse, errorResponse } from "@/helpers/response";
import { AuthData } from "@/auth/handler";
import { ITelemetryRecord, IWateringRecord } from "@/telemetry/types";

interface IGetTelemetryRequest {
  deviceId: string;
}

interface IGetTelemetryHistoryRequest {
  deviceId: string;
  limit?: number;
  from?: string;
  to?: string;
}

interface IGetWateringHistoryRequest {
  deviceId: string;
  limit?: number;
  from?: string;
  to?: string;
}

function getPlantIndexFromCommandType(type: string): number | null {
  if (type === "water_plant_1") return 1;
  if (type === "water_plant_2") return 2;
  return null;
}

export const getLatestTelemetry = api(
  { method: "GET", path: "/telemetry/latest", expose: true, auth: true },
  async (
    req: IGetTelemetryRequest,
  ): Promise<IApiResponse<ITelemetryRecord | null>> => {
    try {
      const userId = getAuthData<AuthData>()!.userID;
      const { db } = await connectToDatabase();

      const device = await db.collection("devices").findOne({
        deviceId: req.deviceId,
        userId: new ObjectId(userId),
      });

      if (!device) {
        return errorResponse("Устройство не найдено", "DEVICE_NOT_FOUND");
      }

      const telemetry = await db
        .collection("telemetry")
        .findOne(
          { deviceId: req.deviceId },
          { sort: { receivedAt: -1 } },
        );

      if (!telemetry) {
        return successResponse(null);
      }

      return successResponse({
        deviceId: telemetry.deviceId,
        plants: telemetry.plants,
        receivedAt: telemetry.receivedAt,
      });
    } catch (error) {
      console.error("Get telemetry error:", error);
      return errorResponse("Ошибка получения данных", "TELEMETRY_ERROR");
    }
  },
);

export const getTelemetryHistory = api(
  { method: "GET", path: "/telemetry/history", expose: true, auth: true },
  async (
    req: IGetTelemetryHistoryRequest,
  ): Promise<IApiResponse<ITelemetryRecord[]>> => {
    try {
      const userId = getAuthData<AuthData>()!.userID;
      const { db } = await connectToDatabase();

      const device = await db.collection("devices").findOne({
        deviceId: req.deviceId,
        userId: new ObjectId(userId),
      });

      if (!device) {
        return errorResponse("Устройство не найдено", "DEVICE_NOT_FOUND");
      }

      const limit = Number(req.limit || 0);

      const filter: Record<string, unknown> = { deviceId: req.deviceId };
      if (req.from || req.to) {
        filter.receivedAt = {};
        if (req.from) (filter.receivedAt as Record<string, unknown>).$gte = new Date(req.from);
        if (req.to) (filter.receivedAt as Record<string, unknown>).$lte = new Date(req.to);
      }

      let query = db.collection("telemetry").find(filter).sort({ receivedAt: 1 });

      if (limit > 0) {
        query = query.limit(Math.min(limit, 5000));
      }

      const records = await query.toArray();

      return successResponse(
        records.map((r) => ({
          deviceId: r.deviceId,
          plants: r.plants,
          receivedAt: r.receivedAt,
        })),
      );
    } catch (error) {
      console.error("Get telemetry history error:", error);
      return errorResponse("Ошибка получения истории", "TELEMETRY_HISTORY_ERROR");
    }
  },
);

export const getWateringHistory = api(
  { method: "GET", path: "/telemetry/watering", expose: true, auth: true },
  async (
    req: IGetWateringHistoryRequest,
  ): Promise<IApiResponse<IWateringRecord[]>> => {
    try {
      const userId = getAuthData<AuthData>()!.userID;
      const { db } = await connectToDatabase();

      const device = await db.collection("devices").findOne({
        deviceId: req.deviceId,
        userId: new ObjectId(userId),
      });

      if (!device) {
        return errorResponse("Устройство не найдено", "DEVICE_NOT_FOUND");
      }

      const limit = Number(req.limit || 0);
      const maxLimit = limit > 0 ? Math.min(limit, 5000) : 5000;
      const wateringFilter: Record<string, unknown> = { deviceId: req.deviceId };
      const commandFilter: Record<string, unknown> = {
        deviceId: req.deviceId,
        "command.type": { $in: ["water_plant_1", "water_plant_2"] },
      };

      if (req.from || req.to) {
        wateringFilter.wateredAt = {};
        commandFilter.sentAt = {};
        if (req.from) {
          (wateringFilter.wateredAt as Record<string, unknown>).$gte = new Date(req.from);
          (commandFilter.sentAt as Record<string, unknown>).$gte = new Date(req.from);
        }
        if (req.to) {
          (wateringFilter.wateredAt as Record<string, unknown>).$lte = new Date(req.to);
          (commandFilter.sentAt as Record<string, unknown>).$lte = new Date(req.to);
        }
      }

      const [history, commandHistory] = await Promise.all([
        db.collection("watering_logs").find(wateringFilter).sort({ wateredAt: 1 }).limit(maxLimit).toArray(),
        db.collection("command_logs").find(commandFilter).sort({ sentAt: 1 }).limit(maxLimit).toArray(),
      ]);

      const wateringRecords: IWateringRecord[] = history.map((r) => ({
        deviceId: r.deviceId,
        userId: r.userId,
        plantIndex: Number(r.plantIndex),
        level: Math.min(10, Math.max(1, Number(r.level ?? 5))),
        source:
          r.source === "condition_sensor" || r.source === "condition_schedule"
            ? r.source
            : "manual",
        wateredAt: r.wateredAt,
      }));

      const fallbackManualRecordsRaw: Array<IWateringRecord | null> = commandHistory
        .map((entry) => {
          const commandType = entry.command?.type;
          const plantIndex = getPlantIndexFromCommandType(commandType);
          if (!plantIndex) return null;

          return {
            deviceId: entry.deviceId,
            userId: entry.userId,
            plantIndex,
            level: Math.min(10, Math.max(1, Number(entry.command?.payload?.level ?? 5))),
            source: "manual" as const,
            wateredAt: entry.sentAt,
          };
        });

      const fallbackManualRecords = fallbackManualRecordsRaw.filter(
        (record): record is IWateringRecord => record !== null,
      );

      const dedupedManualFallbacks = fallbackManualRecords.filter((manualRecord) => {
        const manualTime = new Date(manualRecord.wateredAt).getTime();

        return !wateringRecords.some((wateringRecord) => {
          if (
            wateringRecord.deviceId !== manualRecord.deviceId ||
            wateringRecord.plantIndex !== manualRecord.plantIndex ||
            wateringRecord.level !== manualRecord.level ||
            wateringRecord.source !== "manual"
          ) {
            return false;
          }

          const wateringTime = new Date(wateringRecord.wateredAt).getTime();
          return Math.abs(wateringTime - manualTime) <= 15000;
        });
      });

      const mergedHistory = [...wateringRecords, ...dedupedManualFallbacks]
        .sort((left, right) => new Date(left.wateredAt).getTime() - new Date(right.wateredAt).getTime())
        .slice(-maxLimit);

      return successResponse(mergedHistory);
    } catch (error) {
      console.error("Get watering history error:", error);
      return errorResponse("Ошибка получения истории", "WATERING_HISTORY_ERROR");
    }
  },
);
