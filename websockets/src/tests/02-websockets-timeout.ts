/*
    A basic job timeout test (websockets)
    1. timeout the job
    2. read the job and check that it's in timeout status
*/

import { _01_websockets_basic } from "./01-websockets-basic";
import { _process, upsertSemaphore, expect } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _02_websockets_timeout = async (app: WebsemaphreTestSetup) => {

    await upsertSemaphore(app.httpClient, { timeout: { value: 2000 }, isActive: true, routing: [{ protocol: "websockets", isActive: true }] });

    const { jobCrn: timedOutJobCrn, payload } = await _01_websockets_basic(app, { executionTimeSeconds: 25, skipConfig: true }) 

    const timedOutJob = (await app.httpClient.semaphore.readJob(app.testSemaphore.id!, { crn: timedOutJobCrn })).data;

    app.console.log("timedOutJob", timedOutJob)

    expect(timedOutJob.status == "timeout", "Job is not in timeout status");

    app.console.log("Timeout test successful with job CRN:", timedOutJobCrn);

    return { timedOutJob, payload };
};
