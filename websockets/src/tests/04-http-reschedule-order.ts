/*
    Reschedule job and verify request order is retained (http)
    
    This test checks if the order of jobs is preserved when rescheduling a job.
    It ensures that a rescheduled job is processed before any newer jobs that were scheduled after it.

    1. Create a semaphore and set it to active.
    2. Schedule a job and let it timeout.
    3. Deactivate the semaphore to prevent the newer job from processing while the first job is in timeout state.
    4. Schedule a new job.
    5. Reschedule the timed out job.
    6. Activate the semaphore to process the jobs.
    7. Verify that the rescheduled job is processed before the newer job.
    8. Release both jobs.
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_http_timeout } from "./02-http-timeout";
import { _process, upsertSemaphore, expect } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _04_http_reschedule_order = async (
    app: WebsemaphreTestSetup,
) => {
    const { timedOutJob, payload } = await _02_http_timeout(app);

    app.console.log("Rescheduling timed out job");

    await upsertSemaphore(app.httpClient, {
        id: app.testSemaphore.id,
        isActive: false,
    });

    app.console.log("Awaiting processing and release");

    // schedule another job
    const input2 = { "title": "EUC", "Country": "BE", "engagement": 0.34, id: Math.random(), randomId: Math.random() };

    await app.httpClient.semaphore.acquire(app.testSemaphore.id, input2 as any); // to fix: acquire input schema

    // reschedule the timed out job
    await app.httpClient.semaphore.reschedule(app.testSemaphore.id!, { jobCrn: timedOutJob.crn });

    await app.httpClient.semaphore.activate(app.testSemaphore.id, { channelId: "default" })

    const rescheduledJobMsg = await app.waitForMessage();

    app.console.log(`
        Expecting the timed out job: ${timedOutJob.crn}
        Acquired after reschedule: ${rescheduledJobMsg.jobCrn}
    `);

    expect(
        SemaphoreJob.fromCrn(rescheduledJobMsg.jobCrn).getStatusCrn("neutral") == SemaphoreJob.fromCrn(timedOutJob.crn!).getStatusCrn("neutral"),
        "rescheduled job should come first but didn't"
    );

    await rescheduledJobMsg.release();

    const jobMsg2 = await app.waitForMessage();

    app.console.log(`
        Expecting the next job: ${JSON.stringify(input2)}
        Acquired after reschedule: ${JSON.stringify(jobMsg2.message)}
    `);


    expect(jobMsg2.message.id == input2.id, "Second message id is not as expected")

    await jobMsg2.release();

    app.console.log("Http order reschedule test done");

    return;
};