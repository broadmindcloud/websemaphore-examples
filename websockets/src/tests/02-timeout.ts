import { _01_BasicTest } from "./01-basic";
import { panic, upsertSemaphore, WebSemaphoreTestParams } from "./shared";

export const _02_TimeoutTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient, } = params;

    await upsertSemaphore(httpClient, { timeout: { value: 2000 } });

    const { jobCrn: timedOutJobCrn, payload } = await _01_BasicTest(params, 15);

    const timedOutJob = (await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJobCrn })).data;

    console.log("timedOutJob", timedOutJob)


    panic(timedOutJob.status == "timeout", "Job is not in timeout status");;

    console.log("Timeout test successful with job CRN:", timedOutJobCrn);

    return { timedOutJob, payload };
};
