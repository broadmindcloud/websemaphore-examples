/*
    Sets up the test environment for WebSemaphore.

    1. Initializes the HTTP client and WebSocket client managers.
    2. Creates a test semaphore.
    3. Sets up a WebSocket client for stats.
    4. Sets up a WebSocket client for worker.
    5. Initializes an HTTP callback server emulating the worker / limited resource
    6. Returns the initialized clients and server for further use in tests.
*/

import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";
import { env, upsertSemaphore, websemaphoreClient, websemaphoreManager } from "../../../lib/shared";


const stage = "us-dev"; // environment stage (e.g., development, staging, production)

export const setup = async (options?: { setDefaults?: boolean, purgeDefaultChannel: boolean }): Promise<WebsemaphreTestSetup> => {
    try {
        const owner = await websemaphoreManager.authorize();
        console.log(owner.id);
    } catch (e) {
        console.error("Error authorizing WebSemaphore client:", e);
        throw e;
    }
    if(options?.setDefaults ?? true)
        await upsertSemaphore(websemaphoreClient); // upserts to "test-semaphore" (configured in env.ts)
    
    const semaphores = await websemaphoreClient.semaphore.list();

    console.table(semaphores.data.Items);

    const websemaphreTestSetup = await new WebsemaphreTestSetup({ console: {...console, log: (..._a) => undefined } }).start(); //{ current: await initHttpCallbackServer(httpClient) };

    if(options?.purgeDefaultChannel)
        await websemaphreTestSetup.httpClient.semaphore.purgeQueue(env.SEMAPHORE_ID, {});

    await websemaphreTestSetup.wsClientManager.connect(env.APIKEY_WORKER);
    // app.console.log(connres);

    return websemaphreTestSetup

};




// const token = env.APIKEY_ADMIN;

// const httpClientManager = WebSemaphoreHttpClientManager();
// const httpClient = httpClientManager.initialize({ baseUrl: stage, token, fetch: monitoredFetch });


// const restartHttpServer = async () => {
//     const prevUrl = httpCallbackServer.httpSever.callbackUrl;
    
//     await httpCallbackServer.restartTunnel();
//     app.console.log(prevUrl, "-> New HTTP server ->", httpCallbackServer.httpSever.callbackUrl);

//     return httpCallbackServer;//{ httpClient, wsClientManager: httpCallbackServer.w, testSemaphore, httpCallbackServer: httpCallbackServer, restartHttpServer };
// };
// class WebsemaphreHttpTools {
//     httpSever!: HttpCallbackServer;
//     httpClient!: WebsemaphoreHttpClient;
//     wsClientManager!: ReturnType<typeof WebSemaphoreWebsocketsClientManager>;

//     expectedIds: Record<string, boolean> = {};
//     releasedIds: Record<string, boolean> = {};

//     _processor!: HttpCallbackProcessor;

//     constructor() {
//         // { ...hcs, setHttpProcessor, waitForMessage, acquire, restart }
//         this.init();
//     }
//     init() {
//         this.httpSever = new HttpCallbackServer(this.processor as HttpCallbackProcessor);
//         this.httpClient = WebSemaphoreHttpClientManager().initialize({ baseUrl: stage, token: env.APIKEY_ADMIN });
//         this.wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
//         // this._processor = 
//     }
//     setHttpProcessor(p: HttpCallbackProcessor) {
//         this._processor = p;
//     }
//     waitForMessage() {
//         return new Promise<{ message: any, jobCrn: string, release: () => Promise<void> }>((res, rej) =>
//             this.setHttpProcessor(async (message: { body: string }, { jobCrn }: { jobCrn: string }) => {
//                 res({
//                     message: JSON.parse(message.body), jobCrn, release: async () => {
//                         const job = SemaphoreJob.fromCrn(jobCrn);
//                         await this.httpClient.semaphore.release(job.semaphore.id, { channelId: "default", jobCrn: jobCrn } as any);
//                         return;
//                     }
//                 });

//                 return "skip_release";
//             })
//         );
//     }
//     restart() {

//     }
//     processor(message: string, { jobCrn }: { jobCrn: string }): Promise<void | "skip_release"> | undefined {
//         return this._processor ? this._processor(message, { jobCrn }) : Promise.resolve(void 0);
//     }

//     async acquire(channelCrn: string | { semaphoreId: string, channelId: string }, input: any, opts?: { waitForMessage?: boolean }) {
//         const semaphoreId = typeof channelCrn == "string" ? channelCrn : channelCrn.semaphoreId;
//         const channelId = typeof channelCrn == "string" ? "default" : (channelCrn.channelId || "default");

//         const _acquireResponse = await this.httpClient.semaphore.acquire(semaphoreId, { channelId, body: JSON.stringify(input) })

//         if(!(opts?.waitForMessage ?? true))
//             return { message: "", jobCrn: "", release: () => { throw new Error("Acquire: cannot use .release when waitForMessage == false") } } ; // _acquireResponse;

//         this.expectedIds[input.id] = true;

//         let jobMsg: { message: any; jobCrn: string; release: () => Promise<void>; } | undefined;
//         do {
//             const { message, jobCrn, release } = await this.waitForMessage();

//             // const expectedThisMessage = message.randomId == input.randomId;

//             if (!this.expectedIds[input.id]) {
//                 if (this.releasedIds[jobCrn]) {
//                     app.console.log("Preventing duplicate release of unexpected job ", jobCrn);
//                 }
//                 else {
//                     await release()
//                     app.console.log("Releasing an unexpected job ", jobCrn);
//                 }
//             }
//             else
//                 jobMsg = { message, jobCrn, release: () => release() } 
//         } while (!jobMsg);

//         return jobMsg;
//     }
// }


// const initHttpCallbackServer = async (httpClient: WebsemaphoreHttpClient) => {
//     const processor: { current: HttpCallbackProcessor | null } = { current: null };

//     let _processor: HttpCallbackProcessor = async (msg: any, { jobCrn }: { jobCrn: string }) => {
//         app.console.log("Processor.current:", processor.current)
//         if (processor.current)
//             return await processor.current(msg, { jobCrn });

//         await Promise.resolve()
//         app.console.log("Default http processor", msg);
//     }

//     const setHttpProcessor = (p: HttpCallbackProcessor) => processor.current = p;

//     const waitForMessage = () => // a friendlier, iterator-like receiver


//     const expectedIds = {} as Record<string, boolean>;
//     const releasedIds = {} as Record<string, boolean>;
//     const 

//     let hcs = new HttpCallbackServer(_processor);
//     const restart = async () => {
//         hcs.restart()
//         return { ...hcs, setHttpProcessor, waitForMessage, acquire, restart };
//     }
//     const start = () => {
//         return { ...hcs, setHttpProcessor, waitForMessage, acquire, restart }
//     }

//     return start();
// }

    // expect(!!semaphores.data.Items?.find((sem: SemaphoreReadResponse) => sem.id == testSemaphore.id), "can't find the test semaphore");

    // const wsStatsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    // await wsStatsClientManager.connect(env.APIKEY_ADMIN);
    // // wsStatsClientManager.client.on("message", (msg) => app.console.log(":::::    STATS     :::::\n", msg, "\n::::: END OF STATS :::::\n"))

    // const wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: stage });
    // await wsClientManager.connect(env.APIKEY_WORKER);
