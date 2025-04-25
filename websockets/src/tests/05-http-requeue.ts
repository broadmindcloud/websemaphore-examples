/*
    Requeue a timed out job using its CRN (http)
    1. timeout the job
    2. requeeue the job using its CRN
    3. once the job is acquired, veriy it's the same job (payload) with a different CRN and the new job is younger
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_http_timeout } from "./02-http-timeout";
import { WebSemaphoreTestParams, expect } from "./shared";

export const _05_HttpRequeueTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, httpClient, httpCallbackServer } = params;

    // First, timeout the job via HTTP
    const { timedOutJob, payload } = await _02_http_timeout(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    // Requeue the job using HTTP
    await httpClient.semaphore.requeue(testSemaphore.id!, { jobCrn: timedOutJob.crn });

    console.log("Successfully requeued job via HTTP");

    // Wait for the requeued job to be received
    const requeuedJobMsg = await httpCallbackServer.waitForMessage();

    // Validations
    expect(
        timedOutJob.crn !== requeuedJobMsg.jobCrn,
        "The requeued job must have a new CRN"
    );
    expect(
        SemaphoreJob.fromCrn(timedOutJob.crn!).created < SemaphoreJob.fromCrn(requeuedJobMsg.jobCrn).created,
        `The requeued job must be newer than the original job`
    );
    expect(
        JSON.stringify(requeuedJobMsg.message) === JSON.stringify(payload),
        "The requeued job must have the same payload as the original"
    );

    await requeuedJobMsg.release();

    console.log("Timed out job CRN:", timedOutJob.crn);
    console.log("Requeued job CRN:", requeuedJobMsg.jobCrn);
    console.log("HTTP requeue test successful");
};
