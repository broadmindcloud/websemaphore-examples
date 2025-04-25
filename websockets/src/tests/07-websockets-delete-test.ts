/*
    Delete a job in timeout status (websockets)

    1. acquire a job
    2. timeout the job
    3. delete the job
    4. read the job and check that it's in archived status
*/

import { expect, WebSemaphoreTestParams } from "./shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";

export const _07_DeleteTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    const { timedOutJob } = await _02_websockets_timeout(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    console.log("Deleting the job:");
    const canceledJob = await httpClient.semaphore.delete(testSemaphore.id, { jobCrn: timedOutJob?.crn! });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    console.log("Reading the job:");

    const canceledJobRes = await httpClient.semaphore.readJob(testSemaphore.id, { crn: timedOutJob?.crn });

    console.log("Canceled job CRN:", canceledJobRes.data.crn);
    expect(canceledJobRes.data.status == "archived", "Job is not in archived status");
    console.log("Successfully canceled job", canceledJob.status);
}
