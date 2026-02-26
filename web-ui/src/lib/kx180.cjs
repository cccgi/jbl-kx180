const HID = require('node-hid');
const handshakeData = require('./handshake_data_purified.json');

class KX180 {
    constructor(vid = 0x1210, pid = 0x0042) {
        this.vid = vid;
        this.pid = pid;
        this.device = null;
        this.heartbeatInterval = null;
        this.sessionSeq = 0x40; // Starting at a mid-range byte 
        this.isInitializing = false;
        this.isLocked = false;
    }

    static get BANKS() {
        return {
            MIC12: 0x01,
            MIC3: 0x02,
            ECHO_REV: 0x03,
            MAIN: 0x04,
            SURR: 0x05,
            CENTER: 0x06,
            SUB: 0x07,
            REC: 0x08,
            SYSTEM: 0x0A,
            MUSIC_EQ: 0x00,
            // Added for new methods
            MIC: 0x01, // Assuming MIC refers to MIC12
            MIC2: 0x02, // Assuming MIC2 refers to MIC3
            EFFECT: 0x03 // Assuming EFFECT refers to ECHO_REV bank
        };
    }

    // --- MUSIC EQ ---
    // bands 0-14, val is precision (e.g. 2560 for center)
    setMusicEQ(band, val) {
        if (band < 0 || band > 14) return;
        this.setPrecision(KX180.BANKS.MUSIC_EQ, band, val);
    }

    setMusicEQBypass(band) {
        this.setMusicEQ(band, 2560); // 0dB center
    }

    // --- SYSTEM & MASTER ---
    setMusicInput(val) { this.setStandard(KX180.BANKS.SYSTEM, 0x03, val); } // 0:VOD, 1:BGM, 2:OPT

    setMicFBX(micIndex, level) {
        const id = (micIndex === 0) ? 0x0c : 0x0d;
        this.setStandard(KX180.BANKS.SYSTEM, id, level);
    }

    setMicHPF(micIndex, val) {
        const bank = (micIndex === 0) ? KX180.BANKS.MIC : KX180.BANKS.MIC2;
        this.setStandard(bank, 0x00, val);
    }

    setReverbLoPass(val) { this.setStandard(KX180.BANKS.EFFECT, 0x0d, val); }
    setReverbHiPass(val) { this.setStandard(KX180.BANKS.EFFECT, 0x0e, val); }

    setRecall(index, sub = 0x03) {
        const p = Buffer.alloc(64, 0);
        p[0] = 0x01; p[1] = 0x09; p[2] = 0xFE;
        p[3] = 0x0B;
        p[4] = sub;
        p[5] = index;
        p[6] = 0x00;
        p[7] = 0x09;
        p[8] = 0x23;
        p[9] = 0x23;

        let sum = 0;
        for (let i = 3; i < 10; i++) sum += p[i];
        p[10] = (sum - 2) & 0xFF;
        p[62] = 0xA2; p[63] = 0x00;
        this.writePacket(p);
    }

    sendPing() {
        const p = Buffer.alloc(64, 0);
        p[0] = 0x01;
        p[1] = 0x00;
        p[2] = 0x00;
        p[3] = 0x00;
        p[4] = this.sessionSeq & 0xFF;
        p[5] = 0x05; // Constant from logs
        this.sessionSeq++;
        this.writePacket(p);
    }

    recallProgram(index) {
        // UNIVERSAL HARDWARE MAP (Derived from surgical log analysis)
        // Opcodes 0x03-0x09 = User Presets P01-P07
        // Opcodes 0x00-0x02 = Factory Templates POP, PRO, STE
        const opMap = [
            0x03, // P01 (Index 0)
            0x04, // P02 (Index 1)
            0x05, // P03 (Index 2)
            0x06, // P04 (Index 3)
            0x07, // P05 (Index 4)
            0x08, // P06 (Index 5)
            0x09, // P07 (Index 6)
            0x00, // POP (Index 7)
            0x01, // PRO (Index 8)
            0x02  // STE (Index 9)
        ];

        const targetOp = opMap[index] ?? 0x03;
        // The UNIVERSAL LAW: Activation Pulse = Selector Op + 0x0B
        const pulseOp = targetOp + 0x0B;

        console.log(`Driver: RECALL Index ${index} | Selector 0x${targetOp.toString(16).toUpperCase()} | Pulse 0x${pulseOp.toString(16).toUpperCase()}`);

        this.sendSyncRequest(); // Prime HID
        this.sendPing();

        // Step 1: Buffer Priming (Sweep modules 0-10 with Target Op)
        for (let m = 0; m <= 10; m++) {
            setTimeout(() => this.setRecall(m, targetOp), m * 20);
        }

        // Step 2: Physical Commitment (Target Op sweep + Activation Pulse)
        setTimeout(() => {
            console.log(`Driver: Committing Physical Hardware...`);
            // Target Op again for good measure (matches log redundancy)
            for (let m = 0; m <= 10; m++) {
                setTimeout(() => this.setRecall(m, targetOp), m * 20);
            }

            // Targeted Activation Pulse (Matches 5x bursts in logs)
            // Pulse only modules 0, 4, 5, 6, 7 as seen in successful sessions
            [0, 4, 5, 6, 7].forEach((m, i) => {
                setTimeout(() => this.setRecall(m, pulseOp), 300 + (i * 30));
            });
        }, 400);

        setTimeout(() => this.sendPing(), 1200);
    }

