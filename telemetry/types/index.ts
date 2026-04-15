export interface IPlantSensorData {
  index: number;
  temperature: number;
  airHumidity: number;
  soilMoisture: number;
}

export interface ITelemetryMessage {
  deviceId: string;
  timestamp: number;
  plants: IPlantSensorData[];
}

export interface IWateringMessage {
  deviceId: string;
  plantIndex: number;
  level: number;
  source: "manual" | "condition_sensor" | "condition_schedule";
  timestamp: number;
}

export interface ITelemetryRecord {
  deviceId: string;
  plants: IPlantSensorData[];
  receivedAt: Date;
}

export interface IWateringRecord {
  deviceId: string;
  userId: string;
  plantIndex: number;
  level: number;
  source: "manual" | "condition_sensor" | "condition_schedule";
  wateredAt: Date;
}
