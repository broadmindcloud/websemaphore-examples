import { tunnel as ngrok } from "./ngrok-express";
import { tunnel as lhr } from "./localhost-run-express";

export default {
    ngrok,
    "localhost.run": lhr
}