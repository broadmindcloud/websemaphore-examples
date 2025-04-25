/*
    A basic job timeout test (websockets)
    1. timeout the job
    2. read the job and check that it's in timeout status
*/

import { _01_BasicTest } from "./01-websockets-basic";
import { expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";

export const _02_websockets_timeout = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, } = params;

    await upsertSemaphore(httpClient, { timeout: { value: 2000 } });

    const { jobCrn: timedOutJobCrn, payload } = await _01_BasicTest(params, 25) 

    const timedOutJob = (await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJobCrn })).data;

    console.log("timedOutJob", timedOutJob)

    expect(timedOutJob.status == "timeout", "Job is not in timeout status");

    console.log("Timeout test successful with job CRN:", timedOutJobCrn);

    return { timedOutJob, payload };
};
