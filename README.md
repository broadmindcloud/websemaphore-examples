# WebSemaphore examples

This repo provides reference implementations of concurrent resource control using [WebSemaphore](https://www.websemaphore.com/).
WebSemaphore provides seamless process synchronization in highly distributed environments.
Please note that by signing up to WebSemaphore you will get access to interactive demos that complement the examples in this repo.

This repo accompanies the [WebSemaphore TypeScript/JavaScript client](https://github.com/broadmindcloud/websemaphore). 

The currently available examples are in TypeScript, but since WebSemaphore is a service rest/websockets client in other languages can do the job just as well.

For the complete documenation see [WebSemaphore Docs](https://www.websemaphore.com/docs).

If you require samples for your specific stack/language, please open an issue in this repo or [contact us directly](https://www.websemaphore.com/contactus).


## Configuration
env.ts in the root of the repo is exposing these settings.

APIKEY - (required) put here the key that you can get at https://www.websemaphore.com/semaphore/keys

HTTP_PORT - the port both examples will listen on. Default is 8087.

LOG_LEVEL - set to ALL for verbose logging. Default is empty string.

SEMAPHORE_ID = the websemaphore the example will create websemaphore-example

## Important
* The websockets api does not include WebSemaphore management. That is, the
  websockets example will not create a semaphore but use the semaphore configured with the id identified by SEMAPHORE_ID.
  For this reason it's preferable to run the https example first. It will create and configure the websemaphore that the websockets example can also use.
  If you are in an environment that does not allow the https example to work properly such as behind a firewall, you map prefer to create a semaphore at https://www.websemaphore.com/semaphore.
* Each example has its own package.json, the reason being to include only relevant
  dependencies for each protocol (see step 2 below).

## Usage
You should have git and npm installed.

1. Clone this repo

`
git clone git@github.com:broadmindcloud/websemaphore-examples.git
`

2. Change directory to the demo you'd like to check and run:

`npm install`

See the individual README in demos below for more details.

## Examples:
* [HTTPS (express)](./http-express/README.md) - serves as an example for any http-based backend including serverless
* [Websockets (nodejs and browser)](./websockets/README.md) - best suited for long-running runtimes and/or environments where a public endpoint is hard/impossible to setup.