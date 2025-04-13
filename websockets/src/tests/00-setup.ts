
import { SemaphoreReadResponse, WebSemaphoreHttpClientManager, WebSemaphoreWebsocketsClientManager } from "websemaphore/src";
import { WebSocket } from "ws";
import { env, panic, upsertSemaphore, WebSemaphoreTestParams } from "./shared";

const stage = "us-dev"; // environment stage (e.g., development, staging, production)

export const setup = async (): Promise<WebSemaphoreTestParams> => {
    const token = env.APIKEY_ADMIN;

    const httpClientManager = WebSemaphoreHttpClientManager();
    const httpClient = httpClientManager.initialize({ baseUrl: stage, token });

    const owner = await httpClientManager.authorize();
    console.log(owner.id);

    const testSemaphore = await upsertSemaphore(httpClient);

    const semaphores = await httpClient.semaphore.list();
    console.table(semaphores.data.Items);
    panic(!!semaphores.data.Items?.find((sem: SemaphoreReadResponse) => sem.id == testSemaphore.id), "can't find the test semaphore");

    const wsStatsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsStatsClientManager.connect(env.APIKEY_ADMIN);
    // wsStatsClientManager.client.on("message", (msg) => co    nsole.log(":::::    STATS     :::::\n", msg, "\n::::: END OF STATS :::::\n"))

    const wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    await wsClientManager.connect(env.APIKEY_WORKER);

    return { httpClient, wsClientManager, testSemaphore };
};