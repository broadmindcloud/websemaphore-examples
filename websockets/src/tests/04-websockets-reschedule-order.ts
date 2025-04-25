/*
    Reschedule job and verify request order is retained  (websockets)
    
    This test checks if the order of jobs is preserved when rescheduling a job.
    It ensures that a rescheduled job is processed before any newer jobs that were scheduled after it.

    1. Create a semaphore and set it to active.
    2. Schedule a job and let it timeout.
    3. Deactivate the semaphore to prevent the newer job from processing while the first job is in timeout state.
    4. Schedule a new job.
    5. Reschedule the timed out job.
    6. Activate the semaphore to process the jobs.
    7. Verify that the rescheduled job is processed before the newer job.
    8. Release both jobs.
*/

import { SemaphoreJob } from "websemaphore/src";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { env, expect, WebSemaphoreTestParams } from "./shared";

// :::::: RESCHEDULE TEST ::::::
export const _04_RescheduleOrderRetentionTest = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // to properly test reschedule we need to create more jobs first
    // and then make sure the timed out job is performed BEFORE the newer jobs

    // so we call the timeout test first
    const { timedOutJob } = await _02_websockets_timeout(params);

    // stop the semaphore to prevent the job newer job from processing
    await httpClient.semaphore.upsert({ id: testSemaphore.id, isActive: false });

    // schedule the next job
    const laterJobPromise = wsClientManager.client.acquire({ semaphoreId: env.SEMAPHORE_ID, sync: false, body: { some: "abstract", data: 10 } });

    await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

    const rescheduledJobPromise = wsClientManager.client.reschedule({ jobCrn: timedOutJob.crn! });

    await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

    const queueItems = (await httpClient.semaphore.readQueue(testSemaphore.id!, { status: "scheduled" })).data;


    console.log("Items in queue before activation", queueItems.Items); // ?.map(qi => qi.crn)

    const arrivals = [] as { jobCrn: string, release: () => Promise<any> }[];

    laterJobPromise.then(({ jobCrn, release }: { jobCrn: string, release: () => Promise<any> }) => arrivals.push({ jobCrn, release }));
    rescheduledJobPromise.then(({ jobCrn, release }: { jobCrn: string, release: () => Promise<any> }) => arrivals.push({ jobCrn, release }));

    console.log("Activating");
    const activateResponse = await httpClient.semaphore.activate(testSemaphore.id!, { channelId: "default" }); //({ id: testSemaphore.id, isActive: true });

    console.log(activateResponse.data);

    await Promise.all([laterJobPromise, rescheduledJobPromise]);

    console.log("Both jobs acquired:\n", arrivals.map(j => j.jobCrn + "\n"));

    debugger;
    expect(SemaphoreJob.fromCrn(timedOutJob.crn!).clone("inflight").crn == arrivals[0].jobCrn, "The rescheduled job arrived later than the newer job");

    console.log("Releasing")

    await Promise.all([
        arrivals[0].release(),
        arrivals[1].release()
    ]);

    console.log("The rescheduled job arrived earlier than the newer job");
    console.log("Order-preserving reschedule test successful");
};
