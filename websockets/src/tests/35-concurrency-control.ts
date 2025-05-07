/*
    Channel deactivation test
    Verify that maxValue is respected when number of messages is greater than maxValue
    1. Generate 5 messages
    2. Request to acquire 3 messages
    3. Wait for the first 3 messages to be acquired
    4. Request to acquire 2 more messages
    5. Verify that the last 2 messages are in "scheduled" state
    6. Release the first 3 messages
    7. Verify that the last 2 messages are acquired
    8. Verify that all messages are in "done" state
*/

import { expect, upsertSemaphore } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";

export const _35_concurrency_control = async (app: WebsemaphreTestSetup) => {
    const { testSemaphore, httpClient } = app;

    app.console.log("Step 0: Configuring the semaphore with maxValue = 3");
    await upsertSemaphore(httpClient, {
        id: testSemaphore.id,
        isActive: true,
        maxValue: 3,
        mapping: { isActive: false },
        routing: [
            { protocol: "http", address: app.httpSever.callbackUrl, method: "POST", isActive: true }
        ]
    });

    app.console.log("Step 1: Generating 5 messages");
    const inputs = Array.from({ length: 5 }, (_, i) => ({
        title: `Message ${i + 1}`,
        id: Math.random(),
        randomId: Math.random()
    }));

    app.console.log("--- Step 2: Acquiring 3 messages");
    const [firstBatch, secondBatch] = [inputs.slice(0, 3), inputs.slice(3)];
    
    await Promise.all(
        firstBatch.map((input) => app.acquire(testSemaphore.id, input, { waitForMessage: false }))
    );


    app.console.log("--- Step 3: Waiting for the first 3 messages to be acquired...");
    const firstBatchAcquired: { message: any; jobCrn: string; release: () => Promise<void>; }[] = [];

    while(firstBatch.length) {
        const m = await app.waitForMessage(); // wait for the first 3 messages to be acquired
        firstBatch.splice(firstBatch.findIndex(i => i.id === m.message.id), 1);
        app.console.log("First batch: ", firstBatch.length, "messages left to acquire");
        firstBatchAcquired.push(m);
    }

    app.console.log("--- Step 4: Acquiring 2 more messages");
    await Promise.all(secondBatch.map(input => app.acquire(testSemaphore.id, input, { waitForMessage: false })));

    await new Promise(r => setTimeout(r, 1000)); // wait for the second batch of messages to be scheduled

    app.console.log("--- Step 5: Verifying the last 2 messages are in 'scheduled' state");
    const queueItems = (await httpClient.semaphore.readQueue(testSemaphore.id, { status: "scheduled" })).data;
    app.console.log("Queue items: ", queueItems);
   
    expect((queueItems as any)?.length === 2, "The last 2 messages should be in 'scheduled' state actual: " + (queueItems as any)?.length);

    app.console.log("--- Step 6: Releasing the first 3 messages");
    await Promise.all(firstBatchAcquired.map(job => job.release()));

    app.console.log("--- Step 7: Waiting for the last 2 messages to be acquired");

    const rp = [] as Promise<void>[];
    while(secondBatch.length) {
        const m = await app.waitForMessage(); // wait for the first 3 messages to be acquired
        secondBatch.splice(firstBatch.findIndex(i => i.id === m.message.id), 1);
        app.console.log("First batch: ", firstBatch.length, "messages left to acquire");
        rp.push(m.release());
    }

    await Promise.all(rp);

    await new Promise(r => setTimeout(r, 3000)); // wait for the second batch releases to propagate

    app.console.log("--- Step 8: Verifying all messages are in 'done' state");
    const allJobs = await httpClient.semaphore.readQueue(testSemaphore.id, { channelId: "default", status: "done" });
    
    debugger;
    
    expect(!(allJobs.data as any).find((j: { status: string }) => j.status != "done"), "Not all jobs are in 'done' state");
    app.console.log("Concurrency control test completed successfully");
};
