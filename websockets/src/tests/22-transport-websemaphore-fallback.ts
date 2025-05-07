import { Semaphore, SemaphoreJob } from "websemaphore/src";
import { env, expect, upsertSemaphore } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

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

export const _22_transport_websemaphore_fallback = async (app: WebsemaphreTestSetup) => {
    const { testSemaphore, wsClientManager, httpClient } = app;

    const callbackUrl = app.httpSever.callbackUrl;

    app.console.log("Configuring failover http:", callbackUrl);

    const user = await httpClient.user.current();

    const failoverSemaphore = new Semaphore({ owner: user.data.id, id: env.SEMAPHORE_ID_FAILOVER })

    await upsertSemaphore(app.httpClient, {
        id: env.SEMAPHORE_ID,
        title: "Test Semaphore",
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            isActive: false,
        },
        ...version(failoverSemaphore.crn, "v1")

    });

    await upsertSemaphore(app.httpClient, {
        id: env.SEMAPHORE_ID_FAILOVER,
        title: "Test Semaphore Failover Target",
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            isActive: false
        },
        routing: [
            {
                protocol: "http",
                address: callbackUrl,
                method: "POST",
                isActive: true
            }
        ]
    });

    app.console.log("Purging ", env.SEMAPHORE_ID_FAILOVER);

    await app.httpClient.semaphore.purgeQueue(env.SEMAPHORE_ID_FAILOVER, {})

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), willFailOver1: true };

    // we acquire via websockets but dont await and instead get the message in http next
    wsClientManager.client.acquire({ semaphoreId: env.SEMAPHORE_ID!, sync: false, body: input });
    wsClientManager.disconnect();

    const jobMsg = await app.waitForSpecificMessage((jobMsg) => {
        app.console.log("Received: ", jobMsg);
        const j = SemaphoreJob.fromCrn(jobMsg.jobCrn);
        return j.semaphore.id === env.SEMAPHORE_ID_FAILOVER && jobMsg?.message.body.id === input.id;
    }, { maxAttempts: 10, maxWaitTime: 30000 });

    await jobMsg.release();
}

