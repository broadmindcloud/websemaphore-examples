/*
    Delete a job in timeout status (http)

    1. acquire a job
    2. timeout the job
    3. delete the job
    4. read the job and check that it's in archived status
*/

import { expect, WebSemaphoreTestParams } from "./shared";
import { _02_http_timeout } from "./02-http-timeout";

export const _07_http_DeleteTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    const { timedOutJob } = await _02_http_timeout(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    console.log("Deleting the job:");
    const canceledJob = await wsClientManager.client.delete({ jobCrn: timedOutJob?.crn! });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    console.log("Reading the job:");

    const deletedJobRes = await httpClient.semaphore.readJob(testSemaphore.id, { crn: canceledJob.jobCrn });

    console.log("Canceled job CRN:", deletedJobRes.data.crn);
    expect(deletedJobRes.data.status == "archived", "Job is not in archived status");
    console.log("Successfully canceled job", canceledJob.status);
}
