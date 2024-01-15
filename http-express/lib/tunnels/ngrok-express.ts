import { Application } from "express";

const ngrok = require("@ngrok/ngrok");

export async function tunnelViaNgrok(app: Application) {
    // create session
    const session = await new ngrok.NgrokSessionBuilder()
        .authtokenFromEnv()
        .metadata("Websemaphore callback test/demo")
        .connect();
    // create tunnel
    const tunnel = await session
        .httpEndpoint()
        // .allowCidr("0.0.0.0/0")
        // .oauth("google")
        // .requestHeader("X-Req-Yup", "true")
        .listen();
    // link tunnel to app
    const socket = await ngrok.listen(app, tunnel);
    console.log(`Ingress established at: ${tunnel.url()}`);
    console.log(`Express listening on: ${socket.address()}`);

    return { app, host: tunnel.url() };
}

export const tunnel = (app: Application, _port: number) => {
    return tunnelViaNgrok(app);
}