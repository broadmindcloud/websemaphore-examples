import { SemaphoreJob } from "websemaphore/src";
import { env, panic, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";
import { _01_BasicTest } from "./01-basic";

/*
    This simulates a fallback http connection for cases when a websockets worker dropped while waiting to acquire a semaphore,
    and the job needs to be processed/forwarded to the user in a different way, e.g. order confirmation via email.

    1. configure the semaphore to accept websockets AND an http callback
    2. requests a semaphore via websockets
    3. drops the connection
    4. expects to receive the job via the http callback

*/

export const _21_transport_http_fallback = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;
    
    const callbackUrl = httpCallbackServer.callbackUrl;

    console.log("Configuring handler to ignore the websocket caller and instead use http at:", callbackUrl);

    // First, timeout the job
    await upsertSemaphore(params.httpClient, {
        id: env.SEMAPHORE_ID,
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            isActive: false,
        },
        callback: {
            address: callbackUrl,
            method: "POST",
            isActive: true,
            protocol: "http"            
        },
        websockets: {
            isActive: true
        }
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
            console.log("  ↳ Mapping");
            console.log("    ↳ Acquired:", JSON.stringify(msg));
            panic(msg.body.randomId == input.randomId, "Received an unexpected message.");
            
            try {
                await httpClient.semaphore.release(testSemaphore.id, { jobCrn })
            
                res(undefined)
            } catch (ex) {
                rej(ex)
            }
        })
    })
}

