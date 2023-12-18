import ngrok from "@ngrok/ngrok";

ngrok.connect({ addr: 3010, authtoken_from_env: true }).then((url) => {
    console.log(`Ingress established at: ${url}`);
});