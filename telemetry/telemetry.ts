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

      const limit = Math.min(req.limit || 50, 200);

      const filter: Record<string, unknown> = { deviceId: req.deviceId };
      if (req.from || req.to) {
        filter.receivedAt = {};
        if (req.from) (filter.receivedAt as Record<string, unknown>).$gte = new Date(req.from);
        if (req.to) (filter.receivedAt as Record<string, unknown>).$lte = new Date(req.to);
      }

      const records = await db
        .collection("telemetry")
        .find(filter)
        .sort({ receivedAt: -1 })
        .limit(limit)
        .toArray();

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

      const limit = Math.min(req.limit || 100, 300);
      const filter: Record<string, unknown> = { deviceId: req.deviceId };

      if (req.from || req.to) {
        filter.wateredAt = {};
        if (req.from) (filter.wateredAt as Record<string, unknown>).$gte = new Date(req.from);
        if (req.to) (filter.wateredAt as Record<string, unknown>).$lte = new Date(req.to);
      }

      const history = await db
        .collection("watering_logs")
        .find(filter)
        .sort({ wateredAt: -1 })
        .limit(limit)
        .toArray();

      return successResponse(
        history.map((r) => ({
          deviceId: r.deviceId,
          userId: r.userId,
          plantIndex: r.plantIndex,
          level: r.level,
          wateredAt: r.wateredAt,
        })),
      );
    } catch (error) {
      console.error("Get watering history error:", error);
      return errorResponse("Ошибка получения истории", "WATERING_HISTORY_ERROR");
    }
  },
);
