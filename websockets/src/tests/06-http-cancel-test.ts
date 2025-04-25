/*
    Cancel a job during processing (inflight) (http)
    1. timeout the job
    2. cancel the job
    3. read the job and check that it's in archived status
*/

import { expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { _01_BasicTest } from "./01-websockets-basic";
import { _01_http_basic } from "./01-http-basic";

export const _06_http_CancelTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    const sem = await upsertSemaphore(params.httpClient, {
        id: testSemaphore.id,
        timeout: { value: 15000 },
        isActive: true,
        mapping: { isActive: false },
        routing: [
            { protocol: "http", address: httpCallbackServer.callbackUrl, method: "POST", isActive: true }
        ]
    });

    await httpClient.semaphore.purgeQueue(testSemaphore.id);
    await httpClient.semaphore.activate(testSemaphore.id, { channelId: "default" });

    const { jobCrn } = await httpCallbackServer.acquire(testSemaphore.id, { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() });

    console.log("Cancelling job CRN:", jobCrn);

    await httpClient.semaphore.cancel(testSemaphore.id, { jobCrn: jobCrn });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    console.log("Reading the job");

    const canceledJobRes = await httpClient.semaphore.readJob(testSemaphore.id, { crn: jobCrn });

    console.log("Canceled job CRN:", canceledJobRes.data.crn);
    expect(canceledJobRes.data.status == "archived", "Job is not in archived status");
    console.log("Successfully canceled job", canceledJobRes.status);
}
