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
import { env, HttpCallbackProcessor, HttpJobProcessor } from "./shared";
import { HttpCallbackServer } from "./server/HttpCallbackServer"
// const stage = "us-dev"; // environment stage (e.g., development, staging, production)


type HttpJobMsg = {
    jobCrn: string,
    message: any,
};

type HttpJob = {
    jobCrn: string,
    message: any,
    release: () => Promise<void>
};

export class WebsemaphreTestSetup {
    httpSever!: HttpCallbackServer;
    httpClient!: WebsemaphoreHttpClient;
    wsClientManager!: ReturnType<typeof WebSemaphoreWebsocketsClientManager>;

    expectedIds: Record<string, boolean> = {};
    releasedIds: Record<string, boolean> = {};

    _processor?: HttpJobProcessor;

    _messageBuffer: HttpJob[] = [];

    testSemaphore: { id: string } = { id: env.SEMAPHORE_ID! };

    console: typeof console = global.console;

    constructor(opts?: { console?: typeof console }) {
        // { ...hcs, setHttpProcessor, waitForMessage, acquire, restart }
        this.init();
        opts?.console && (this.console = opts.console);
    }
    init() {
        this.httpSever = new HttpCallbackServer(this.processorFactory() as HttpCallbackProcessor, { console });
        this.httpClient = WebSemaphoreHttpClientManager().initialize({ baseUrl: env.stage, token: env.APIKEY_ADMIN });
        this.wsClientManager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL", baseUrl: env.stage });
        // this._processor = 
    }
    async start() {
        await this.httpSever.start();
        return this;
    }
    restartTunnel() {
        return this.httpSever.restart();
    }
    async stop() {
        this.console.log("Stopping WebsemaphoreHttpTool");
        await this.httpSever.stop();
    }
    setHttpProcessor(p?: HttpJobProcessor) {
        this.console.log("Setting processor to: ", p ? "<function>" : undefined)

        this._processor = p;
    }
    async waitForMessage() {
        try {
            if (this._messageBuffer.length)
                return Promise.resolve(this._messageBuffer.shift()!);

            const res: HttpJob = await new Promise<HttpJob>(res => {
                this.setHttpProcessor((jobMsg: HttpJob) => {
                    this.setHttpProcessor(undefined);

                    res(jobMsg);

                    return Promise.resolve();
                })
            });


            return res;
            // const res = await new Promise<HttpJobMsg>((res, rej) => {
            //     const f = ((message: { body: string }, { jobCrn }: { jobCrn: string }) => {
            //         console.log("Received message", message.body)

            //         res({ // JSON.parse(message.body)
            //             message: message.body, jobCrn, release: async () => {

            //                 const job = SemaphoreJob.fromCrn(jobCrn);
            //                 await this.httpClient.semaphore.release(job.semaphore.id, { channelId: "default", jobCrn: jobCrn } as any);
            //                 return;
            //             }
            //         });

            //         return "skip_release" as "skip_release";
            //     });

            //     this.setHttpProcessor((message: any, { jobCrn }: { jobCrn: string }) => Promise.resolve(f(message, { jobCrn })));

            //     console.log("Waiting for message")
            // })

        } catch (ex) {
            this.console.log(ex);
            throw ex;
        }
    }

