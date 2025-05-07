/*
    The handler string on top is a dynamic mapping sitting in the semaphore config.
    It's executed right after the lock acquired and just before it's sent out.
    The test maps a simple json object and tests that the payload received is mapped as expected.

    It's worth emphasizing that the worker requesting the job is not necessarily the same as the one performing it,
    and typically will not have the control over or visibility into the semaphore configuration including the mapping handler.
*/

import { env, expect, upsertSemaphore } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

const handler = `
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
        }
    };
    return result;
}
            
`;


export const _10_mapping_basic = async (app: WebsemaphreTestSetup) => {
    debugger;
    await upsertSemaphore(app.httpClient, {
        id: app.testSemaphore.id,
        timeout: { value: 15000 }, 
        mapping: {
            handler,
            isActive: true,
            language: "javascript",
            maxExecutionTime: 1
        },
        routing: [
            {
                protocol: "websockets",
                isActive: true
            }
        ]
    });

    const input = {
        title: "CERN",
        Country: "CH",
        engagement: 0.2,
        id: Math.random()
    };
    app.console.log("Acquiring:", input)
    const { release, payload, status, jobCrn } =
        await app.wsClientManager.client.acquire({
            semaphoreId: env.SEMAPHORE_ID!,
            sync: false,
            body: input,
        });


    const output = (payload as any).body;
    app.console.log("Input:", input);
    app.console.log("↓ Request lock");
    app.console.log("  ↓ Mapping");
    app.console.log("Output:", payload)
    expect(output.budget == input.engagement * 1000, "The mapping failed.")
    await release();
}

