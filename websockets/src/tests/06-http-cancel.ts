/*
    Cancel a job during processing (inflight) (http)
    1. timeout the job
    2. cancel the job
    3. read the job and check that it's in archived status
*/

import { expect, upsertSemaphore } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { _01_http_basic } from "./01-http-basic";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _06_http_cancel = async (app: WebsemaphreTestSetup) => {
    const { testSemaphore, httpClient } = app;

    const sem = await upsertSemaphore(app.httpClient, {
        id: testSemaphore.id,
        timeout: { value: 15000 },
        isActive: true,
        mapping: { isActive: false },
        routing: [
            { protocol: "http", address: app.httpSever.callbackUrl, method: "POST", isActive: true }
        ]
    });

    await httpClient.semaphore.purgeQueue(testSemaphore.id, { channelId: "default" });
    await httpClient.semaphore.activate(testSemaphore.id, { channelId: "default" });

    const { jobCrn } = await app.acquire(testSemaphore.id, { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() });

    app.console.log("Cancelling job CRN:", jobCrn);

    await httpClient.semaphore.cancel(testSemaphore.id, { jobCrn: jobCrn });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    app.console.log("Reading the job");

    const canceledJobRes = await httpClient.semaphore.readJob(testSemaphore.id, { crn: jobCrn });

    app.console.log("Canceled job CRN:", canceledJobRes.data.crn);
    expect(canceledJobRes.data.status == "archived", "Job is not in archived status");
    app.console.log("Successfully canceled job", canceledJobRes.status);
}
