try {
    const KX180 = require('./src/lib/kx180.cjs');
    const mixer = new KX180();
    console.log("SUCCESS: Library imported and instantiated.");
} catch (e) {
    console.error("CRITICAL ERROR importing library:", e.stack);
    process.exit(1);
}
