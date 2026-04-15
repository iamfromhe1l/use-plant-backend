import { api } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { connectToDatabase } from "@/db/mongodb";
import { ObjectId } from "mongodb";
import { IApiResponse } from "@/types/error";
import { successResponse, errorResponse } from "@/helpers/response";
import { AuthData } from "@/auth/handler";
import { publishToDevice } from "@/commands/mqtt";
import {
  ICommand,
  ICommandDefinition,
  COMMANDS_REGISTRY,
  CommandType,
} from "@/commands/types";

interface ISendCommandRequest {
  deviceId: string;
  command: ICommand;
}

interface ISendCommandResponse {
  sent: boolean;
}

interface IGetCommandsRequest {
  deviceId: string;
}

const validCommandTypes = new Set<string>(
  COMMANDS_REGISTRY.map((c) => c.type),
);

export const sendCommand = api(
  { method: "POST", path: "/commands/send", expose: true, auth: true },
  async (
    req: ISendCommandRequest,
  ): Promise<IApiResponse<ISendCommandResponse>> => {
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

      if (!validCommandTypes.has(req.command.type)) {
        return errorResponse("Неизвестная команда", "INVALID_COMMAND");
      }

      await publishToDevice(req.deviceId, {
        type: req.command.type,
        payload: req.command.payload || {},
        timestamp: Date.now(),
      });

      await db.collection("command_logs").insertOne({
        deviceId: req.deviceId,
        userId: new ObjectId(userId),
        command: req.command,
        sentAt: new Date(),
      });

      return successResponse({ sent: true });
    } catch (error) {
      console.error("Send command error:", error);
      return errorResponse("Ошибка отправки команды", "COMMAND_SEND_ERROR");
    }
  },
);

export const getAvailableCommands = api(
  { method: "GET", path: "/commands/available", expose: true, auth: true },
  async (
    _req: IGetCommandsRequest,
  ): Promise<IApiResponse<ICommandDefinition[]>> => {
    return successResponse(COMMANDS_REGISTRY);
  },
);
