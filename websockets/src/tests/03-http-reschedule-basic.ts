/*
    A basic job reschedule test (http)

    1. timeout the job
    2. reschedule the job
    3. once the job is acquired, verify it's the same job with the same crn, payload and created timestamp
    4. release the job
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_http_timeout } from "./02-http-timeout";
import { _process, upsertSemaphore } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _03_http_reschedule = async (
    app: WebsemaphreTestSetup
) => {
    const { timedOutJob, payload } = await _02_http_timeout(app);
    
    app.console.log("Rescheduling timed out job");

    (await app.httpClient.semaphore.reschedule(app.testSemaphore.id!, { jobCrn: timedOutJob.crn })).data;

    let jobMsg, job;
    do {
        jobMsg = await app.waitForMessage()
        job = SemaphoreJob.fromCrn(jobMsg.jobCrn);
    } while(job?.messageId != timedOutJob.messageId)

    app.console.log("Awaiting processing and release")

    await jobMsg.release();

    app.console.log("Http reschedule test done");

    return;
};