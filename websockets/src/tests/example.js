

main1 = async () => {
    const state = {
        a: 10
    };

    const funcA = async () => {
        await new Promise(
            (resolve, reject) => {
                resolve(10)
            }
        );

        state.a = 100;
    };
    const funcB = async () => {
        state.a = 200;
    };

    const p2 = funcB();
    const p1 = funcA();

    // await p1;
    // await p2;

    await Promise.all([p1, p2]);

    console.log(state)
}

class Promise2 {
    callback = null;
    constructor(cb) {
        this.callback = () => {
            const res = 


            cb(res, rej);
        }
    }
    then(val) {

    }
}

main2 = async () => {
    const p = new Promise2((res, rej) => {
        setTimeout(() => {
            res(10);
        }, 3000);
    });
    const val = await p;
    console.log(val);

}


const compose = (f, g) => (val) => g(f(val));

const runOp = (arr, op) => arr.map((val) => {  console.log(val); return op(val); });

const main = () => {

    const a = [1,2,3];

    const r = runOp(a, compose((x) => x^4, x => x / 2));

    console.log(r);

}

main();
