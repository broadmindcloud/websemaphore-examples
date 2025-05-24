
import { setup } from "./tests/00-setup";

import { _01_websockets_basic } from "./tests/01-websockets-basic";
import { _01_http_basic } from "./tests/01-http-basic";
import { _02_http_timeout } from "./tests/02-http-timeout";
import { _03_http_reschedule } from "./tests/03-http-reschedule-basic";

import { _02_websockets_timeout } from "./tests/02-websockets-timeout";
import { _03_websockets_reschedule } from "./tests/03-websockets-reschedule-basic";
import { _04_websockets_reschedule_order_retention } from "./tests/04-websockets-reschedule-order";
import { _05_websockets_requeue } from "./tests/05-websockets-requeue";
import { _06_websockets_cancel } from "./tests/06-websockets-cancel";
import { _07_http_delete } from "./tests/07-http-delete-test";

import { _10_mapping_basic } from "./tests/10-websockets-mapping-basic";
import { _11_mapping_change_transport } from "./tests/11-mapping-change-transport";

import { _21_transport_http_fallback } from "./tests/21-transport-http-fallback";
import { _22_transport_websemaphore_fallback } from "./tests/22-transport-websemaphore-fallback";
import { _04_http_reschedule_order } from "./tests/04-http-reschedule-order";
import { _05_http_requeue } from "./tests/05-http-requeue";
import { _06_http_cancel } from "./tests/06-http-cancel";
import { _07_websockets_delete } from "./tests/07-websockets-delete";
import { _33_channel_distinction } from "./tests/33-channel-distinction";
import { _34_channel_suspension } from "./tests/34-channel-suspension";
import { _35_concurrency_control } from "./tests/35-concurrency-control";

const ALL_TESTS: Record<string, (...p: Parameters<typeof _01_websockets_basic>) => any> = {
    
    // websockets-based
    _01_websockets_basic,
    _02_websockets_timeout,
    _03_websockets_reschedule,
    _04_websockets_reschedule_order_retention,
    _05_websockets_requeue,
    _06_websockets_cancel,
    _07_websockets_delete,

    // mapping and hybrid
    _10_mapping_basic,
    _11_mapping_change_transport,
    _21_transport_http_fallback,
    _22_transport_websemaphore_fallback,

    // http-based
    _01_http_basic,
    _02_http_timeout,
    _03_http_reschedule,
    _04_http_reschedule_order,
    _05_http_requeue,
    _06_http_cancel,
    _07_http_delete,

    // channels and concurrency
    _33_channel_distinction,
    _34_channel_suspension,
    _35_concurrency_control
    
}

Object.keys(ALL_TESTS);
const TESTS: typeof ALL_TESTS = { 
    ...ALL_TESTS,
    // _33_channel_distinction,
    // _01_http_basic,
    // _21_transport_http_fallback,

    // _34_channel_suspension
}


const hr = () => console.log("=".repeat(40));

const main = async () => {
    const app = await setup({ purgeDefaultChannel: true });

    const tests = TESTS

    console.time("Total test time");
    let testName = "";
    try {
        for (testName in tests) {
            hr();
            console.time(testName);
            console.log("START TEST: " + testName);
            hr();

            const test = TESTS[testName];
            await test(app, {});
            

            await new Promise(r => setTimeout(r, 1500)); // leave time for release propagations etc
            const lock = await app.httpClient.semaphore.readChannel(app.testSemaphore.id, { channelId: "default" });
            if(lock.data.lockValue! !== 0)
                throw new Error(`Test ${testName} left an unreleased lock: ` + JSON.stringify(lock))

            hr();
            console.timeEnd(testName);
            hr();
        }

        console.log(Object.keys(TESTS).length, " tests were completed successfully");
        console.timeEnd("Total test time")

        await app.httpSever.stop();
        console.log("Cleanup done");
    } catch (ex) {
        console.log("Error during tests:", ex);
        console.log("Last executed test:", testName);
    }
    process.exit(0);
}

main();
