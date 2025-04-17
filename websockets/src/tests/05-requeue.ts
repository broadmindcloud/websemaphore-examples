import { SemaphoreJob } from "websemaphore/src";
import { expect, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";

export const _05_RequeueTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;

    // First, timeout the job
    const { timedOutJob, payload } = await _02_TimeoutTest(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    // Requeue the job using its CRN
    const requeuedJob = await wsClientManager.client.requeue({ jobCrn: timedOutJob.crn! });

    console.log("Successfully requeued job");

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

    console.log("Timed out job CRN:", timedOutJob.crn);
    console.log("Requeued job CRN:", requeuedJob.jobCrn);
    console.log("Requeue test successful");
};