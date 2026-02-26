const HID = require('node-hid');

class KX180 {
    constructor(vid = 0x1210, pid = 0x0042) {
        this.vid = vid;
        this.pid = pid;
        this.device = null;
        this.heartbeatInterval = null;
    }

    static get BANKS() {
        return {
            MIC12: 0x01,
            MIC3: 0x02,
            MAIN: 0x04,
            SURR: 0x05,
            CENTER: 0x06,
            SUB: 0x07,
            REC: 0x08,
            SYSTEM: 0x0A
        };
    }

    connect() {
        const devices = HID.devices().filter(d => d.vendorId === this.vid && d.productId === this.pid);
        if (devices.length === 0) throw new Error("JBL KX-180 Mixer not found.");
        this.device = new HID.HID(devices[0].path);
        console.log("Connected to KX-180.");
    }

    async close() {
        this.stopHeartbeat();
        if (this.device) {
            this.device.close();
        }
    }

    /**
     * PRECISION SYNC:
     * Replays the exact startup sequence to force the hardware into 'PC Control' mode.
     */
    async initialize() {
        if (!this.device) throw new Error("Not connected.");

        console.log("Initializing Hardware Control Lock...");
        // Replaying MORE context to ensure the screen locks.
        const sequences = [
            "01010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "010101ff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a200",
            "0101ff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000",
            "010101ff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a200",
            "010f fe fa 23 23 23 0f 4a 42 4c 5f 43 54 52 4c dc 00000000000000000000000000000000000000000000000000000000000000000000000000000000a200".replace(/ /g, ''),
            "0109 fe 09 23 23 23 09 23 23 bf 000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a200".replace(/ /g, '')
        ];

        for (const hex of sequences) {
            this.writePacket(Buffer.from(hex, 'hex'));
            await new Promise(r => setTimeout(r, 200));
        }

        this.startHeartbeat();
    }

    startHeartbeat() {
        this.stopHeartbeat();
        // Heartbeat uses the common 01 01 ff pattern
        const hb = Buffer.from("0101ff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a200", 'hex');
        this.heartbeatInterval = setInterval(() => this.writePacket(hb), 350);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    writePacket(raw) {
        if (!this.device) return;
        // Windows HID Sync: Report ID at index 0
        const sendBuf = Buffer.alloc(65, 0);
        sendBuf[0] = raw[0];
        raw.copy(sendBuf, 1, 1);
        try {
            this.device.write(sendBuf);
        } catch (e) {
            console.error("HID WRITE ERROR:", e.message);
        }
    }

    // --- Core Protocol Setters ---

    setStandard(bank, id, val) {
        const p = Buffer.alloc(64, 0);
        p[0] = 0x01; p[1] = 0x09; p[2] = 0xFE;
        p[5] = bank; p[6] = id; p[7] = 0x09; p[9] = val;

        let sum = 0;
        for (let i = 3; i < 10; i++) sum += p[i];
        p[10] = (sum - 2) & 0xFF;

        p[62] = 0xA2; p[63] = 0x00;
        this.writePacket(p);
    }

    setPrecision(bank, id, val16) {
        const p = Buffer.alloc(64, 0);
        p[0] = 0x01; p[1] = 0x0F; p[2] = 0xFE;
        p[5] = bank; p[6] = id; p[7] = 0x0F;

        let sum = 0;
        for (let i = 3; i < 10; i++) sum += p[i];
        p[10] = (sum >> 8) & 0xFF;
        p[11] = sum & 0xFF;

        p[12] = (val16 >> 8) & 0xFF;
        p[13] = val16 & 0xFF;
        p[62] = 0xA2; p[63] = 0x00;
        this.writePacket(p);
    }

    // --- High-Level API ---

    setMainMusic(val) { this.setStandard(KX180.BANKS.MAIN, 0x00, val); }

    /**
     * Main Mic Slider
     * We try both Bank 4 (Mixer) and Bank 1 (Channel) to see which one links to the UI.
     */
    setMainMic(val) { this.setStandard(KX180.BANKS.MAIN, 0x01, val); }
    setMicChannelVol(val) { this.setStandard(KX180.BANKS.MIC12, 0x14, val); }

    setSubVol(val) { this.setStandard(KX180.BANKS.SUB, 0x03, val); }
    setSubPolarity(isNeg) { this.setStandard(KX180.BANKS.SUB, 0x06, isNeg ? 1 : 0); }

    setCenterVol(val) { this.setStandard(KX180.BANKS.CENTER, 0x04, val); }

    setMainEQGain(band, dbValue) {
        const id = 0x07 + band;
        const val16 = Math.round((dbValue + 24) * (366 / 36) + 10);
        this.setPrecision(KX180.BANKS.MAIN, id, val16);
    }
}

module.exports = KX180;
