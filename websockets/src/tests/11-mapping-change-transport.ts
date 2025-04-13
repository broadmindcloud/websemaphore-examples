import { SemaphoreJob } from "websemaphore/src";
import { env, panic, upsertSemaphore, WebSemaphoreTestParams } from "./shared";
import { _02_TimeoutTest } from "./02-timeout";
import { _01_BasicTest } from "./01-basic";

/*
    The handler on top is a dynamic mapping sitting in the semaphore config.
    It's executed right after the lock acquired and just before it's sent out.
    The test maps a simple json object and tests that the payload received is mapped as expected.

    It's worth emphasizing that the worker requesting the job is not necessarily the same as the one performing it,
    and typically will not have the control over or visibility into the semaphore configuration including the mapping handler.
*/

const handler = (callbackUrl: string) => `
const handler = (data, context) => {
    const result = {
        payload: {
            ...data,
            body: {
                title: data.body.title,
                country: data.body.Country,
                engagement: data.body.engagement,
                budget: 1000 * data.body.engagement
            },
        },
        routing: {
            protocol: "http",
            url: ,          // relevant for http
            method: ,       // relevant for http
            remoteId: ,     // relevant for websockets
        }
    };
    return result;
}
            
`;


export const _10_mapping_basic = async (params: WebSemaphoreTestParams) => {
    const { testSemaphore, wsClientManager, httpClient } = params;
    // First, timeout the job
    await upsertSemaphore(params.httpClient, {
        id: env.SEMAPHORE_ID,
        timeout: { value: 15000 }, mapping: {
            handler,
            isActive: true,
            language: "javascript",
            maxExecutionTime: 1
        }
    });

    const input = {
        "title": "CERN",
        "Country": "CH",
        "engagement": 0.2
    };

    const { release, payload, status, jobCrn } =
        await wsClientManager.client.acquire({
            semaphoreId: env.SEMAPHORE_ID!,
            sync: false,
            body: input,
        });


    const output = (payload as any).body;
    console.log("Input:", input);
    console.log("↓ Request lock");
    console.log("  ↓ Mapping");
    console.log("Output:", payload)
    panic(output.budget == input.engagement * 1000, "The mapping failed.")
    await release();
}

