import { WebSocket } from "ws";
import { WebSemaphoreWebsocketsClientManager, WebSemaphoreHttpClientManager, WebsemaphoreHttpClient } from "websemaphore/src";
import * as env from "../../env";
import { assert, time } from "console";
import { SemaphoreReadResponse, SemaphoreUpsertRequest } from "websemaphore";
import _01_testBasic from "./tests/01-basic";
import { SemaphoreJob } from "websemaphore/src/types";
// import { SemaphoreJob } from "websemaphore/src/types";

const stage = "us-dev"; // environment stage (e.g., development, staging, production)
const TEST_SEMAPHORE_ID = env.SEMAPHORE_ID; // semaphore ID from environment variables

const upsertSemaphore = async (client: WebsemaphoreHttpClient, extraConfig?: Partial<SemaphoreUpsertRequest>) => {
    return (await client.semaphore.upsert({
        id: TEST_SEMAPHORE_ID, // semaphore ID to upsert
        websockets: {
            isActive: true, // enable websockets for the semaphore
            onClientDropped: "drop" // drop clients when disconnected
        },
        maxValue: 3, // maximum value for the semaphore
        isActive: true, // activate the semaphore
        timeout: {},
        ...(extraConfig || {}) // merge additional configuration if provided
    })).data;
}

const deleteSemaphore = async (client: WebsemaphoreHttpClient) => {
    // not implemented
}

// Main function to demonstrate advanced usage of the WebSemaphore library
const advanced = async () => {
    // --------- SETUP --------

    const token = env.APIKEY_ADMIN; // admin API key from environment variables

    // Initialize HTTP client manager with base URL and token
    const httpClientManager = WebSemaphoreHttpClientManager();
    const httpClient = httpClientManager.initialize({ baseUrl: stage, token });

    // Authorize the HTTP client manager and log the owner ID
    const owner = await httpClientManager.authorize();
    console.log(owner.id);

    // Create or update the test semaphore
    const testSemaphore = await upsertSemaphore(httpClient);

    // List all semaphores and log them to verify the test semaphore exists
    const semaphores = await httpClient.semaphore.list();
    console.table(semaphores.data.Items); // just checking on the semaphores
    assert(semaphores.data.Items?.find((sem: SemaphoreReadResponse) => sem.id == testSemaphore.id), "can't find the test semaphore");

    // --------- WEBSOCKET SETUP --------

    // WebSocket client manager for stats (ADMIN policy)
    // This client listens to stats such as locks acquired and jobs created/updated
    const wsStatsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsStatsClientManager.connect(env.APIKEY_ADMIN);
    // wsStatsClientManager.client.on("message", (msg) => console.log(":::::    STATS     :::::\n", msg, "\n::::: END OF STATS :::::\n"))

    // WebSocket client manager for worker operations (WORKER policy)
    // This client is used to acquire resources and process jobs
    const wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsClientManager.connect(env.APIKEY_WORKER);

    // --------- TESTS --------

    // --------- BASIC TEST

    // Run basic test using the worker WebSocket client
    const jobCrn = await _01_testBasic(wsClientManager.client);


    // --------- TIMEOUT TEST

    // Update the semaphore with a timeout configuration
    await upsertSemaphore(httpClient, { timeout: { value: 2000 } });

    // the basic test takes 5 seconds so should time out
    const timedOutJobCrn = await _01_testBasic(wsClientManager.client);

    // const toJob = SemaphoreJob.fromCrn(jobCrnTimedOut);
    // toJob.status = "timeout";

    const timedOutJob = (await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJobCrn })).data;

    assert(timedOutJob.status == "timeout");

    // await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJob.crn })

    // --------- RESCHEDULE TEST

    // to properly test reschedule we need to create more jobs first
    // and then make sure the timed out job is performed BEFORE the newer jobs

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

    const firstSettledJobResponse = await Promise.race([laterJobPromise, rescheduledJobPromise]);

    const firstSettledJob = SemaphoreJob.fromCrn(firstSettledJobResponse.jobCrn);

    // console.log({ firstSettledCrn })
    // assert(
    //     timedOutJob.crn == firstSettledJob.clone("timeout").crn,
    //     `First job reseased was\n${firstSettledJob.clone("timeout").crn}, expected\n${timedOutJob.crn}`
    // );
    console.log(`First job reseased was\n${firstSettledJob.crn}, expected\n${timedOutJob.crn}`);
    
    console.log("Awaiting second job promise")

    const laterJob = await rescheduledJobPromise;//Promise.race([laterJobPromise, rescheduledJobPromise]);
    
    console.log({ laterJob });


    // console.log("Rescheduled job crn:", timedOutJobCrn)
    console.log("Releasing jobs:", arrivals.map(j => j.jobCrn));

    await Promise.all([
        arrivals[0].release(),
        arrivals[1].release()
    ]);

    // --------- REQUEUE TEST --------

    process.exit();
}

// Execute the advanced function
advanced();