    setMicFBX(micIndex, level) {
        const id = (micIndex === 0) ? 0x0c : 0x0d;
        this.sendPing();
        this.setStandard(KX180.BANKS.SYSTEM, id, level);
        setTimeout(() => this.sendPing(), 50);
    }

    setMusicMute(isMute) { this.setStandard(KX180.BANKS.SYSTEM, 0x21, isMute ? 1 : 0); }
    setMicMute(isMute) { this.setStandard(KX180.BANKS.SYSTEM, 0x22, isMute ? 1 : 0); }
    setEffectMute(isMute) { this.setStandard(KX180.BANKS.SYSTEM, 0x23, isMute ? 1 : 0); }

    // --- EFFECT: ECHO ---
    setEchoVol(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x27, val); }
    setEchoDry(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x28, val); }
    setEchoDelay(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x00, val); }
    setEchoRepeat(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x01, val); }
    setEchoLPF(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x02, val); }
    setEchoHPF(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x03, val); }
    setEchoPreDelay(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x04, val); }
    setEchoDamping(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x05, val); }

    // --- EFFECT: REVERB ---
    setReverbVol(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x29, val); }
    setReverbDry(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x10, val); }
    setReverbTime(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x0d, val); }
    setReverbPreDelay(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x0e, val); }
    setReverbModel(val) { this.setStandard(KX180.BANKS.ECHO_REV, 0x2a, val); } // 1-4

    // --- OUTPUT VOLS ---
    setSubVol(val) { this.setStandard(KX180.BANKS.SUB, 0x03, val); }
    setSubMute(isMute) { this.setStandard(KX180.BANKS.SUB, 0x06, isMute ? 1 : 0); }
    setCenterVol(val) { this.setStandard(KX180.BANKS.CENTER, 0x04, val); }
    setCenterMute(isMute) { this.setStandard(KX180.BANKS.CENTER, 0x06, isMute ? 1 : 0); } // ID 0x06 seems common for output mutes

    connect() {
        const devices = HID.devices().filter(d => d.vendorId === this.vid && d.productId === this.pid);
        if (devices.length === 0) throw new Error("JBL KX-180 Mixer not found.");
        this.device = new HID.HID(devices[0].path);
        console.log("Connected to KX-180.");

        // Start background reading
        this.device.on('data', (data) => {
            // Log for debugging
            // console.log(`HID IN:  ${data.slice(0, 16).toString('hex').match(/.{1,2}/g).join(' ')}...`);

            this.parseInbound(data);
        });

        this.device.on('error', (err) => {
            console.error("HID DEVICE ERROR:", err.message);
        });
    }

    async close() {
        this.stopHeartbeat();
        if (this.device) {
            this.device.removeAllListeners('data');
            this.device.removeAllListeners('error');
            this.device.close();
            this.device = null;
        }
    }

    async initialize() {
        if (!this.device) throw new Error("Not connected.");
        if (this.isInitializing) {
            console.warn("Handshake already in progress. Ignoring duplicate request.");
            return;
        }

        this.isInitializing = true;
        this.isLocked = false;

        console.log(`Initializing Hardware Control Lock (300 steps)...`);

        // We now use the exact bit-perfect sequence from the software logs.
        // This performs full state enumeration which the hardware requires before 
        // accepting control commands like Presets or FBX.
        for (let i = 0; i < handshakeData.length; i++) {
            const hex = handshakeData[i];
            this.writePacket(Buffer.from(hex, 'hex'));

            // 20ms is the "Sweet Spot" for aggressive state enumeration
            await new Promise(r => setTimeout(r, 20));

            if (i > 0 && i % 50 === 0) console.log(`Handshake: ${i}/${handshakeData.length}...`);
        }

        console.log("Hardware Lock Established.");
        this.isLocked = true;
        this.isInitializing = false;
        this.startHeartbeat();
    }

    startHeartbeat() {
        this.stopHeartbeat();
        // Faster heartbeat (300ms) to maintain solid PC-Lock
        const hb = Buffer.from("0101ff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a200", 'hex');
        this.heartbeatInterval = setInterval(() => {
            this.writePacket(hb);
            // Every 7 heartbeats (~2.1s), send a Sync Request
            if (this.sessionSeq % 7 === 0) this.sendSyncRequest();
        }, 300);
    }

    sendSyncRequest() {
        // Bit-perfect Sync Request from logs
        const sync = Buffer.from("018000090000000000d835bd24f76800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", 'hex');
        this.writePacket(sync);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // --- DIAGNOSTIC PULSE ---
    startPulse() {
        console.log("PULSE START: Oscillating Music Volume 10 <-> 40...");
        let state = false;
        this.pulseInterval = setInterval(() => {
            const vol = state ? 50 : 10;
            console.log(`Pulse -> Music Vol: ${vol}`);
            this.setMusicVolume(vol);
            state = !state;
        }, 1500);
    }

    stopPulse() {
        if (this.pulseInterval) {
            clearInterval(this.pulseInterval);
            this.pulseInterval = null;
        }
    }

    setMusicVolume(val) {
        this.setStandard(KX180.BANKS.SYSTEM, 0x00, val);
    }

    writePacket(raw) {
        if (!this.device) return;
        const sendBuf = Buffer.alloc(65, 0);

        // Byte 0 is Report ID
        sendBuf[0] = raw[0];

        // Copy up to 64 bytes of payload from the source (starting at raw[1])
        // This ensures footers at index 63 are preserved.
        raw.copy(sendBuf, 1, 1);

        try {
            this.device.write(sendBuf);
            console.log(`HID OUT: ${raw.slice(0, 16).toString('hex').match(/.{1,2}/g).join(' ')}...`);
        } catch (e) {
            console.error("HID WRITE ERROR:", e.message);
        }
    }

    setStandard(bank, id, val) {
        const p = Buffer.alloc(64, 0);
        p[0] = 0x01; p[1] = 0x09; p[2] = 0xFE;
        p[3] = 0x00;
        p[4] = 0x00;
        p[5] = bank;
        p[6] = id;
        p[7] = 0x09;
        p[8] = 0x00;
        p[9] = val;

        let sum = 0;
        for (let i = 3; i < 10; i++) sum += p[i];
        p[10] = (sum - 2) & 0xFF;

        p[62] = 0xA2; p[63] = 0x00;
        this.writePacket(p);
    }

    setPrecision(bank, id, val16) {
        const p = Buffer.alloc(64, 0);
        p[0] = 0x01; p[1] = 0x0F; p[2] = 0xFE;

        if (bank === 0x00) {
            // Music EQ Variant
            p[3] = 0x00; p[4] = 0x00;
            p[5] = bank;
            p[6] = 0x00; // Group ID
            p[7] = 0x0F;
            p[8] = 0x00;
            p[9] = (val16 >> 8) & 0xFF; // High Byte
            p[10] = 0x00;
            p[11] = id; // Band ID (ID 0-14 used as Sub-ID)
            p[12] = 0x00;
            p[13] = val16 & 0xFF; // Low Byte
            p[14] = 0x00;
            p[15] = 0x10; // Footer
        } else {
            // Generic Precision (Best guess)
            p[5] = bank; p[6] = id; p[7] = 0x0F;
            p[12] = (val16 >> 8) & 0xFF;
            p[13] = val16 & 0xFF;
        }

        p[62] = 0xA2; p[63] = 0x00;
        this.writePacket(p);
    }

    parseInbound(p) {
        if (!p || p.length < 11) return;

        // Report IDs: 0x01 (most commands), 0x02 (heartbeat/echo)
        if (p[0] === 0x01 && p[2] === 0xFE) {
            const len = p[1];
            if (len === 0x09) {
                // Standard Parameter Packet
                const bank = p[5];
                const id = p[6];
                const value = p[9];
                this.emitUpdate('standard', bank, id, value);
            } else if (len === 0x0F) {
                // Precision Parameter Packet (e.g. EQ)
                const bank = p[5];
                let id, value;
                if (bank === 0x00) {
                    // Music EQ
                    id = p[11];
                    value = (p[9] << 8) | p[13];
                } else {
                    id = p[6];
                    value = (p[12] << 8) | p[13];
                }
                this.emitUpdate('precision', bank, id, value);
            }
        }
    }

    emitUpdate(type, bank, id, value) {
        // This will be caught by bridge.cjs
        if (this.onUpdate) {
            this.onUpdate({ type, bank, id, value });
        }
    }
}

module.exports = KX180;
