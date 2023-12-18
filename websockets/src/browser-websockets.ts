import { WebSemaphoreWebsocketsClientManager } from "websemaphore";
import { webSocketsSemaphoreTest } from "./shared";
import * as env from "../../env";

const main = async () => {
    const manager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket, logLevel: "ALL" });
    const client = await manager.connect(env.APIKEY);
    debugger;
    await webSocketsSemaphoreTest(client, log);

    log("Closing connection");

    await manager.disconnect();



}

main();







const pre = document.createElement("pre");
document.body.appendChild(pre);
const log = (...args: any) =>
    pre.innerHTML +=
        args.map((a: any) =>a.toString()).join(" ") + "\n";



