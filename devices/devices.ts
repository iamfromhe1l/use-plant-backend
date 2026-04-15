import { api } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { connectToDatabase } from "@/db/mongodb";
import { ObjectId } from "mongodb";
import { IApiResponse } from "@/types/error";
import { successResponse, errorResponse } from "@/helpers/response";
import crypto from "crypto";
import {
  createDefaultPlants,
  DEFAULT_TELEMETRY_INTERVAL_MINUTES,
  IDevice,
  IPlant,
  IPlantTelemetryStatusConfig,
  IWateringCondition,
  isPlantTelemetryStatusConfigValid,
  isWateringConditionValid,
  normalizePlant,
  normalizePlantTelemetryStatusConfig,
  normalizeWateringConditions,
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

interface IUpdateDeviceSettingsRequest {
  deviceId: string;
  name?: string;
  telemetryIntervalMinutes?: number;
  plants?: {
    plantIndex: number;
    name?: string;
    icon?: string;
    presetId?: string | null;
    telemetryStatusConfig?: IPlantTelemetryStatusConfig;
    wateringConditions?: IWateringCondition[];
  }[];
}

function serializeDevice(device: {
  deviceId: string;
  status: string;
  registeredAt: Date;
  lastSeen: Date;
  name: string;
  icon: string;
  telemetryIntervalMinutes?: number;
  plants?: IPlant[];
}): IDevice {
  return {
    deviceId: device.deviceId,
    status: device.status,
    registeredAt: device.registeredAt,
    lastSeen: device.lastSeen,
    name: device.name,
    icon: device.icon,
    telemetryIntervalMinutes: Math.min(
      60,
      Math.max(5, Number(device.telemetryIntervalMinutes ?? DEFAULT_TELEMETRY_INTERVAL_MINUTES)),
    ),
    plants: ((device.plants || createDefaultPlants()) as IPlant[]).map(normalizePlant),
  };
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
        telemetryIntervalMinutes: DEFAULT_TELEMETRY_INTERVAL_MINUTES,
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
      ).map((device) => serializeDevice(device as unknown as IDevice));

      return successResponse(devices);
    } catch (error) {
      console.error("Get devices error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);

export const updateDeviceSettings = api(
  { method: "PUT", path: "/devices/settings", expose: true, auth: true },
  async (
    req: IUpdateDeviceSettingsRequest,
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
      const requestedPlants = Array.isArray(req.plants) ? req.plants : [];
      const updatesByIndex = new Map(requestedPlants.map((plant) => [plant.plantIndex, plant]));

      const updatedPlants = currentPlants.map((plant) => {
        const plantUpdate = updatesByIndex.get(plant.index);
        if (!plantUpdate) {
          return plant;
        }

        const nextTelemetryStatusConfig = plantUpdate.telemetryStatusConfig
          ? normalizePlantTelemetryStatusConfig(plantUpdate.telemetryStatusConfig)
          : plant.telemetryStatusConfig;

        const nextWateringConditions =
          plantUpdate.wateringConditions !== undefined
            ? normalizeWateringConditions(plantUpdate.wateringConditions, plant.index)
            : plant.wateringConditions;

        return {
          ...plant,
          name:
            typeof plantUpdate.name === "string" && plantUpdate.name.trim().length > 0
              ? plantUpdate.name.trim()
              : plant.name,
          icon:
            typeof plantUpdate.icon === "string" && plantUpdate.icon.trim().length > 0
              ? plantUpdate.icon.trim()
              : plant.icon,
          presetId:
            plantUpdate.presetId === null
              ? null
              : typeof plantUpdate.presetId === "string" && plantUpdate.presetId.trim().length > 0
                ? plantUpdate.presetId.trim()
                : plant.presetId,
          telemetryStatusConfig: nextTelemetryStatusConfig,
          wateringConditions: nextWateringConditions,
        };
      });

      for (const plant of updatedPlants) {
        if (!isPlantTelemetryStatusConfigValid(plant.telemetryStatusConfig)) {
          return errorResponse("Некорректные диапазоны телеметрии", "INVALID_THRESHOLDS");
        }

        if (
          plant.wateringConditions.some((condition) => !isWateringConditionValid(condition, plant.index))
        ) {
          return errorResponse("Некорректные условия полива", "INVALID_CONDITIONS");
        }
      }

      const nextTelemetryIntervalMinutes =
        req.telemetryIntervalMinutes !== undefined
          ? Math.min(60, Math.max(5, Number(req.telemetryIntervalMinutes)))
          : Math.min(
              60,
              Math.max(5, Number(device.telemetryIntervalMinutes ?? DEFAULT_TELEMETRY_INTERVAL_MINUTES)),
            );

      const nextDeviceName =
        typeof req.name === "string" && req.name.trim().length > 0 ? req.name.trim() : device.name;

      await db.collection("devices").updateOne(
        { deviceId: req.deviceId, userId: new ObjectId(userId) },
        {
          $set: {
            name: nextDeviceName,
            telemetryIntervalMinutes: nextTelemetryIntervalMinutes,
            plants: updatedPlants,
          },
        },
      );

      return successResponse(
        serializeDevice({
          deviceId: device.deviceId,
          status: device.status,
          registeredAt: device.registeredAt,
          lastSeen: device.lastSeen,
          name: nextDeviceName,
          icon: device.icon,
          telemetryIntervalMinutes: nextTelemetryIntervalMinutes,
          plants: updatedPlants,
        }),
      );
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
