import { WebSocket } from "ws";
import { WebSemaphoreWebsocketsClientManager, WebSemaphoreHttpClientManager, WebsemaphoreHttpClient, WebSemaphoreWebsocketsClient } from "websemaphore/src";
import * as env from "../../env";
import assert from "node:assert/strict";
import { SemaphoreReadResponse, SemaphoreUpsertRequest } from "websemaphore";
import _01_testBasic from "./tests/01-basic";
import { SemaphoreJob } from "websemaphore/src/types";
import { WebsocketsClientManager } from "websemaphore/src/clients/websockets/manager";


const panic = (bool: boolean, message: string) => {
    if(!bool) {
        console.error(new Error(message));
        process.exit();
    }
}

const stage = "us-dev"; // environment stage (e.g., development, staging, production)
const TEST_SEMAPHORE_ID = env.SEMAPHORE_ID; // semaphore ID from environment variables

const upsertSemaphore = async (client: WebsemaphoreHttpClient, extraConfig?: Partial<SemaphoreUpsertRequest>) => {
    return (await client.semaphore.upsert({
        id: TEST_SEMAPHORE_ID,
        websockets: {
            isActive: true,
            onClientDropped: "drop"
        },  
        maxValue: 3,
        isActive: true,
        timeout: {},
        ...(extraConfig || {})
    })).data;
};

// Removed unused deleteSemaphore function

const setup = async (): Promise<{ httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }> => {
    const token = env.APIKEY_ADMIN;

    const httpClientManager = WebSemaphoreHttpClientManager();
    const httpClient = httpClientManager.initialize({ baseUrl: stage, token });

    const owner = await httpClientManager.authorize();
    console.log(owner.id);

    const testSemaphore = await upsertSemaphore(httpClient);

    const semaphores = await httpClient.semaphore.list();
    console.table(semaphores.data.Items);
    assert(semaphores.data.Items?.find((sem: SemaphoreReadResponse) => sem.id == testSemaphore.id), "can't find the test semaphore");

    const wsStatsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsStatsClientManager.connect(env.APIKEY_ADMIN);
    // wsStatsClientManager.client.on("message", (msg) => co    nsole.log(":::::    STATS     :::::\n", msg, "\n::::: END OF STATS :::::\n"))

    const wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsClientManager.connect(env.APIKEY_WORKER);

    return { httpClient, wsClientManager, testSemaphore };
};

// :::::: BASIC TEST ::::::
const basicTest = async ({ testSemaphore, wsClientManager, httpClient }: { httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }) => {
    const jobCrn = await _01_testBasic(wsClientManager.client);
    console.log("Basic test completed with job CRN:", jobCrn);
};
const timeoutTest = async ({ testSemaphore, wsClientManager, httpClient }: { httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }) => {
    await upsertSemaphore(httpClient, { timeout: { value: 2000 } });

    const { jobCrn: timedOutJobCrn, payload }  = await _01_testBasic(wsClientManager.client, undefined, 15);

    const timedOutJob = (await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJobCrn })).data;

    console.log("timedOutJob", timedOutJob)


    panic(timedOutJob.status == "timeout", "Job is not in timeout status");;
    
    console.log("Timeout test successful with job CRN:", timedOutJobCrn);

    return { timedOutJob, payload };
};


// :::::: RESCHEDULE TEST WITHOUT ORDER CHECK ::::::
const rescheduleTestNoOrderCheck = async (params: { httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }) => {
    const { testSemaphore, wsClientManager, httpClient } = params;

    const { timedOutJob, payload } = await timeoutTest(params);

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

// :::::: RESCHEDULE TEST ::::::
const rescheduleTest = async (params: { httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // to properly test reschedule we need to create more jobs first
    // and then make sure the timed out job is performed BEFORE the newer jobs

    // so we call the timeout test first
    const { timedOutJob } = await timeoutTest(params);

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
    panic(SemaphoreJob.fromCrn(timedOutJob.crn!).clone("inflight").crn == arrivals[0].jobCrn, "The rescheduled job arrived later than the newer job");

    console.log("Releasing")

    await Promise.all([
        arrivals[0].release(),
        arrivals[1].release()
    ]);

    console.log("The rescheduled job arrived earlier than the newer job");
    console.log("Order-preserving reschedule test successful");
};

const requeueTest = async (params: { httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }) => {
    const { testSemaphore, wsClientManager, httpClient } = params;

    // First, timeout the job
    const { timedOutJob, payload } = await timeoutTest(params);

    console.log("Timed out job CRN:", timedOutJob.crn);

    // Requeue the job using its CRN
    const requeuedJob = await wsClientManager.client.requeue({ jobCrn: timedOutJob.crn! });

    console.log("Successfully requeued job");

    debugger;

    // Validate that the requeued job has the same payload but a different CRN
    panic(
        SemaphoreJob.fromCrn(timedOutJob.crn!).clone("inflight").crn != requeuedJob.jobCrn,
        "The requeued job must have a new crn"
    );
    panic(
        SemaphoreJob.fromCrn(timedOutJob.crn!).created < SemaphoreJob.fromCrn(requeuedJob.jobCrn).created, 
        `The requeued should job be younger than the original job ${SemaphoreJob.fromCrn(timedOutJob.crn!).created} !< ${SemaphoreJob.fromCrn(requeuedJob.jobCrn).created}`
    );
    panic(
        JSON.stringify(requeuedJob.payload) === JSON.stringify(payload),
        "The requeued must have the same payload as the original job"
    );
    
    await requeuedJob.release();

    console.log("Timed out job CRN:", timedOutJob.crn);
    console.log("Requeued job CRN:", requeuedJob.jobCrn);
    console.log("Requeue test successful");
};

const cancelTest = async (params: { httpClient: WebsemaphoreHttpClient, wsClientManager: WebsocketsClientManager, testSemaphore: any }) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    const { timedOutJob } = await timeoutTest(params);

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

const TESTS: Record<string, (...p: Parameters<typeof basicTest>) => any> = {
    basicTest,
    timeoutTest,
    rescheduleTestNoOrderCheck,
    rescheduleTest,
    requeueTest,

    cancelTest
}

const main = async () => {
    const config = await setup();

    const tests = { cancelTest }; //TESTS

    console.time("Total test time")
    try {
        for (const testName in tests) {
            console.log("=".repeat(40));
            console.time(testName);
            console.log("START TEST: " + testName);
            console.log("=".repeat(40));

            const test = TESTS[testName];
            
            await test(config);
            console.log("=".repeat(40));
            console.timeEnd(testName);
            console.log("=".repeat(40));
        }
        // await basicTest(config);
        // await timeoutTest(config);
        // await rescheduleTestNoOrderCheck(config);
        // await rescheduleTest(config);
        // await requeueTest(config);

        console.log(Object.keys(TESTS).length, " tests were completed successfully");
        console.timeEnd("Total test time")

    } catch (ex) {
        console.log("Error during tests:", ex);
    }
    process.exit(0);
}

main();
