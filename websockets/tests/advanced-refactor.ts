import { describe, it, beforeAll, expect } from "vitest";
import { WebSocket } from "ws";
import { WebSemaphoreWebsocketsClientManager, WebSemaphoreHttpClientManager, WebsemaphoreHttpClient } from "websemaphore/src";
import * as env from "../../env";
import { SemaphoreReadResponse, SemaphoreUpsertRequest } from "websemaphore";
import _01_testBasic from "../src/tests/01-basic";
import { SemaphoreJob } from "websemaphore/src/types";

const panic = (bool: boolean, message: string) => {
    if (!bool) {
        throw new Error(message);
    }
};

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

let httpClient: WebsemaphoreHttpClient;
let wsClientManager: any;
let testSemaphore: any;

beforeAll(async () => {
    const token = env.APIKEY_ADMIN;

    const httpClientManager = WebSemaphoreHttpClientManager();
    httpClient = httpClientManager.initialize({ baseUrl: stage, token });

    const owner = await httpClientManager.authorize();
    console.log(owner.id);

    testSemaphore = await upsertSemaphore(httpClient);

    const semaphores = await httpClient.semaphore.list();
    console.table(semaphores.data.Items);
    expect(semaphores.data.Items?.find((sem: SemaphoreReadResponse) => sem.id == testSemaphore.id)).toBeTruthy();

    const wsStatsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsStatsClientManager.connect(env.APIKEY_ADMIN);

    wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsClientManager.connect(env.APIKEY_WORKER);
});

const timeoutTest = async () => {
    await upsertSemaphore(httpClient, { timeout: { value: 2000 } });

    const { jobCrn: timedOutJobCrn, payload } = await _01_testBasic(wsClientManager.client, undefined, 15);

    const timedOutJob = (await httpClient.semaphore.readJob(testSemaphore.id!, { crn: timedOutJobCrn })).data;

    console.log("timedOutJob", timedOutJob);

    panic(timedOutJob.status == "timeout", "Job is not in timeout status");

    console.log("Timeout test successful with job CRN:", timedOutJobCrn);

    expect(timedOutJob.status).toBe("timeout");

    return { timedOutJob, payload };
};

describe("WebSemaphore Tests", () => {
    it("should pass the basic test", async () => {
        const jobCrn = await _01_testBasic(wsClientManager.client);
        console.log("Basic test completed with job CRN:", jobCrn);
        expect(jobCrn).toBeTruthy();
    });

    it("should pass the timeout test", async () => {
        await timeoutTest();
    });

    it("should pass the reschedule test without order check", async () => {
        const { timedOutJob, payload } = await timeoutTest();

        console.log({ timedOutJobCrn: timedOutJob.crn });

        await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

        const rescheduledJob = await wsClientManager.client.reschedule({ jobCrn: timedOutJob.crn! });

        console.log("Successfully acquired _rescheduled_ job");
        panic(rescheduledJob.created == timedOutJob.created, "Rescheduled job has different created timestamp");
        panic(JSON.stringify(rescheduledJob.payload) == JSON.stringify(payload), "Rescheduled job has different payload");

        await new Promise(r => setTimeout(r, 500));

        await rescheduledJob.release();

        console.log("timedOutJob", timedOutJob.crn);
        console.log("rescheduledJob", rescheduledJob.jobCrn);

        console.log("Basic timeout / reschedule scenario test successful");
    });

    it("should pass the reschedule test with order check", async () => {
        const { timedOutJob } = await timeoutTest();

        await httpClient.semaphore.upsert({ id: testSemaphore.id, isActive: false });

        const laterJobPromise = wsClientManager.client.acquire({ semaphoreId: env.SEMAPHORE_ID, sync: false, body: { some: "abstract", data: 10 } });

        await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

        const rescheduledJobPromise = wsClientManager.client.reschedule({ jobCrn: timedOutJob.crn! });

        await new Promise(r => setTimeout(r, 1000)); // to be sure there is some time difference

        const queueItems = (await httpClient.semaphore.readQueue(testSemaphore.id!, { status: "scheduled" })).data;

        console.log("Items in queue before activation", queueItems.Items);

        const arrivals = [] as { jobCrn: string, release: () => Promise<any> }[];

        laterJobPromise.then(({ jobCrn, release }: { jobCrn: string, release: () => Promise<any> }) => arrivals.push({ jobCrn, release }));
        rescheduledJobPromise.then(({ jobCrn, release }: { jobCrn: string, release: () => Promise<any> }) => arrivals.push({ jobCrn, release }));

        console.log("Activating");
        const activateResponse = await httpClient.semaphore.activate(testSemaphore.id!, { channelId: "default" });

        console.log(activateResponse.data);

        await Promise.all([laterJobPromise, rescheduledJobPromise]);

        console.log("Both jobs acquired:\n", arrivals.map(j => j.jobCrn + "\n"));

        panic(SemaphoreJob.fromCrn(timedOutJob.crn!).clone("inflight").crn == arrivals[0].jobCrn, "The rescheduled job arrived later than the newer job");

        console.log("Releasing");

        await Promise.all([
            arrivals[0].release(),
            arrivals[1].release()
        ]);

        console.log("The rescheduled job arrived earlier than the newer job");
        console.log("Order-preserving reschedule test successful");
    });
});
