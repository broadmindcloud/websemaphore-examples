/*
    get a key at https://www.websemaphore.com/semaphore/keys
*/
// export const APIKEY = "ApiKey 59dab9afc97d4f0cc3a3089f8f6cf412"; // 
// export const APIKEY = "ApiKey bf5a76919f9d1b88cfc0159942c4171b";
export const APIKEY_WORKER = "ApiKey a7208899d2e0ee51eeac8d67ce9a4cd6"; // a "worker" key
export const APIKEY_ADMIN = "ApiKey bf5a76919f9d1b88cfc0159942c4171b"; // an "admin" key

export const APIKEY = APIKEY_ADMIN;

/*
    supported regions: eu, us
*/
export const REGION = "us-dev"

/*
    change if this port is busy on your machine
*/
export const HTTP_PORT = 8087;

/*
    set to ALL for verbose logging
*/
export const LOG_LEVEL = "";

/*
    use another semaphore id
*/
export const SEMAPHORE_ID = "test-semaphore";
export const SEMAPHORE_ID_FAILOVER = "test-semaphore-failover";

/*
    the tunneling provider is only necessary for local demo/testing
    if you have a proper domain it should be used - see ./lib/configure-semaphore.ts

    available settings: "localhost.run" and "ngrok"
    localhost.run is the default and will work with no additional setup
    if you prefer ngrok for some specific reason, you need to set env variable NGROK_AUTHTOKEN - see their docs
*/
export const TUNNELING_PROVIDER = "ngrok"
// export const TUNNELING_PROVIDER = "localhost.run"
