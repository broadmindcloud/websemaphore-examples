/*
    The handler on top is a dynamic mapping sitting in the semaphore config.
    It's executed right after the lock acquired and just before it's sent out.
    The test maps a simple json object and tests that:
        1. the payload received is mapped as expected.
        2. the callback is performed as defined in the dynamically provided http handler (i.e. to this test's localhost)

    It's worth emphasizing that the worker requesting the job is not necessarily the same as the one performing it,
    and typically will not have the control over or visibility into the semaphore configuration including the mapping handler.
*/

import { env, expect, upsertSemaphore } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";


const handler = (callbackUrl: string) => `
const handler = (data, context) => {
    const result = {
        payload: {
            ...data,
            body: {
                ...data.body,
                country: data.body.Country,
                budget: 1000 * data.body.engagement
            },
        },
        routing: {
            protocol: "http",
            address: "${callbackUrl}",  // relevant for http
            method: "POST",             // relevant for http
            remoteId: "",               // relevant for websockets
        }
    };
    return result;
}
            
`;

export const _11_mapping_change_transport = async (app: WebsemaphreTestSetup) => {
    const { testSemaphore, wsClientManager, httpClient } = app;

    const callbackUrl = app.httpSever.callbackUrl;

    app.console.log("Configuring handler to ignore the websocket caller and instead use http at:", callbackUrl);

    await upsertSemaphore(app.httpClient, {
        id: env.SEMAPHORE_ID,
        timeout: { value: 15000 },
        isActive: true,
        mapping: {
            handler: handler(callbackUrl),
            isActive: true,
            language: "javascript",
            maxExecutionTime: 1,
            canOverrideRouting: true
        }
    });

    const input = { "title": "CERN", "Country": "CH", "engagement": 0.2, id: Math.random() };

    // we acquire via websockets but dont await and instead get the message in http next
    wsClientManager.client.acquire({ semaphoreId: env.SEMAPHORE_ID!, sync: false, body: input, });

    const jobMsg = await app.waitForSpecificMessage((jobMsg) => {
        app.console.log(jobMsg);
        return jobMsg?.message.body.id === input.id;
    }, { maxAttempts: 10 })

    expect(!!jobMsg, "Didn't receive the expected message via http callback");

    await jobMsg.release();

    app.console.log("Change transport in mapping successful");
}
// All tests runtime 5:53
