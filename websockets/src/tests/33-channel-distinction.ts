/*
    Channel distintion test

    Each channel should be able to acquire a job independently
    1. Acquire a job on the default channel
    2. Acquire a job on the custom channel
    3. Release the job on the default channel
    4. Release the job on the custom channel
*/

import { Semaphore, SemaphoreJob } from "websemaphore/src";
import { env, expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { _01_BasicTest } from "./01-websockets-basic";

export const _33_channel_distinction = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    const callbackUrl = httpCallbackServer.callbackUrl;

    await upsertSemaphore(params.httpClient, {
        isActive: true,
        maxValue: 1,
        mapping: { isActive: false},
        routing: [
            { protocol: "http", address: callbackUrl, method: "POST", isActive: true }
        ]
    });

    const inputA = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };
    const inputB = { "title": "EU", "Country": "CH", "engagement": 0.3, id: Math.random(), randomId: Math.random() };

    const jobMsgChA = await httpCallbackServer.acquire({ semaphoreId: testSemaphore.id, channelId: "channelA" }, inputA);
    const jobMsgChB = await httpCallbackServer.acquire({ semaphoreId: testSemaphore.id, channelId: "channelB" }, inputB);

    console.log("Job on channelA:", jobMsgChA.jobCrn);
    console.log("Job on channelB:", jobMsgChB.jobCrn);

    await jobMsgChA.release();
    await jobMsgChB.release();

    console.log("Job released on channelA and channelB");
}
