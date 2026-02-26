const HID = require('node-hid');
try {
    console.log("HID version:", process.versions);
    const devices = HID.devices();
    console.log(`Found ${devices.length} HID devices.`);
    const kx180 = devices.filter(d => d.vendorId === 0x1210 && d.productId === 0x0042);
    if (kx180.length > 0) {
        console.log("SUCCESS: JBL KX-180 Mixer found!");
    } else {
        console.error("FAILURE: JBL KX-180 Mixer not detected.");
    }
} catch (e) {
    console.error("CRITICAL ERROR during HID check:", e.message);
    process.exit(1);
}
