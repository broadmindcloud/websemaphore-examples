/*
    A basic job timeout test (http)
    1. timeout the job
    2. read the job and check that it's in timeout status
*/

import { _process, expect, upsertSemaphore } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _02_http_timeout = async (
    app: WebsemaphreTestSetup
) => {
    await upsertSemaphore(app.httpClient, {
        id: app.testSemaphore.id,
        timeout: { value: 2000 },
        isActive: true,
        mapping: { isActive: false },
        routing: [ { protocol: "http", address: app.httpSever.callbackUrl, method: "POST", isActive: true } ]
    });

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random(), randomId: Math.random() };

    app.console.log("Acquiring semaphore with", JSON.stringify(input));

    const timedOutJobMsg = await app.acquire(app.testSemaphore.id, input)

    app.console.log("Input:", JSON.stringify(input), "↳ Request lock", "   ↳ Acquired:", JSON.stringify(timedOutJobMsg.message));
    
    app.console.log("Waiting for timeout to kick in")
    await new Promise(res => setTimeout(res, 20000));

    const timedOutJob = (await app.httpClient.semaphore.readJob(app.testSemaphore.id!, { crn: timedOutJobMsg.jobCrn })).data;

    expect(input.id == timedOutJobMsg.message.id, "Unexpected message id");
    expect(timedOutJob.status == "timeout", "Job is not in timeout status");

    app.console.log("Awaiting processing and release")

    await timedOutJobMsg.release();

    app.console.log("Http timeout test done");

    return { timedOutJob, payload: input };
};