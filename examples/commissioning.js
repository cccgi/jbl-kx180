const KX180 = require('../src/kx180');

async function run() {
    const mixer = new KX180();

    try {
        console.log("Connecting...");
        mixer.connect();

        // Step 1: Force Hardware Lock
        await mixer.initialize();
        console.log("\n>>> HARDWARE SHOULD NOW BE LOCKED (PC CONTROL) <<<");

        // Step 2: Test Main Mix (Problematic area)
        console.log("\n1. Testing Main Mixers...");
        mixer.setMainMusic(150);
        await new Promise(r => setTimeout(r, 1000));
        mixer.setMainMic(140);
        await new Promise(r => setTimeout(r, 1000));

        // Step 3: Test EQ (Problematic area)
        console.log("2. Testing Main EQ1...");
        mixer.setMainEQGain(1, 4.0); // +4dB
        await new Promise(r => setTimeout(r, 1000));

        // Step 4: Test Sub/Center
        console.log("3. Testing Sub/Center...");
        mixer.setSubVol(75);
        mixer.setSubPolarity(true);
        mixer.setCenterVol(70);

        console.log("\n>>> COMMISSIONING SEQUENCE COMPLETE <<<");
        console.log("Holding heartbeat for 10 seconds...");
        await new Promise(r => setTimeout(r, 10000));

    } catch (err) {
        console.error("Commissioning Failed:", err.message);
    } finally {
        await mixer.close();
    }
}

run();
