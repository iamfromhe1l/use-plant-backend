import { api } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { connectToDatabase } from "@/db/mongodb";
import { ObjectId } from "mongodb";
import { IApiResponse } from "@/types/error";
import { successResponse, errorResponse } from "@/helpers/response";
import crypto from "crypto";
import {
  createDefaultPlants,
  IDevice,
  IPlant,
  IPlantTelemetryStatusConfig,
  isPlantTelemetryStatusConfigValid,
  normalizePlant,
  normalizePlantTelemetryStatusConfig,
} from "@/devices/types";
import { AuthData } from "@/auth/handler";

interface IRegisterDeviceRequest {
  deviceId: string;
}

interface IRegisterDeviceResponse {
  deviceSecret: string;
  mqttEndpoint: string;
}

interface ILinkDeviceRequest {
  deviceId: string;
  deviceSecret: string;
}

interface IGetUserDevicesRequest {}

interface IUpdateDeviceTelemetrySettingsRequest {
  deviceId: string;
  plantConfigs: {
    plantIndex: number;
    telemetryStatusConfig: IPlantTelemetryStatusConfig;
  }[];
}

export const registerDevice = api(
  { method: "POST", path: "/devices/register", expose: true, auth: true },
  async (
    req: IRegisterDeviceRequest,
  ): Promise<IApiResponse<IRegisterDeviceResponse>> => {
    try {
      const { db } = await connectToDatabase();
      const userId = getAuthData<AuthData>()!.userID;

      const existingDevice = await db.collection("devices").findOne({
        deviceId: req.deviceId,
      });

      if (existingDevice) {
        return errorResponse(
          "Устройство уже зарегистрировано",
          "DEVICE_EXISTS",
        );
      }

      const deviceSecret = crypto.randomBytes(32).toString("hex");

      await db.collection("devices").insertOne({
        deviceId: req.deviceId,
        userId: new ObjectId(userId),
        deviceSecret,
        registeredAt: new Date(),
        lastSeen: new Date(),
        status: "active",
        name: "Моё устройство",
        icon: "Sprout",
        plants: createDefaultPlants(),
      });

      return successResponse({
        deviceSecret,
        mqttEndpoint: process.env.MQTT_ENDPOINT || "wss://mqtt.example.com",
      });
    } catch (error) {
      console.error("Device registration error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const getUserDevices = api(
  { method: "GET", path: "/devices", expose: true, auth: true },
  async (_req: IGetUserDevicesRequest): Promise<IApiResponse<IDevice[]>> => {
    try {
      const userId = getAuthData<AuthData>()!.userID;
      const { db } = await connectToDatabase();

      const devices = (
        await db
          .collection("devices")
          .find({ userId: new ObjectId(userId) })
          .project({ deviceSecret: 0 })
          .toArray()
      ).map((device) => ({
        deviceId: device.deviceId,
        status: device.status,
        registeredAt: device.registeredAt,
        lastSeen: device.lastSeen,
        name: device.name,
        icon: device.icon,
        plants: ((device.plants || createDefaultPlants()) as IPlant[]).map(normalizePlant),
      }));

      return successResponse(devices);
    } catch (error) {
      console.error("Get devices error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const updateDeviceTelemetrySettings = api(
  { method: "PUT", path: "/devices/settings", expose: true, auth: true },
  async (
    req: IUpdateDeviceTelemetrySettingsRequest,
  ): Promise<IApiResponse<IDevice>> => {
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

      const currentPlants = ((device.plants || createDefaultPlants()) as IPlant[]).map(normalizePlant);
      const configByIndex = new Map(
        req.plantConfigs.map((config) => [
          config.plantIndex,
          normalizePlantTelemetryStatusConfig(config.telemetryStatusConfig),
        ]),
      );

      for (const [, config] of configByIndex) {
        if (!isPlantTelemetryStatusConfigValid(config)) {
          return errorResponse("Некорректные диапазоны телеметрии", "INVALID_THRESHOLDS");
        }
      }

      const updatedPlants = currentPlants.map((plant) => ({
        ...plant,
        telemetryStatusConfig:
          configByIndex.get(plant.index) ?? normalizePlantTelemetryStatusConfig(plant.telemetryStatusConfig),
      }));

      await db.collection("devices").updateOne(
        { deviceId: req.deviceId, userId: new ObjectId(userId) },
        { $set: { plants: updatedPlants } },
      );

      return successResponse({
        deviceId: device.deviceId,
        status: device.status,
        registeredAt: device.registeredAt,
        lastSeen: device.lastSeen,
        name: device.name,
        icon: device.icon,
        plants: updatedPlants,
      });
    } catch (error) {
      console.error("Update device settings error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const linkDevice = api(
  { method: "POST", path: "/devices/link", expose: true, auth: true },
  async (
    req: ILinkDeviceRequest,
  ): Promise<IApiResponse<{ success: boolean }>> => {
    try {
      const userId = getAuthData<AuthData>()!.userID;
      const { db } = await connectToDatabase();

      const device = await db.collection("devices").findOne({
        deviceId: req.deviceId,
        deviceSecret: req.deviceSecret,
      });

      if (!device) {
        return errorResponse("Устройство не найдено", "DEVICE_NOT_FOUND");
      }

      await db
        .collection("devices")
        .updateOne(
          { deviceId: req.deviceId },
          { $set: { userId: new ObjectId(userId), status: "active", lastSeen: new Date() } },
        );

      return successResponse({ success: true });
    } catch (error) {
      console.error("Link device error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);
