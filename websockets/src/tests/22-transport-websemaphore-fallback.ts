import { Semaphore, SemaphoreJob } from "websemaphore/src";
import { env, expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";
import { _01_BasicTest } from "./01-basic";

/*
    This simulates a fallback to another websemaphore when all other options are exhausted
    and the job needs to be processed/forwarded to the user in a different way, e.g. order confirmation via email.
    Call SA the usual test semaphore and configure it to fall back to a new semaphore SB.

    1. create another semaphore SB
    1. configure the semaphore SA to accept websockets, a nonsense http callback and websemaphore socket SB
    2. request a semaphore via websockets
    3. drop the connection
    4. expect to receive the job via the http callback of semaphore SB

*/
const version = (semaphoreChannel: string, ver: "beta" | "v1") => ({
    beta: {
        callback: { address: "intentionally-wrong-address", method: "POST", isActive: true, protocol: "http" },
        websockets: { isActive: true },
    },
    v1: {
        routing: [
            { protocol: "websockets", isActive: true },
            { protocol: "http", isActive: true, address: "intentionally-wrong-address", method: "POST" },
            { protocol: "websemaphore", isActive: true, address: semaphoreChannel },
        ],
    },
}[ver]);

export const _22_transport_websemaphore_fallback = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    const callbackUrl = httpCallbackServer.callbackUrl;

    console.log("Configuring failover http:", callbackUrl);

    const user = await httpClient.user.current();

    const failoverSemaphore = new Semaphore({ owner: user.data.id, id: env.SEMAPHORE_ID_FAILOVER })

    await upsertSemaphore(params.httpClient, {
        id: env.SEMAPHORE_ID,
        title: "Test Semaphore",
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            isActive: false,
        },
        ...version(failoverSemaphore.crn, "v1")

    });

    await upsertSemaphore(params.httpClient, {
        id: env.SEMAPHORE_ID_FAILOVER,
        title: "Test Semaphore Failover Target",
        timeout: { value: 15000 },
        isActive: true,
        routing: [
            {
                protocol: "http",
                address: callbackUrl,
                method: "POST",
                isActive: true
            }
        ]
    });

    const randomId = Math.random();
    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, randomId, willFailOver1: true };

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

                res(undefined)
            } catch (ex) {
                rej(ex)
            }
        })
    })
}

