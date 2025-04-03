import * as env from "../../env";

const { SEMAPHORE_ID } = env;


export const config = {
  id: SEMAPHORE_ID,
  title: "websemaphore-examples",
  maxValue: 3,
  isActive: true,
  callback: {
    onDeliveryError: "drop",
    isActive: true,
    address: "", // callback
  },
  websockets: {
    onClientDropped: "drop"
  },
  timeout: {
    value: 10 * 1000
  }
}

export const configureSemaphore = (callback: string) => {
  console.log(`Configuring semaphore '${SEMAPHORE_ID}' to callback ${callback}`);
  config.callback.address = callback;

  return config;
}