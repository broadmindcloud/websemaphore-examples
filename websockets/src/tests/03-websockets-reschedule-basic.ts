/*
    A basic job reschedule test (websockets)

    1. timeout the job
    2. reschedule the job
    3. once the job is acquired, verify it's the same job with the same crn, payload and created timestamp
    4. release the job
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { _process, expect } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _03_websockets_reschedule = async (app:  WebsemaphreTestSetup) => {

    const { timedOutJob, payload } = await _02_websockets_timeout(app);

    app.console.log({ timedOutJobCrn: timedOutJob.crn });

    await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

    const rescheduledJobResponse = await app.wsClientManager.client.reschedule({ jobCrn: timedOutJob.crn! });

    app.console.log("Successfully acquired _rescheduled_ job");
    const rescheduledJob = SemaphoreJob.fromCrn(rescheduledJobResponse.jobCrn)
    expect(
        rescheduledJob.created == timedOutJob.created,
        `Rescheduled job should have the same created timestamp as the original, but ${rescheduledJob.created} != ${timedOutJob.created}`
    );
    expect(JSON.stringify(rescheduledJobResponse.payload) == JSON.stringify(payload), `Rescheduled job has different payload: ${rescheduledJob.payload} != ${payload}`);

    await new Promise(r => setTimeout(r, 500));

    await rescheduledJobResponse.release();

    app.console.log("timedOutJob", timedOutJob.crn);
    app.console.log("rescheduledJob", rescheduledJob.crn);

    app.console.log("Basic timeout / reschedule scenario test susccessful")
};