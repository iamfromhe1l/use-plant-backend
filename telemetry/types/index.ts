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
  wateredAt: Date;
}
