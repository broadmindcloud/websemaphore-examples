/*
    The most basic happy path test for WebSemaphore (http)
    1. Acquire a lock
    2. Do some work
    3. Release the lock
*/

import { expect, upsertSemaphore } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _01_http_basic = async (
    app: WebsemaphreTestSetup
) => {
    const { testSemaphore, httpSever } = app;

    const sem = await upsertSemaphore(app.httpClient, {
        id: testSemaphore.id,
        timeout: { value: 15000 },
        isActive: true,
        mapping: { isActive: false },
        routing: [
            { protocol: "http", address: httpSever.callbackUrl, method: "POST", isActive: true }
        ]
    });

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };

    app.console.log("Acquiring semaphore")

    const jobMsg = await app.acquire(testSemaphore.id, input)

    app.console.log("Input:", JSON.stringify(input), "↳ Request lock", "   ↳ Acquired:", JSON.stringify(jobMsg.message));
    expect(input.id == jobMsg.message.id, "Unexpected message")

    app.console.log("Awaiting processing and release")

    await jobMsg.release();

    app.console.log("Basic http test done");

    return;
};