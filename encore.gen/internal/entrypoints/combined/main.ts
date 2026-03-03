import { registerGateways, registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";

import { register as auth_registerImpl0 } from "../../../../auth/auth";
import { login as auth_loginImpl1 } from "../../../../auth/auth";


const gateways: any[] = [
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
];

registerGateways(gateways);
registerHandlers(handlers);

await run(import.meta.url);
