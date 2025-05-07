/*
    Requeue a timed out job using its CRN (http)
    1. timeout the job
    2. requeeue the job using its CRN
    3. once the job is acquired, veriy it's the same job (payload) with a different CRN and the new job is younger
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_http_timeout } from "./02-http-timeout";
import { expect } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";
import { deepStrictEqual } from "assert";

export const _05_http_requeue = async (app: WebsemaphreTestSetup) => {

    // First, timeout the job via HTTP
    const { timedOutJob, payload } = await _02_http_timeout(app);

    app.console.log("Timed out job CRN:", timedOutJob.crn);

    // Requeue the job using HTTP
    await app.httpClient.semaphore.requeue(app.testSemaphore.id!, { jobCrn: timedOutJob.crn });

    app.console.log("Successfully requeued job via HTTP");

    // Wait for the requeued job to be received
    const requeuedJobMsg = await app.waitForMessage();

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
        !Object.keys(requeuedJobMsg.message).find(k => (payload as any)[k] != requeuedJobMsg.message[k]) && (Object.keys(requeuedJobMsg.message).length == Object.keys(payload).length),
        "The requeued job must have the same payload as the original. Received: " + `${JSON.stringify(requeuedJobMsg.message)}, expected: ${JSON.stringify(payload)}`
    );

    await requeuedJobMsg.release();

    app.console.log("Timed out job CRN:", timedOutJob.crn);
    app.console.log("Requeued job CRN:", requeuedJobMsg.jobCrn);
    app.console.log("HTTP requeue test successful");
};
