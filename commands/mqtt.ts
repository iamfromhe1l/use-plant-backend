import mqtt, { MqttClient } from "mqtt";
import * as dotenv from "dotenv";
import { connectToDatabase } from "@/db/mongodb";
import { ITelemetryMessage, IWateringMessage } from "@/telemetry/types";

dotenv.config();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";

let client: MqttClient | null = null;
let initialized = false;

async function handleTelemetry(message: ITelemetryMessage): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    await Promise.all([
      db.collection("telemetry").insertOne({
        deviceId: message.deviceId,
        plants: message.plants,
        receivedAt: now,
      }),
      db.collection("devices").updateOne(
        { deviceId: message.deviceId },
        { $set: { lastSeen: now } },
      ),
    ]);
  } catch (err) {
    console.error("[MQTT] Failed to save telemetry:", err);
  }
}

async function handleWatering(message: IWateringMessage): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const device = await db.collection("devices").findOne({ deviceId: message.deviceId });

    if (!device?.userId) {
      console.error("[MQTT] Failed to save watering: device not linked", message.deviceId);
      return;
    }

    await Promise.all([
      db.collection("watering_logs").insertOne({
        deviceId: message.deviceId,
        userId: device.userId,
        plantIndex: Number(message.plantIndex),
        level: Math.min(10, Math.max(1, Number(message.level ?? 5))),
        source:
          message.source === "condition_sensor" || message.source === "condition_schedule"
            ? message.source
            : "manual",
        wateredAt: new Date(),
      }),
      db.collection("devices").updateOne(
        { deviceId: message.deviceId },
        { $set: { lastSeen: new Date() } },
      ),
    ]);
  } catch (err) {
    console.error("[MQTT] Failed to save watering:", err);
  }
}

export function getMqttClient(): MqttClient {
  if (client && client.connected) {
    return client;
  }

  client = mqtt.connect(MQTT_BROKER_URL, {
    username: MQTT_USERNAME || undefined,
    password: MQTT_PASSWORD || undefined,
    clientId: `use-plant-backend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on("connect", () => {
    console.log("[MQTT] Connected to broker:", MQTT_BROKER_URL);
    client!.subscribe("devices/+/telemetry", { qos: 0 }, (err) => {
      if (err) {
        console.error("[MQTT] Telemetry subscribe error:", err.message);
      } else {
        console.log("[MQTT] Subscribed to devices/+/telemetry");
      }
    });
    client!.subscribe("devices/+/watering", { qos: 0 }, (err) => {
      if (err) {
        console.error("[MQTT] Watering subscribe error:", err.message);
      } else {
        console.log("[MQTT] Subscribed to devices/+/watering");
      }
    });
  });

  client.on("message", (topic: string, payload: Buffer) => {
    if (topic.endsWith("/telemetry")) {
      try {
        const message: ITelemetryMessage = JSON.parse(payload.toString());
        handleTelemetry(message);
      } catch (err) {
        console.error("[MQTT] Failed to parse telemetry:", err);
      }
      return;
    }

    if (topic.endsWith("/watering")) {
      try {
        const message: IWateringMessage = JSON.parse(payload.toString());
        handleWatering(message);
      } catch (err) {
        console.error("[MQTT] Failed to parse watering:", err);
      }
    }
  });

  client.on("error", (err) => {
    console.error("[MQTT] Connection error:", err.message);
  });

  client.on("reconnect", () => {
    console.log("[MQTT] Reconnecting...");
  });

  return client;
}

export function startMqttBridge(): void {
  if (initialized) {
    return;
  }

  initialized = true;
  getMqttClient();
}

export function publishToDevice(
  deviceId: string,
  message: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const mqttClient = getMqttClient();
    const topic = `devices/${deviceId}/commands`;
    const payload = JSON.stringify(message);

    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error("[MQTT] Publish error:", err.message);
        reject(err);
      } else {
        console.log(`[MQTT] Published to ${topic}:`, payload);
        resolve();
      }
    });
  });
}
