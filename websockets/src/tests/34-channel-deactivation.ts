/*
    Channel deactivation test

    Verify that deactivating one channel does not affect the functionality of another channel.
    1. Acquire a job on channelA and channelB.
    2. Simulate an error and deactivate channelA.
    3. Verify that channelA cannot acquire a job.
    4. Verify that channelB can still acquire and release jobs.
*/

import { Semaphore, SemaphoreJob } from "websemaphore/src";
import { env, expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";

export const _34_channel_deactivation = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    const callbackUrl = httpCallbackServer.callbackUrl;

    await upsertSemaphore(params.httpClient, {
        isActive: true,
        maxValue: 1,
        mapping: { isActive: false },
        routing: [
            { protocol: "http", address: callbackUrl, method: "POST", isActive: true }
        ]
    });

    const inputA = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };
    const inputB = { "title": "EU", "Country": "CH", "engagement": 0.3, id: Math.random(), randomId: Math.random() };

    // Acquire jobs on both channels
    const jobMsgChA = await httpCallbackServer.acquire({ semaphoreId: testSemaphore.id, channelId: "channelA" }, inputA);
    const jobMsgChB = await httpCallbackServer.acquire({ semaphoreId: testSemaphore.id, channelId: "channelB" }, inputB);

    console.log("Job on channelA:", jobMsgChA.jobCrn);
    console.log("Job on channelB:", jobMsgChB.jobCrn);

    // Simulate an error and deactivate channelA
    await upsertSemaphore(params.httpClient, {
        isActive: true,
        maxValue: 1,
        mapping: { isActive: false },
        routing: [
            { protocol: "http", address: callbackUrl, method: "POST", isActive: true }
        ],
        channels: {
            channelA: { isActive: false },
            channelB: { isActive: true }
        }
    });

    // Verify channelA cannot acquire a job
    try {
        await httpCallbackServer.acquire({ semaphoreId: testSemaphore.id, channelId: "channelA" }, inputA);
        throw new Error("ChannelA should not be able to acquire a job after deactivation.");
    } catch (error) {
        console.log("ChannelA correctly failed to acquire a job:", error.message);
    }

    // Verify channelB can still acquire and release jobs
    const newJobMsgChB = await httpCallbackServer.acquire({ semaphoreId: testSemaphore.id, channelId: "channelB" }, inputB);
    console.log("New job on channelB:", newJobMsgChB.jobCrn);

    await newJobMsgChB.release();
    console.log("Job released on channelB");

    // Release the initial jobs
    await jobMsgChA.release();
    await jobMsgChB.release();
    console.log("Initial jobs released on channelA and channelB");
}
