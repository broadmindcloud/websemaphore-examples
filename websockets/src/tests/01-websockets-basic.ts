/*
    The most basic happy path test for WebSemaphore (websockets)
    1. Acquire a lock
    2. Do some work
    3. Release the lock
*/

import { _process, env, upsertSemaphore } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _01_websockets_basic = async (
    app: WebsemaphreTestSetup,
    opts?: {
        executionTimeSeconds?: number,
        processor?: Processor,
        skipConfig?: boolean
    }
) => {

    app.console.log("Connecting to WebSemaphore over websockets...");

    if (!opts?.skipConfig)
        upsertSemaphore(app.httpClient, {
            id: env.SEMAPHORE_ID,
            isActive: true,
            mapping: { isActive: false },
            routing: {
                routes: [
                    { protocol: "websockets", isActive: true }
                ]
            }
        });

    const body = { some: "abstract", data: 10 };

    app.console.log(`Acquiring lock with ${JSON.stringify(body)}...`);

    debugger;

    const { release, payload, status, jobCrn } = await app.wsClientManager.client.acquire({
        semaphoreId: env.SEMAPHORE_ID!,
        sync: false,
        body: { some: "abstract", data: 10 },
    });

    app.console.log("Acquired lock...");

    if (status == "acquired") {
        // do work
        await (
            opts?.processor ?
                opts.processor(payload, { status, jobCrn }) :
                _process(payload, opts?.executionTimeSeconds || 3)
        )
    } else {
        app.console.log(status);
    }

    app.console.log("Releasing semaphore");

    release();

    return { jobCrn, payload };
};