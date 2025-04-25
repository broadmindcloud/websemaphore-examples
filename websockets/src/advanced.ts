
import { setup } from "./tests/00-setup";

import { _01_BasicTest } from "./tests/01-websockets-basic";
import { _01_http_basic } from "./tests/01-http-basic";
import { _02_http_timeout } from "./tests/02-http-timeout";
import { _03_http_reschedule } from "./tests/03-http-reschedule-basic";

import { _02_websockets_timeout } from "./tests/02-websockets-timeout";
import { _03_RescheduleTest } from "./tests/03-websockets-reschedule-basic";
import { _04_RescheduleOrderRetentionTest } from "./tests/04-websockets-reschedule-order";
import { _05_RequeueTest } from "./tests/05-websockets-requeue";
import { _06_CancelTest } from "./tests/06-websockets-cancel-test";
import { _07_DeleteTest } from "./tests/07-websockets-delete-test";

import { _10_mapping_basic } from "./tests/10-websockets-mapping-basic";
import { _11_mapping_change_transport } from "./tests/11-mapping-change-transport";

import { _21_transport_http_fallback } from "./tests/21-transport-http-fallback";
import { _22_transport_websemaphore_fallback } from "./tests/22-transport-websemaphore-fallback";
import { _04_http_reschedule_order } from "./tests/04-http-reschedule-order";
import { _05_HttpRequeueTest } from "./tests/05-http-requeue";
import { _06_http_CancelTest } from "./tests/06-http-cancel-test";
import { _07_http_DeleteTest } from "./tests/07-http-delete-test";
import { _33_channel_distinction } from "./tests/33-channel-distinction";

const ALL_TESTS: Record<string, (...p: Parameters<typeof _01_BasicTest>) => any> = {
    
    // websockets-based
    _01_BasicTest,
    _02_websockets_timeout,
    _03_RescheduleTest,
    _04_RescheduleOrderRetentionTest,
    _05_RequeueTest,
    _06_CancelTest,
    _07_DeleteTest,

    // mapping and hybrid
    _10_mapping_basic,
    _11_mapping_change_transport,
    _21_transport_http_fallback,
    _22_transport_websemaphore_fallback,

    _01_http_basic,
    _02_http_timeout,
    _03_http_reschedule,
    _04_http_reschedule_order,
    _05_HttpRequeueTest,
    _06_http_CancelTest,
    _07_http_DeleteTest,

    _33_channel_distinction,
}

Object.keys(ALL_TESTS);
const TESTS: typeof ALL_TESTS = { 
    // ...ALL_TESTS,
    _33_channel_distinction
}

const main = async () => {
    const config = await setup();

    const tests = TESTS

    console.time("Total test time")
    try {
        for (const testName in tests) {
            console.log("=".repeat(40));
            console.time(testName);
            console.log("START TEST: " + testName);
            console.log("=".repeat(40));

            const test = TESTS[testName];

            await test(config);
            console.log("=".repeat(40));
            console.timeEnd(testName);
            console.log("=".repeat(40));
        }

        console.log(Object.keys(TESTS).length, " tests were completed successfully");
        console.timeEnd("Total test time")

    } catch (ex) {
        console.log("Error during tests:", ex);
    }
    process.exit(0);
}

main();
