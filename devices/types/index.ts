export type ITelemetryStatusLevel =
  | "poor"
  | "moderate"
  | "normal"
  | "good"
  | "excellent";

export interface ITelemetryMetricThresholds {
  low: {
    poor: number;
    moderate: number;
    normal: number;
    good: number;
  };
  high: {
    good: number;
    normal: number;
    moderate: number;
    poor: number;
  };
}

export interface IPlantTelemetryStatusConfig {
  temperature: ITelemetryMetricThresholds;
  airHumidity: ITelemetryMetricThresholds;
  soilMoisture: ITelemetryMetricThresholds;
}

export interface IPlant {
  index: number;
  name: string;
  icon: string;
  telemetryStatusConfig: IPlantTelemetryStatusConfig;
}

export interface IDevice {
  deviceId: string;
  status: string;
  registeredAt: Date;
  lastSeen: Date;
  name: string;
  icon: string;
  plants: IPlant[];
}

export const DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG: IPlantTelemetryStatusConfig = {
  temperature: {
    low: { poor: 5, moderate: 12, normal: 18, good: 21 },
    high: { good: 27, normal: 30, moderate: 34, poor: 40 },
  },
  airHumidity: {
    low: { poor: 15, moderate: 25, normal: 35, good: 45 },
    high: { good: 60, normal: 70, moderate: 80, poor: 90 },
  },
  soilMoisture: {
    low: { poor: 10, moderate: 20, normal: 30, good: 40 },
    high: { good: 75, normal: 85, moderate: 92, poor: 100 },
  },
};

function normalizeMetricThresholds(
  thresholds?: Partial<ITelemetryMetricThresholds> | null
): ITelemetryMetricThresholds {
  return {
    low: {
      poor: Number(thresholds?.low?.poor ?? 0),
      moderate: Number(thresholds?.low?.moderate ?? 0),
      normal: Number(thresholds?.low?.normal ?? 0),
      good: Number(thresholds?.low?.good ?? 0),
    },
    high: {
      good: Number(thresholds?.high?.good ?? 100),
      normal: Number(thresholds?.high?.normal ?? 100),
      moderate: Number(thresholds?.high?.moderate ?? 100),
      poor: Number(thresholds?.high?.poor ?? 100),
    },
  };
}

export function normalizePlantTelemetryStatusConfig(
  config?: Partial<IPlantTelemetryStatusConfig> | null
): IPlantTelemetryStatusConfig {
  return {
    temperature: normalizeMetricThresholds(
      config?.temperature ?? DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature
    ),
    airHumidity: normalizeMetricThresholds(
      config?.airHumidity ?? DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity
    ),
    soilMoisture: normalizeMetricThresholds(
      config?.soilMoisture ?? DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture
    ),
  };
}

export function createDefaultPlants(): IPlant[] {
  return [
    {
      index: 1,
      name: "Растение 1",
      icon: "Leaf",
      telemetryStatusConfig: normalizePlantTelemetryStatusConfig(),
    },
    {
      index: 2,
      name: "Растение 2",
      icon: "Flower2",
      telemetryStatusConfig: normalizePlantTelemetryStatusConfig(),
    },
  ];
}

export function normalizePlant(plant: Partial<IPlant> & Pick<IPlant, "index" | "name" | "icon">): IPlant {
  return {
    index: plant.index,
    name: plant.name,
    icon: plant.icon,
    telemetryStatusConfig: normalizePlantTelemetryStatusConfig(plant.telemetryStatusConfig),
  };
}

export function isMetricThresholdsValid(thresholds: ITelemetryMetricThresholds) {
  return (
    thresholds.low.poor <= thresholds.low.moderate &&
    thresholds.low.moderate <= thresholds.low.normal &&
    thresholds.low.normal <= thresholds.low.good &&
    thresholds.low.good <= thresholds.high.good &&
    thresholds.high.good <= thresholds.high.normal &&
    thresholds.high.normal <= thresholds.high.moderate &&
    thresholds.high.moderate <= thresholds.high.poor
  );
}

export function isPlantTelemetryStatusConfigValid(config: IPlantTelemetryStatusConfig) {
  return (
    isMetricThresholdsValid(config.temperature) &&
    isMetricThresholdsValid(config.airHumidity) &&
    isMetricThresholdsValid(config.soilMoisture)
  );
}
