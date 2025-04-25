/*
    A basic job timeout test (http)
    1. timeout the job
    2. read the job and check that it's in timeout status
*/

import { _process, env, log, upsertSemaphore, WebSemaphoreTestParams, expect } from "./shared";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _02_http_timeout = async (
    params: WebSemaphoreTestParams,
    executionTimeOrProcessor: number | Processor = 3,
) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    await upsertSemaphore(params.httpClient, {
        id: testSemaphore.id,
        timeout: { value: 2000 },
        isActive: true,
        mapping: { isActive: false },
        routing: [ { protocol: "http", address: httpCallbackServer.callbackUrl, method: "POST", isActive: true } ]
    });

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };

    console.log("Acquiring semaphore with", JSON.stringify(input));

    const timedOutJobMsg = await httpCallbackServer.acquire(testSemaphore.id, input)

    console.log("Input:", JSON.stringify(input), "↳ Request lock", "   ↳ Acquired:", JSON.stringify(timedOutJobMsg.message));
    
    console.log("Waiting for timeout to kick in")
    await new Promise(res => setTimeout(res, 20000));

    const timedOutJob = (await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJobMsg.jobCrn })).data;

    expect(input.id == timedOutJobMsg.message.id, "Unexpected message id");
    expect(timedOutJob.status == "timeout", "Job is not in timeout status");

    console.log("Awaiting processing and release")

    await timedOutJobMsg.release();

    console.log("Http timeout test done");

    return { timedOutJob, payload: input };
};