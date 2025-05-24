/*
    This simulates a fallback http connection for cases when a websockets worker dropped while waiting to acquire a semaphore,
    and the job needs to be processed/forwarded to the user in a different way, e.g. order confirmation via email.

    1. configure the semaphore to accept websockets AND an http callback
    2. request a semaphore via websockets
    3. drop the connection
    4. expect to receive the job via the http callback

*/

import { env, expect, upsertSemaphore } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

const version = (callbackUrl: string, ver: "beta" | "v1") => ({
    beta: {
        callback: { address: callbackUrl, isActive: true, method: "POST", protocol: "http" },
        websockets: { isActive: true }
    },
    v1: {
        routing: {
            routes: [
                { protocol: "websockets", isActive: true, },
                { protocol: "http", isActive: true, address: callbackUrl, method: "POST" }
            ]
        }
    }
}[ver]);

export const _21_transport_http_fallback = async (app: WebsemaphreTestSetup) => {
    const { testSemaphore, wsClientManager, httpClient } = app;

    const callbackUrl = app.httpSever.callbackUrl;

    app.console.log("Configuring failover http:", callbackUrl);

    await upsertSemaphore(app.httpClient, {
        id: env.SEMAPHORE_ID,
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            isActive: false,
        },
        ...version(callbackUrl, "v1")
    });

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random() };

    // we acquire via websockets but dont await and instead get the message in http next
    const ap = wsClientManager.wsClient.send({
        action: "lock.acquire",
        payload: JSON.stringify({
            id: input.id,
            body: input,
        }),
        semaphoreId: app.testSemaphore.id
    });

    await wsClientManager.disconnect();

    const jobMsg = await app.waitForSpecificMessage(
        (jobMsg) => jobMsg?.message.body.id === input.id,
        { maxAttempts: 10, input });

    expect(!!jobMsg, "Didn't receive the expected message via http callback");

    await wsClientManager.reconnect();

    await jobMsg.release();

    await new Promise(res => setTimeout(res, 20000));


    app.console.log("Transport http fallback successful");
}

