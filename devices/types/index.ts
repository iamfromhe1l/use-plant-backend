export type ITelemetryStatusLevel =
  | "poor"
  | "moderate"
  | "normal"
  | "good"
  | "excellent";

export type SensorField = "temperature" | "airHumidity" | "soilMoisture";
export type ComparisonOperator = "eq" | "gt" | "lt";

export interface ISensorRule {
  field: SensorField;
  operator: ComparisonOperator;
  value: number;
}

export interface ISchedule {
  time: string;
  days: number[];
}

export interface IWateringCondition {
  id: string;
  plantIndex: number;
  type: "sensor" | "schedule";
  level: number;
  interval: number;
  rules?: ISensorRule[];
  schedule?: ISchedule;
  enabled: boolean;
}

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
  presetId: string | null;
  wateringConditions: IWateringCondition[];
  telemetryStatusConfig: IPlantTelemetryStatusConfig;
}

export interface IDevice {
  deviceId: string;
  status: string;
  registeredAt: Date;
  lastSeen: Date;
  name: string;
  icon: string;
  telemetryIntervalMinutes: number;
  plants: IPlant[];
}

export const DEFAULT_TELEMETRY_INTERVAL_MINUTES = 5;

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

function normalizeSensorRule(rule: Partial<ISensorRule> | null | undefined): ISensorRule {
  const field = rule?.field;
  const operator = rule?.operator;

  return {
    field:
      field === "temperature" || field === "airHumidity" || field === "soilMoisture"
        ? field
        : "soilMoisture",
    operator: operator === "eq" || operator === "gt" || operator === "lt" ? operator : "lt",
    value: Number(rule?.value ?? 0),
  };
}

function normalizeSchedule(schedule?: Partial<ISchedule> | null): ISchedule {
  const time = typeof schedule?.time === "string" ? schedule.time : "08:00";
  const days = Array.isArray(schedule?.days)
    ? Array.from(
        new Set(
          schedule.days
            .map((day) => Number(day))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        ),
      ).sort((left, right) => left - right)
    : [];

  return { time, days };
}

export function normalizeWateringCondition(
  condition: Partial<IWateringCondition>,
  plantIndex: number,
): IWateringCondition {
  return {
    id:
      typeof condition.id === "string" && condition.id.trim().length > 0
        ? condition.id
        : `cond_${plantIndex}_${Date.now()}`,
    plantIndex,
    type: condition.type === "schedule" ? "schedule" : "sensor",
    level: Math.min(10, Math.max(1, Number(condition.level ?? 5))),
    interval: Math.min(360, Math.max(5, Number(condition.interval ?? 60))),
    rules: Array.isArray(condition.rules)
      ? condition.rules.slice(0, 4).map((rule) => normalizeSensorRule(rule))
      : undefined,
    schedule: condition.schedule ? normalizeSchedule(condition.schedule) : undefined,
    enabled: Boolean(condition.enabled ?? true),
  };
}

export function normalizeWateringConditions(
  conditions?: Partial<IWateringCondition>[] | null,
  plantIndex = 1,
): IWateringCondition[] {
  if (!Array.isArray(conditions)) {
    return [];
  }

  return conditions.map((condition) => normalizeWateringCondition(condition, plantIndex));
}

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
      presetId: null,
      wateringConditions: [],
      telemetryStatusConfig: normalizePlantTelemetryStatusConfig(),
    },
    {
      index: 2,
      name: "Растение 2",
      icon: "Flower2",
      presetId: null,
      wateringConditions: [],
      telemetryStatusConfig: normalizePlantTelemetryStatusConfig(),
    },
  ];
}

export function normalizePlant(
  plant: Partial<IPlant> & Pick<IPlant, "index" | "name" | "icon">,
): IPlant {
  return {
    index: plant.index,
    name: plant.name,
    icon: plant.icon,
    presetId: typeof plant.presetId === "string" && plant.presetId.length > 0 ? plant.presetId : null,
    wateringConditions: normalizeWateringConditions(plant.wateringConditions, plant.index),
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

function isTimeValid(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function isWateringConditionValid(condition: IWateringCondition, plantIndex: number) {
  if (!condition.id || condition.plantIndex !== plantIndex) {
    return false;
  }

  if (condition.level < 1 || condition.level > 10) {
    return false;
  }

  if (condition.interval < 5 || condition.interval > 360) {
    return false;
  }

  if (condition.type === "sensor") {
    return Array.isArray(condition.rules) && condition.rules.length > 0;
  }

  if (condition.type === "schedule") {
    return Boolean(
      condition.schedule &&
        isTimeValid(condition.schedule.time) &&
        condition.schedule.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    );
  }

  return false;
}
