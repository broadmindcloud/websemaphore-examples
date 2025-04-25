/*
    The most basic happy path test for WebSemaphore (http)
    1. Acquire a lock
    2. Do some work
    3. Release the lock
*/

import { _process, env, log, upsertSemaphore, WebSemaphoreTestParams, expect } from "./shared";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _01_http_basic = async (
    params: WebSemaphoreTestParams,
    executionTimeOrProcessor: number | Processor = 3,
) => {
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

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };

    console.log("Acquiring semaphore")

    const jobMsg = await httpCallbackServer.acquire(testSemaphore.id, input)

    console.log("Input:", JSON.stringify(input), "↳ Request lock", "   ↳ Acquired:", JSON.stringify(jobMsg.message));
    expect(input.id == jobMsg.message.id, "Unexpected message")

    console.log("Awaiting processing and release")

    await jobMsg.release();

    console.log("Basic http test done");

    return;
};