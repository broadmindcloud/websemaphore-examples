# WebSemaphore http example

## Description

This is a basic implementation of asynchronous task invocation via [WebSemaphore](https://www.websemaphore.com) using http(s). 
The same technique may be applied using other serverside and serverless frameworks or non-javascript languages as long as it can make an http call. The target party should be able to receive an inbound https call, i.e. be accessible via a public endpoint url.


## How it works
1. To configure a public endpoint, this example is using [localhost.run](https://localhost.run/). It will create a temporary tunnel at a public domain so that WebSemaphore can invoke the processor endpoint (see 3. Usage Scenarios at [integration scenarios](https://www.websemaphore.com/docs/v1/concepts/scenarios-integration#usage-scenarios) in the docs). Ngrok is another option (see env.ts in the repo root).
2. The demo will then create a WebSemaphore and configure its callback endpoint created in 1.
3. It will send a test message and await 

## Usage

1. Clone the repo

   `git clone broadmindcloud/websemaphore-examples`

2. Change directory to the cloned repo /http directory and install the dependencies:

   `npm install`

3. Configure the API key in ./env.ts. Get a key [here](https://www.websemaphore.com/semaphore/keys), or see [Configuring API keys](https://www.websemaphore.com/docs/v1/setup/key) for more info.

   Warning: Please note that storing the API Key in code is considered an insecure practice. Use a secrets manager instead.

4. Start with `npm run start`

5. The example will perform a one-message test and provide a link to a basic test ui at https://localhost:8087 (or another port configured in /env.ts).

## See also
* [Systems integration scenarios](https://www.websemaphore.com/docs/v1/concepts/scenarios-integration)
* [Supported protocols](https://www.websemaphore.com/docs/v1/concepts/protocols)
* [Async and sync: operating modes](https://www.websemaphore.com/docs/v1/concepts/operating-modes)
* [WebSemaphore Docs](https://www.websemaphore.com/docs/v1)


## License
ISC
