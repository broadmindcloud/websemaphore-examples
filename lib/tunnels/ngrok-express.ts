import { Application } from "express";

import ngrok from "@ngrok/ngrok";

export async function tunnelViaNgrok(_port: number) { //app: Application
    // create session
    // const session = await new ngrok.SessionBuilder()
    //     .authtokenFromEnv()
    //     .metadata("Websemaphore callback test/demo")
    //     .connect();
    // // create tunnel
    // let tunnel = await session
    //     .httpEndpoint()
    //     // .allowCidr("0.0.0.0/0")
    //     // .oauth("google")
    //     // .requestHeader("X-Req-Yup", "true")
    //     .listen();
    // link tunnel to app

    let socket = await ngrok.forward({ port: _port, authtoken_from_env: true });
    console.log(`Ingress established at: ${socket.url()} -> ${_port}`);

    const restart = async () => {
        // await socket.close();
        await ngrok.disconnect(socket.url());
        console.log("Presumably closed", socket.url());
        socket = await ngrok.forward({ port: _port, authtoken_from_env: true });
        console.log("Forwarded again with", socket.url());

        return { host: socket.url(), tunnel, restart, stop };
    };

    const stop = async () => {
        console.log("Stopping tunnel");
        await ngrok.disconnect(socket.url());
        await ngrok.kill();
    }

    return { host: socket.url(), tunnel, restart, stop };
}

export const tunnel = (_port: number) => { //server: import("net").Server, _port: number) => {
    return tunnelViaNgrok(_port);
}