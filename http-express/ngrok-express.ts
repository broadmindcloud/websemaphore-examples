import { Application } from "express";

const express = require("express");
const ngrok = require("@ngrok/ngrok");
// const app = express();


export async function tunnelViaNgrok(app: Express.Application, onConnect?: (tunnelUrl: string, app: Express.Application) => void) {
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

    onConnect && onConnect(tunnel.url(), app);

    return app;
}

export const tunnel = (app: Application, onConnect: (tunnelUrl: string, app: Express.Application) => void) => {
    tunnelViaNgrok(app, onConnect);
    return app;
}