import { SemaphoreJob } from "websemaphore/src";
import { panic, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";

export const _22_transport_websemaphore_fallback = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    const { timedOutJob } = await _02_TimeoutTest(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    console.log("Canceling the job:");
    const canceledJob = await wsClientManager.client.cancel({ jobCrn: timedOutJob?.crn! });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    console.log("Reading the job:");
    const canceledJobRes = await httpClient.semaphore.readJob({ crn: canceledJob.jobCrn, status: "archived" } as any);
    console.log("Canceled job CRN:", canceledJobRes.data.crn);
    panic(canceledJob.status == "canceled", "Job is not in canceled status");
    console.log("Successfully canceled job", canceledJob.status);
}
