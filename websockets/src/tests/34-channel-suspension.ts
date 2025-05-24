/*
    Channel deactivation test

    Verify that deactivating one channel does not affect the functionality of another channel.
    1. Acquire a job on channelA and channelB.
    2. Simulate an error and deactivate channelA.
    3. Verify that channelA cannot acquire a job.
    4. Verify that channelB can still acquire and release jobs.
*/

import { Semaphore, SemaphoreJob } from "websemaphore/src";
import { env, expect, upsertSemaphore } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _34_channel_suspension = async (app: WebsemaphreTestSetup) => {
    const { testSemaphore, wsClientManager, httpClient } = app;

    await upsertSemaphore(app.httpClient, {
        isActive: true,
        maxValue: 1,
        mapping: { isActive: false },
        routing: {
            routes: [
                { protocol: "http", address: app.httpSever.callbackUrl, method: "POST", isActive: true, onError: "suspend-channel" }
            ]
        },
        // timeout: { value: 15000 }
    });

    await httpClient.semaphore.purgeQueue(testSemaphore.id, { channelId: "channelA" });
    await httpClient.semaphore.purgeQueue(testSemaphore.id, { channelId: "channelB" });

    app.console.log("Activating channelA");
    await httpClient.semaphore.activate(testSemaphore.id, { channelId: "channelA" });
    // process.exit();

    app.console.log("Activating channelB");
    await httpClient.semaphore.activate(testSemaphore.id, { channelId: "channelB" });

    const inputA = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };
    const inputB = { "title": "EU", "Country": "CH", "engagement": 0.3, id: Math.random(), randomId: Math.random() };

    // Acquire jobs on both channels
    app.console.log("Acquiring semaphore on channelA");
    const jobMsgChA = await app.acquire({ semaphoreId: testSemaphore.id, channelId: "channelA" }, inputA);

    app.console.log("Acquired, restarting http server");

    await app.restartTunnel();

    app.console.log("Restarted http server, acquiring semaphore on channelB");

    // const { httpCallbackServer: httpCallbackServer2 } = await restartHttpServer();

    await app.acquire({ semaphoreId: testSemaphore.id, channelId: "channelB" }, inputB, { waitForMessage: false });

    // channel B should be suspended because the first callbackUrl is not available

    // TODO: verify that channelB is suspended

    await new Promise(res => setTimeout(res, 3000));

    const channelInfo = await app.httpClient.semaphore.readChannel(testSemaphore.id, { channelId: "channelB" });
    app.console.log("Channel info:", channelInfo.data);

    expect(!channelInfo.data.isActive, "ChannelB should be suspended");
    // now we update the callbackUrl to point to httpCallbackServer2

    await upsertSemaphore(app.httpClient, {
        isActive: true,
        maxValue: 1,
        mapping: { isActive: false },
        routing: {
            routes: [
                { protocol: "http", address: app.httpSever.callbackUrl, method: "POST", isActive: true, onError: "suspend-channel" }
            ]
        }
    });

    await new Promise(res => setTimeout(res, 1000));

    await httpClient.semaphore.activate(testSemaphore.id, { channelId: "channelB" });

    const jobMsgChB = await app.waitForMessage(); // the message should come from channelB

    app.console.log("Job on channelA:", jobMsgChA.jobCrn);
    app.console.log("Job on channelB:", jobMsgChB.jobCrn);

    await jobMsgChA.release();
    await jobMsgChB.release();
    app.console.log("Initial jobs released on channelA and channelB");
}
