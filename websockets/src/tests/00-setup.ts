/*
    Sets up the test environment for WebSemaphore.

    1. Initializes the HTTP client and WebSocket client managers.
    2. Creates a test semaphore.
    3. Sets up a WebSocket client for stats.
    4. Sets up a WebSocket client for worker.
    5. Initializes an HTTP callback server emulating the worker / limited resource
    6. Returns the initialized clients and server for further use in tests.
*/

import { SemaphoreJob, SemaphoreReadResponse, WebsemaphoreHttpClient, WebSemaphoreHttpClientManager, WebSemaphoreWebsocketsClientManager } from "websemaphore/src";
import { WebSocket } from "ws";
import { env, HttpCallbackProcessor, expect, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { httpCallbackServer } from "../../../http-express/index"

const stage = "us-dev"; // environment stage (e.g., development, staging, production)

const initHttpCallbackServer = async (httpClient: WebsemaphoreHttpClient) => {
    const processor: { current: HttpCallbackProcessor | null } = { current: null };

    let _processor: HttpCallbackProcessor = async (msg: any, { jobCrn }: { jobCrn: string }) => {
        console.log("Processor.current:", processor.current)
        if (processor.current)
            return await processor.current(msg, { jobCrn });

        await Promise.resolve()
        console.log("Default http processor", msg);
    }

    const setHttpProcessor = (p: HttpCallbackProcessor) => processor.current = p;

    const waitForMessage = () => // a friendlier, iterator-like receiver
        new Promise<{ message: any, jobCrn: string, release: () => Promise<void> }>((res, rej) =>
            setHttpProcessor(async (message: { body: string }, { jobCrn }: { jobCrn: string }) => {
                res({
                    message: JSON.parse(message.body), jobCrn, release: async () => {
                        const job = SemaphoreJob.fromCrn(jobCrn);
                        await httpClient.semaphore.release(job.semaphore.id, { channelId: "default", jobCrn: jobCrn } as any);
                        return;
                    }
                });

                return "skip_release";
            })
        );

    const expectedIds = {} as Record<string, boolean>;
    const releasedIds = {} as Record<string, boolean>;
    const acquire = async (channelCrn: string | { semaphoreId: string, channelId: string }, input: any) => {
        const semaphoreId = typeof channelCrn == "string" ? channelCrn : channelCrn.semaphoreId;
        const channelId = typeof channelCrn == "string" ? "default" : (channelCrn.channelId || "default");

        const _acquireResponse = await httpClient.semaphore.acquire(semaphoreId, { channelId, body: JSON.stringify(input) })

        expectedIds[input.id] = true;

        let jobMsg: { message: any; jobCrn: string; release: () => Promise<void>; } | undefined;
        do {
            const { message, jobCrn, release } = await waitForMessage();

            // const expectedThisMessage = message.randomId == input.randomId;

            if (!expectedIds[input.id]) {
                if (releasedIds[jobCrn]) {
                    console.log("Preventing duplicate release of unexpected job ", jobCrn);
                }
                else {
                    await release()
                    console.log("Releasing an unexpected job ", jobCrn);
                }
            }
            else
                jobMsg = { message, jobCrn, release: () => release() } 
        } while (!jobMsg);

        return jobMsg;
    }

    const hcs = await httpCallbackServer(_processor);

    return { ...hcs, setHttpProcessor, waitForMessage, acquire };
}

export const setup = async (options?: { setDefaults: boolean }): Promise<WebSemaphoreTestParams> => {
    const token = env.APIKEY_ADMIN;

    const httpClientManager = WebSemaphoreHttpClientManager();
    const httpClient = httpClientManager.initialize({ baseUrl: stage, token });

    const owner = await httpClientManager.authorize();
    console.log(owner.id);

 

    const testSemaphore = await upsertSemaphore(httpClient);

    const semaphores = await httpClient.semaphore.list();
    console.table(semaphores.data.Items);
    expect(!!semaphores.data.Items?.find((sem: SemaphoreReadResponse) => sem.id == testSemaphore.id), "can't find the test semaphore");

    const wsStatsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsStatsClientManager.connect(env.APIKEY_ADMIN);
    // wsStatsClientManager.client.on("message", (msg) => console.log(":::::    STATS     :::::\n", msg, "\n::::: END OF STATS :::::\n"))

    const wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsClientManager.connect(env.APIKEY_WORKER);


    const httpCallbackServer = { current: await initHttpCallbackServer(httpClient) };
    const restartHttpServer = async () => {
        await new Promise(res => httpCallbackServer.current.server.close(() => res(null)));
        return httpCallbackServer.current = await initHttpCallbackServer(httpClient); 
    };

    return { httpClient, wsClientManager, testSemaphore, httpCallbackServer: httpCallbackServer.current, restartHttpServer };
};