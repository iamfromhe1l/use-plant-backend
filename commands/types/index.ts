export const COMMAND_TYPES = {
  WATER_PLANT_1: "water_plant_1",
  WATER_PLANT_2: "water_plant_2",
  SET_CONDITIONS: "set_conditions",
  SET_TELEMETRY_INTERVAL: "set_telemetry_interval",
  DEVICE_RESET: "device_reset",
} as const;

export type CommandType = (typeof COMMAND_TYPES)[keyof typeof COMMAND_TYPES];

export interface ICommand {
  type: CommandType;
  payload?: Record<string, unknown>;
}

export interface ICommandDefinition {
  type: CommandType;
  label: string;
  description: string;
  dangerous: boolean;
}

export const COMMANDS_REGISTRY: ICommandDefinition[] = [
  {
    type: COMMAND_TYPES.WATER_PLANT_1,
    label: "Полить растение 1",
    description: "Запуск полива для растения 1",
    dangerous: false,
  },
  {
    type: COMMAND_TYPES.WATER_PLANT_2,
    label: "Полить растение 2",
    description: "Запуск полива для растения 2",
    dangerous: false,
  },
  {
    type: COMMAND_TYPES.SET_CONDITIONS,
    label: "Обновить условия",
    description: "Отправка условий автоматического полива на устройство",
    dangerous: false,
  },
  {
    type: COMMAND_TYPES.SET_TELEMETRY_INTERVAL,
    label: "Интервал телеметрии",
    description: "Обновление интервала отправки телеметрии на устройство",
    dangerous: false,
  },
  {
    type: COMMAND_TYPES.DEVICE_RESET,
    label: "Сбросить устройство",
    description: "Полный сброс устройства к заводским настройкам",
    dangerous: true,
  },
];
