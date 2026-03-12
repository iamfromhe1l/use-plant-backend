import { registerGateways, registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";

import { gateway as api_gatewayGW } from "../../../../auth/handler";
import { register as auth_registerImpl0 } from "../../../../auth/auth";
import { login as auth_loginImpl1 } from "../../../../auth/auth";
import { changePassword as auth_changePasswordImpl2 } from "../../../../auth/auth";
import { logout as auth_logoutImpl3 } from "../../../../auth/auth";
import { validateToken as auth_validateTokenImpl4 } from "../../../../auth/auth";
import { sendCommand as commands_sendCommandImpl5 } from "../../../../commands/commands";
import { getAvailableCommands as commands_getAvailableCommandsImpl6 } from "../../../../commands/commands";
import { registerDevice as devices_registerDeviceImpl7 } from "../../../../devices/devices";
import { getUserDevices as devices_getUserDevicesImpl8 } from "../../../../devices/devices";
import { linkDevice as devices_linkDeviceImpl9 } from "../../../../devices/devices";
import { getLatestTelemetry as telemetry_getLatestTelemetryImpl10 } from "../../../../telemetry/telemetry";
import { getTelemetryHistory as telemetry_getTelemetryHistoryImpl11 } from "../../../../telemetry/telemetry";
import { getWateringHistory as telemetry_getWateringHistoryImpl12 } from "../../../../telemetry/telemetry";


const gateways: any[] = [
    api_gatewayGW,
];

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "auth",
            name:              "register",
            handler:           auth_registerImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "auth",
            name:              "login",
            handler:           auth_loginImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "auth",
            name:              "changePassword",
            handler:           auth_changePasswordImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "auth",
            name:              "logout",
            handler:           auth_logoutImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "auth",
            name:              "validateToken",
            handler:           auth_validateTokenImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "commands",
            name:              "sendCommand",
            handler:           commands_sendCommandImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "commands",
            name:              "getAvailableCommands",
            handler:           commands_getAvailableCommandsImpl6,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "devices",
            name:              "registerDevice",
            handler:           devices_registerDeviceImpl7,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "devices",
            name:              "getUserDevices",
            handler:           devices_getUserDevicesImpl8,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "devices",
            name:              "linkDevice",
            handler:           devices_linkDeviceImpl9,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "telemetry",
            name:              "getLatestTelemetry",
            handler:           telemetry_getLatestTelemetryImpl10,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "telemetry",
            name:              "getTelemetryHistory",
            handler:           telemetry_getTelemetryHistoryImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
    {
        apiRoute: {
            service:           "telemetry",
            name:              "getWateringHistory",
            handler:           telemetry_getWateringHistoryImpl12,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":true,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: [],
    },
];

registerGateways(gateways);
registerHandlers(handlers);

await run(import.meta.url);
