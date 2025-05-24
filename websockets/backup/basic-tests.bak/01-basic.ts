import { WebSemaphoreWebsocketsClient } from "websemaphore/src";
import { Logger } from "../tests/shared";
import * as env from "../../../env";

export const process = async (payload: any, log: Logger, executionTime?: number) => {
    // do work
    let workDuration = executionTime! > 0 ? executionTime : Math.round(5 + 5 * Math.random());

    log("NOTE: Please wait for the job to finish so the semaphore is relased.")
    log(`Processing: ${workDuration} sec, payload: ${JSON.stringify(payload)}`);

    while (workDuration! > 0) {
        await new Promise(res => setTimeout(res, 1000));
        workDuration! -= 1;
        log("Time to finish: ", workDuration)
    }

    log("Processing done")
}

export const webSocketsSemaphoreTest =
    async (
        webSemaphoreClient: WebSemaphoreWebsocketsClient,
        log: Logger | undefined = undefined,
        executionTime: number = -1
    ) => {
        log = log || console.log;

        log("Connecting to WebSemaphore over websockets...")

        const body = { some: "abstract", data: 10 };

        log(`Acquiring lock with ${JSON.stringify(body)}...`)
        
        const { release, payload, status, jobCrn } =
            await webSemaphoreClient.acquire({ semaphoreId: env.SEMAPHORE_ID, sync: false, body: { some: "abstract", data: 10 } });

        log("Acquired lock...")

        if (status == "acquired") { // always true in async mode
            // do work
            await process(payload, log, executionTime);
        } else {
            log(status);
        }

        log("Releasing semaphore");

        release();

        return { jobCrn, payload };
    }

export default webSocketsSemaphoreTest;