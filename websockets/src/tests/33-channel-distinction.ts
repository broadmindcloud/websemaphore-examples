/*
    Channel distintion test

    Each channel should be able to acquire a job independently
    1. Acquire a job on the default channel
    2. Acquire a job on the custom channel
    3. Release the job on the default channel
    4. Release the job on the custom channel
*/

import { SemaphoreJob } from "websemaphore/src";
import { expect, upsertSemaphore } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _33_channel_distinction = async (app: WebsemaphreTestSetup) => {
    const callbackUrl = app.httpSever.callbackUrl;

    app.console.log("Purging channelA")
    await app.httpClient.semaphore.purgeQueue(app.testSemaphore.id, { channelId: "channelA" });
    app.console.log("Purging channelB")
    await app.httpClient.semaphore.purgeQueue(app.testSemaphore.id, { channelId: "channelB" });

    await app.httpClient.semaphore.activate(app.testSemaphore.id, { channelId: "channelA" });
    await app.httpClient.semaphore.activate(app.testSemaphore.id, { channelId: "channelB" });

    await upsertSemaphore(app.httpClient, {
        isActive: true,
        maxValue: 1,
        mapping: { isActive: false},
        routing: [
            { protocol: "http", address: callbackUrl, method: "POST", isActive: true }
        ]
    });

    const inputA = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };
    const inputB = { "title": "EU", "Country": "CH", "engagement": 0.3, id: Math.random(), randomId: Math.random() };


    const jobMsgChA = await app.acquire({ semaphoreId: app.testSemaphore.id, channelId: "channelA" }, inputA);
    const jobMsgChB = await app.acquire({ semaphoreId: app.testSemaphore.id, channelId: "channelB" }, inputB);

    app.console.log("Job on channelA:", jobMsgChA.jobCrn);
    app.console.log("Job on channelB:", jobMsgChB.jobCrn);

    expect(SemaphoreJob.fromCrn(jobMsgChA.jobCrn).channel.id == "channelA", "Expected the message on channelA");
    expect(SemaphoreJob.fromCrn(jobMsgChB.jobCrn).channel.id == "channelB", "Expected the message on channelB");

    await jobMsgChA.release();
    await jobMsgChB.release();

    app.console.log("Job released on channelA and channelB");
}
