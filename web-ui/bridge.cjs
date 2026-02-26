const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const KX180 = require('./src/lib/kx180.cjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const mixer = new KX180();
let connected = false;

// Source of Truth for all clients
let currentParams = {
    // MUSIC TAB
    masterMusic: 30, masterMic: 25, masterEffect: 30,
    muteMusic: false, muteMic: false, muteEffect: false,
    inputSource: 0,
    musicEQ: Array(15).fill(0),
    musicEQBypass: Array(15).fill(false),

    // MIC TAB
    mic1: 25, mic2: 25,
    mic1FBX: 0, mic2FBX: 0,
    mic1HPF: 40, mic2HPF: 40,
    mic1EQ: Array(15).fill(0),
    mic1EQBypass: Array(15).fill(false),
    mic1Comp: { threshold: 0, attack: 45, release: 360, ratio: 4.0 },
    mic2EQ: Array(15).fill(0),
    mic2EQBypass: Array(15).fill(false),
    mic2Comp: { threshold: 0, attack: 45, release: 360, ratio: 4.0 },

    // ECHO TAB
    echoVol: 100, echoDry: 100, echoDelay: 220, echoRepeat: 55,
    echoLPF: 12000, echoHPF: 40, echoPreDelay: 0, echoDamping: 12000,

    // REVERB TAB
    reverbVol: 100, reverbDry: 100, reverbTime: 3000, reverbPreDelay: 50,
    reverbLPF: 12000, reverbHPF: 40,
    reverbModel: 1,

    // EFFECT EQ (5 Bands)
    echoEQ: Array(5).fill(0),
    echoEQBypass: Array(5).fill(false),
    reverbEQ: Array(5).fill(0),
    reverbEQBypass: Array(5).fill(false),

    // SYSTEM
    masterCenter: 50, masterSub: 50,
    muteCenter: false, muteSub: false,
    currentPreset: 0
};

// Map hardware Bank/ID to parameter keys
const hardwareMap = {
    // SYSTEM
    '0a:00': 'masterMusic', '0a:01': 'masterMic', '0a:02': 'masterEffect',
    '0a:21': 'muteMusic', '0a:22': 'muteMic', '0a:23': 'muteEffect',
    '0a:03': 'inputSource', '0a:0c': 'mic1FBX', '0a:0d': 'mic2FBX',
    // MIC Channels
    '01:14': 'mic1', '02:14': 'mic2',
    '01:00': 'mic1HPF', '02:00': 'mic2HPF',
    // CENTER/SUB
    '06:04': 'masterCenter', '07:03': 'masterSub',
    '06:06': 'muteCenter', '07:15': 'muteSub',
    // EFFECTS
    '03:27': 'echoVol', '03:28': 'echoDry', '03:00': 'echoDelay', '03:01': 'echoRepeat',
    '03:02': 'echoLPF', '03:03': 'echoHPF', '03:04': 'echoPreDelay', '03:05': 'echoDamping',
    '03:29': 'reverbVol', '03:10': 'reverbDry', '03:0d': 'reverbTime', '03:0e': 'reverbPreDelay',
    '03:2a': 'reverbModel'
};

mixer.onUpdate = (data) => {
    const { type, bank, id, value } = data;
    const key = hardwareMap[`${bank.toString(16).padStart(2, '0')}:${id.toString(16).padStart(2, '0')}`];

    if (key) {
        currentParams[key] = value;
        io.emit('set-param', { key, value });
    } else if (bank === 0x00 && type === 'precision') {
        // Music EQ
        currentParams.musicEQ[id] = value;
        io.emit('set-param', { key: 'musicEQ', index: id, value });
    } else if ((bank === 0x01 || bank === 0x02) && type === 'precision' && id < 15) {
        // Mic EQ
        const key = bank === 0x01 ? 'mic1EQ' : 'mic2EQ';
        currentParams[key][id] = value;
        io.emit('set-param', { key, index: id, value });
    } else if ((bank === 0x01 || bank === 0x02) && type === 'standard' && id >= 0x15 && id <= 0x18) {
        // Mic Comp
        const compKey = bank === 0x01 ? 'mic1Comp' : 'mic2Comp';
        const subMap = { 0x15: 'threshold', 0x16: 'attack', 0x17: 'release', 0x18: 'ratio' };
        const subKey = subMap[id];
        if (subKey) {
            currentParams[compKey][subKey] = value;
            io.emit('set-param', { key: compKey, subKey, value });
        }
    }
};

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('status', { connected });
    socket.emit('sync-state', currentParams);

    socket.on('connect-hw', async () => {
        try {
            mixer.connect();
            await mixer.initialize(); // Send lock sequences and start heartbeat
            connected = true;
            console.log("Connected and initialized KX-180.");
            io.emit('status', { connected });
        } catch (e) {
            console.error("Connection failed:", e.message);
            socket.emit('error', { message: e.message });
        }
    });

    socket.on('release-hw', async () => {
        try {
            await mixer.close(); // Stop heartbeat and close HID
            connected = false;
            console.log("Disconnected from KX-180.");
            io.emit('status', { connected });
        } catch (e) {
            console.error("Release failed:", e.message);
        }
    });

    socket.on('set-param', (data) => {
        const { key, bank, id, value, type } = data;
        // Update local state
        if (key) currentParams[key] = value;
        // Broadcast to others
        socket.broadcast.emit('set-param', data);

        if (connected && mixer.device) {
            switch (type) {
                case 'standard':
                    mixer.setStandard(bank, id, value);
                    break;
                case 'precision':
                    mixer.setPrecision(bank, id, value);
                    break;
            }
        }
    });

    socket.on('update-params', (data) => {
        Object.assign(currentParams, data);
        socket.broadcast.emit('sync-state', currentParams);
    });

    socket.on('recall-program', (data) => {
        currentParams.currentPreset = data.index;
        socket.broadcast.emit('recall-program', data);
        if (connected) mixer.recallProgram(data.index);
    });

    socket.on('set-mic-fbx', (data) => {
        const key = data.micIndex === 0 ? 'mic1FBX' : 'mic2FBX';
        currentParams[key] = data.value;
        socket.broadcast.emit('set-mic-fbx', data);
        if (connected) mixer.setMicFBX(data.micIndex, data.value);
    });

    socket.on('set-mic-hpf', (data) => {
        const key = data.micIndex === 0 ? 'mic1HPF' : 'mic2HPF';
        currentParams[key] = data.value;
        socket.broadcast.emit('set-mic-hpf', data);
        if (connected) mixer.setMicHPF(data.micIndex, data.value);
    });

    socket.on('set-reverb-lpf', (data) => {
        currentParams.reverbLPF = data.value;
        socket.broadcast.emit('set-reverb-lpf', data);
        if (connected) mixer.setReverbLoPass(data.value);
    });

    socket.on('set-reverb-hpf', (data) => {
        currentParams.reverbHPF = data.value;
        socket.broadcast.emit('set-reverb-hpf', data);
        if (connected) mixer.setReverbHiPass(data.value);
    });

    socket.on('trigger-pulse', () => {
        console.log('Event: trigger-pulse');
        if (connected) mixer.startPulse();
    });

    socket.on('stop-pulse', () => {
        console.log('Event: stop-pulse');
        if (connected) mixer.stopPulse();
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(3001, () => {
    console.log('Bridge server listening on port 3001');
});
