export interface IPlant {
  index: number;
  name: string;
  icon: string;
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
