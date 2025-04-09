import { WebSemaphoreWebsocketsClient } from "websemaphore/src";
import { process, Logger } from "./shared";
import * as env from "../../../env";

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