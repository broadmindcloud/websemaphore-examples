/*
    Requeue a timed out job using its CRN (websockets)
    1. timeout the job
    2. requeeue the job using its CRN
    3. once the job is acquired, veriy it's the same job (payload) with a different CRN and the new job is younger
*/

import { SemaphoreJob } from "websemaphore/src";
import { expect } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _05_websockets_requeue = async (app: WebsemaphreTestSetup) => {

    // First, timeout the job
    const { timedOutJob, payload } = await _02_websockets_timeout(app);

    app.console.log("Timed out job CRN:", timedOutJob.crn);

    // Requeue the job using its CRN
    const requeuedJob = await app.wsClientManager.client.requeue({ jobCrn: timedOutJob.crn! });

    app.console.log("Successfully requeued job");

    debugger;

    // Validate that the requeued job has the same payload but a different CRN
    expect(
        SemaphoreJob.fromCrn(timedOutJob.crn!).clone("inflight").crn != requeuedJob.jobCrn,
        "The requeued job must have a new crn"
    );
    expect(
        SemaphoreJob.fromCrn(timedOutJob.crn!).created < SemaphoreJob.fromCrn(requeuedJob.jobCrn).created,
        `The requeued should job be younger than the original job ${SemaphoreJob.fromCrn(timedOutJob.crn!).created} !< ${SemaphoreJob.fromCrn(requeuedJob.jobCrn).created}`
    );
    expect(
        JSON.stringify(requeuedJob.payload) === JSON.stringify(payload),
        "The requeued must have the same payload as the original job"
    );

    await requeuedJob.release();

    app.console.log("Timed out job CRN:", timedOutJob.crn);
    app.console.log("Requeued job CRN:", requeuedJob.jobCrn);
    app.console.log("Requeue test successful");
};