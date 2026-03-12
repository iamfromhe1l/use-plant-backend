import { api } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { connectToDatabase } from "@/db/mongodb";
import { ObjectId } from "mongodb";
import { IApiResponse } from "@/types/error";
import { successResponse, errorResponse } from "@/helpers/response";
import crypto from "crypto";
import { IDevice } from "@/devices/types";
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
        plants: [
          { index: 1, name: "Растение 1", icon: "Leaf" },
          { index: 2, name: "Растение 2", icon: "Flower2" },
        ],
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
        plants: device.plants || [
          { index: 1, name: "Растение 1", icon: "Leaf" },
          { index: 2, name: "Растение 2", icon: "Flower2" },
        ],
      }));

      return successResponse(devices);
    } catch (error) {
      console.error("Get devices error:", error);
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
          { $set: { userId: new ObjectId(userId), status: "active" } },
        );

      return successResponse({ success: true });
    } catch (error) {
      console.error("Link device error:", error);
      return errorResponse("Внутренняя ошибка сервера", "INTERNAL_ERROR");
    }
  },
);
