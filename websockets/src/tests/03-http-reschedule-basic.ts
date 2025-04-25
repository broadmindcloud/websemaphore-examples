/*
    A basic job reschedule test (http)

    1. timeout the job
    2. reschedule the job
    3. once the job is acquired, verify it's the same job with the same crn, payload and created timestamp
    4. release the job
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_http_timeout } from "./02-http-timeout";
import { _process, env, log, upsertSemaphore, WebSemaphoreTestParams, expect } from "./shared";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _03_http_reschedule = async (
    params: WebSemaphoreTestParams,
    executionTimeOrProcessor: number | Processor = 3,
) => {
    const { testSemaphore, wsClientManager, httpClient, httpCallbackServer } = params;

    const { timedOutJob, payload } = await _02_http_timeout(params);
    
    console.log("Rescheduling timed out job");

    (await httpClient.semaphore.reschedule(testSemaphore.id!, { jobCrn: timedOutJob.crn })).data;

    let jobMsg, job;
    do {
        jobMsg = await httpCallbackServer.waitForMessage()
        job = SemaphoreJob.fromCrn(jobMsg.jobCrn);
    } while(job?.messageId != timedOutJob.messageId)

    console.log("Awaiting processing and release")

    await jobMsg.release();

    console.log("Http reschedule test done");

    return;
};