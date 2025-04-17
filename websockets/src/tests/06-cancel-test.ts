import { SemaphoreJob } from "websemaphore/src";
import { expect, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";
import { _01_BasicTest } from "./01-basic";

/*
    A job can be
*/
export const _06_CancelTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    const { jobCrn } = await _01_BasicTest(
        params,
        async (data, { jobCrn }) => {
            console.log("Starting processing...");

            await new Promise((res) => setTimeout(res, 500));

            console.log("During processing: Canceling the job");

            await wsClientManager.client.cancel({ jobCrn });
        });

    console.log("Cancelled out job CRN:", jobCrn);


    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    console.log("Reading the job");

    const canceledJobRes = await httpClient.semaphore.readJob(testSemaphore.id, { crn: jobCrn });

    console.log("Canceled job CRN:", canceledJobRes.data.crn);
    expect(canceledJobRes.data.status == "archived", "Job is not in archived status");
    console.log("Successfully canceled job", canceledJobRes.status);
}
