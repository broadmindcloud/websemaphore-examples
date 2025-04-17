import { SemaphoreJob } from "websemaphore/src";
import { expect, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";

export const _07_DeleteTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    const { timedOutJob } = await _02_TimeoutTest(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    console.log("Deleting the job:");
    const canceledJob = await wsClientManager.client.delete({ jobCrn: timedOutJob?.crn! });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    console.log("Reading the job:");

    const canceledJobRes = await httpClient.semaphore.readJob(testSemaphore.id, { crn: canceledJob.jobCrn });

    console.log("Canceled job CRN:", canceledJobRes.data.crn);
    expect(canceledJobRes.data.status == "archived", "Job is not in archived status");
    console.log("Successfully canceled job", canceledJob.status);
}
