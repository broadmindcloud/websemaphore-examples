import { WebsemaphoreHttpClient } from "websemaphore";
import { SemaphoreJob } from "websemaphore/src";
import { WebsocketsClientManager } from "websemaphore/src/clients/websockets/manager";
import { _02_TimeoutTest } from "./02-timeout";
import { panic, WebSemaphoreTestParams } from "./shared";

export const _03_RescheduleTest = async (params:  WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;

    const { timedOutJob, payload } = await _02_TimeoutTest(params);

    console.log({ timedOutJobCrn: timedOutJob.crn });

    await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

    const rescheduledJobResponse = await wsClientManager.client.reschedule({ jobCrn: timedOutJob.crn! });

    console.log("Successfully acquired _rescheduled_ job");
    const rescheduledJob = SemaphoreJob.fromCrn(rescheduledJobResponse.jobCrn)
    panic(
        rescheduledJob.created == timedOutJob.created,
        `Rescheduled job should have the same created timestamp as the original, but ${rescheduledJob.created} != ${timedOutJob.created}`
    );
    panic(JSON.stringify(rescheduledJobResponse.payload) == JSON.stringify(payload), `Rescheduled job has different payload: ${rescheduledJob.payload} != ${payload}`);

    await new Promise(r => setTimeout(r, 500));

    await rescheduledJobResponse.release();

    console.log("timedOutJob", timedOutJob.crn);
    console.log("rescheduledJob", rescheduledJob.crn);

    console.log("Basic timeout / reschedule scenario test susccessful")
};