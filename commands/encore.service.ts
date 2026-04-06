import { Service } from "encore.dev/service";
import { startMqttBridge } from "@/commands/mqtt";

// Start the MQTT subscriber when the commands service boots,
// so telemetry is ingested even before any command endpoint is called.
startMqttBridge();

export default new Service("commands");
