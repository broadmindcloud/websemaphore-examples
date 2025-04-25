/*
    The most basic happy path test for WebSemaphore (websockets)
    1. Acquire a lock
    2. Do some work
    3. Release the lock
*/

import { _process, env, log, WebSemaphoreTestParams } from "./shared";

type Processor = (data: any, info: { status: string, jobCrn: string }) => Promise<void>;

export const _01_BasicTest = async (
    params: WebSemaphoreTestParams,
    executionTimeOrProcessor: number | Processor = 3,
) => {
    const { testSemaphore, wsClientManager, httpClient } = params;

    log("Connecting to WebSemaphore over websockets...");

    const body = { some: "abstract", data: 10 };

    log(`Acquiring lock with ${JSON.stringify(body)}...`);

    const { release, payload, status, jobCrn } = await wsClientManager.client.acquire({
        semaphoreId: env.SEMAPHORE_ID!,
        sync: false,
        body: { some: "abstract", data: 10 },
    });

    log("Acquired lock...");

    if (status == "acquired") {
        // do work
        await (
            (typeof executionTimeOrProcessor == "number") ?
                _process(payload, executionTimeOrProcessor as number) :
                (executionTimeOrProcessor as Processor)(payload, { status, jobCrn })
        )
    } else {
        log(status);
    }

    log("Releasing semaphore");

    release();

    return { jobCrn, payload };
};