    async waitForSpecificMessage(match: (jobMsg: HttpJobMsg) => boolean, opts?: { maxWaitTime?: number, maxAttempts?: number, input?: any }): Promise<HttpJob> {
        // const r = await new Promise<HttpJob>(async (resolve, reject) => {
        const f = (async () => {
            const maxWaitTime = opts?.maxWaitTime || 15000;
            const state = {
                done: false,
                timer: undefined as any
            };

            if (maxWaitTime) {
                this.console.log("Will wait for ", maxWaitTime / 1000, "seconds...")
                state.timer = setTimeout(() => {
                    this.console.log(`waitForSpecificMessage ${state.done ? "will not" : "will"} timeout:`, JSON.stringify(opts?.input))
                    if(!state.done)
                        throw new Error("Timed out waiting for message") // && //reject(new Error("Timed out waiting for message"))
                }, maxWaitTime)
            }

            let maxAttempts = opts?.maxAttempts ?? 1;

            do {
                const jobMsg = await this.waitForMessage();
                if (!jobMsg) {
                    // reject(new Error("Empty message received"))
                    throw new Error("Emptry message received")
                }

                state.done = jobMsg ? match(jobMsg) : false;
                // console.log(jobMsg)
                if (state.done) {
                    this.console.log("waitForSpecificMessage resolved:", JSON.stringify(opts?.input))

                    return jobMsg;
                }

                this.console.log("Skipping unexpected message: ", JSON.stringify(jobMsg.message));
            } while (--maxAttempts > 0)

            throw (new Error("Max attempts reached"));
        });


        // });

        try {
            const r = await f();
            this.console.log("waitForSpecificMessage returned", r)
            return r;
        } catch (ex) {
            this.console.log("waitForSpecificMessage unexpected error:", ex)
            throw ex;
        }
    }

    private processorFactory() {
        const instance = this;
        return async ({ message, jobCrn }: HttpJobMsg) => {

            this.console.log("WebsemaphreHttpTools processor for: ", jobCrn);
            this.console.log("Custom processor: ", jobCrn);

            const release = async () => {
                const job = SemaphoreJob.fromCrn(jobCrn);
                await this.httpClient.semaphore.release(job.semaphore.id, { channelId: "default", jobCrn: jobCrn } as any);
                return;
            };

            const jobMsg = {
                message, jobCrn, release
            };

            if (instance._processor)
                instance._processor(jobMsg)
            else
                instance._messageBuffer.push(jobMsg);

            return "skip_release";
            // const r = await instance._processor ? instance._processor!({ message, jobCrn, release }) : Promise.resolve(void 0);
            // console.log("Custom processor result: ", r);
            // return instance._processor ? "skip_release" : undefined;
        }
    }

    async acquire(channelCrn: string | { semaphoreId: string, channelId: string }, input: any, opts?: { waitForMessage?: boolean }) {
        this.console.log("Acquiring channelCrn:", channelCrn);

        const semaphoreId = typeof channelCrn == "string" ? channelCrn : channelCrn.semaphoreId;
        const channelId = typeof channelCrn == "string" ? "default" : (channelCrn.channelId || "default");

        this.console.log(`Acquiring ${semaphoreId} channel ${channelId}, input: ${JSON.stringify(input)}`)

        const _acquireResponse = await this.httpClient.semaphore.acquire(semaphoreId, input, { headers: { "x-websemaphore-channel-id": channelId } } as any); // or query: { channelId } } as any

        this.console.log("Acquire response:", await _acquireResponse.text());

        if (!(opts?.waitForMessage ?? true))
            return Promise.resolve({ message: "", jobCrn: "", release: () => { throw new Error("Acquire: cannot use .release when waitForMessage == false") } }); // _acquireResponse;

        this.expectedIds[input.id] = true;

        const msg = await this.waitForSpecificMessage((jobMsg) => {
            this.console.log("!!!", jobMsg)
            this.console.log(jobMsg.message.id, input.id)
            return jobMsg.message.id == input.id; // fix. if channelId is an api param (consider path or header instead), body should be at .message level
        });

        // msg.message = JSON.parse(msg.message);

        return msg;

        // let jobMsg: { message: any; jobCrn: string; release: () => Promise<void>; } | undefined;
        // do {
        //     const { message, jobCrn, release } = await this.waitForMessage();

        //     // const expectedThisMessage = message.randomId == input.randomId;

        //     if (!this.expectedIds[input.id]) {
        //         if (this.releasedIds[jobCrn]) {
        //             console.log("Preventing duplicate release of unexpected job ", jobCrn);
        //         }
        //         else {
        //             await release()
        //             console.log("Releasing an unexpected job ", jobCrn);
        //         }
        //     }
        //     else {
        //         console.log("Expected message received:", input.id)
        //         jobMsg = { message, jobCrn, release: () => release() }
        //     }
        // } while (!jobMsg);

        // return jobMsg;
    }
}
