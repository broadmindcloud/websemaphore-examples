import { SemaphoreJob } from "websemaphore/src";
import { env, expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { _01_BasicTest } from "./01-websockets-basic";

/*
    This simulates a fallback http connection for cases when a websockets worker dropped while waiting to acquire a semaphore,
    and the job needs to be processed/forwarded to the user in a different way, e.g. order confirmation via email.

    1. configure the semaphore to accept websockets AND an http callback
    2. request a semaphore via websockets
    3. drop the connection
    4. expect to receive the job via the http callback

*/
const version = (callbackUrl: string, ver: "beta" | "v1") => ({
    beta: {
        callback:   { address: callbackUrl, isActive: true, method: "POST", protocol: "http" },
        websockets: { isActive: true }
    },
    v1: {
        routing: [
            { protocol: "websockets", isActive: true,                                       },
            { protocol: "http",       isActive: true, address: callbackUrl, method: "POST" }
        ]
    }
}[ver]);

export const _21_transport_http_fallback = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    const callbackUrl = httpCallbackServer.callbackUrl;

    console.log("Configuring failover http:", callbackUrl);

    await upsertSemaphore(params.httpClient, {
        id: env.SEMAPHORE_ID,
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            isActive: false,
        },
        ...version(callbackUrl, "v1")

    });

    const randomId = Math.random();
    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, randomId };

    // we acquire via websockets but dont await and instead get the message in http next
    wsClientManager.client.acquire({ semaphoreId: env.SEMAPHORE_ID!, sync: false, body: input, });
    wsClientManager.disconnect();

    await new Promise((res, rej) => {
        httpCallbackServer.setHttpProcessor(async (msg: any, { jobCrn }) => {
            console.log("Acquired:", JSON.stringify(msg))

            console.log("Input:", JSON.stringify(input));
            console.log("↳ Request lock");
            console.log("  ↳ Attempt websockets delivery ➝ client dropped");
            console.log("  ↳ Attempt http delivery:", JSON.stringify(msg));
            expect(msg.body.randomId == input.randomId, "Received an unexpected message.");

            try {
                console.log("Releasing via http...")
                await httpClient.semaphore.release(testSemaphore.id, { jobCrn })

                res({ ok: true })
            } catch (ex) {
                rej(ex)
            }
        })
    })
}

