// Inline implementation from dateUtils.ts (UPDATED)
const safeIsoDate = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    // Replace space with T
    let iso = dateStr.replace(' ', 'T');

    // Normalize Postgres +00 offset to +00:00 (or Z) if purely +00
    if (iso.endsWith('+00')) {
        iso = iso.replace(/\+00$/, '+00:00');
    }
    return iso;
};

// Fix for TS: String.prototype.endsWith might need polyfill or lower case if older env, but Node 18+ is fine.
// Actually let's use a safer check just in case.
const safeIsoDateRobust = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    let iso = dateStr.replace(' ', 'T');
    if (iso.slice(-3) === '+00') {
        iso = iso.slice(0, -3) + '+00:00';
    }
    return iso;
};

const safeParseDate = (dateStr: string): Date => {
    return new Date(safeIsoDateRobust(dateStr));
};

console.log('Running Final Date Verification...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        failed++;
    }
}

function verify() {
    try {
        // Test 1: Postgres Timestamp (space separator + short offset)
        const postgresStr = '2025-01-01 10:00:00+00';
        const date1 = safeParseDate(postgresStr);
        // Should become 2025-01-01T10:00:00+00:00 -> Valid ISO

        assert(
            !isNaN(date1.getTime()),
            `Postgres timestamp should parse to valid Date: ${postgresStr} -> ${date1.toISOString()}`
        );

        assert(
            date1.toISOString() === '2025-01-01T10:00:00.000Z',
            `Postgres timestamp should equal UTC time: ${date1.toISOString()}`
        );

        // Test 2: Standard ISO
        const isoStr = '2025-01-01T10:00:00.000Z';
        const date2 = safeParseDate(isoStr);
        assert(
            date2.toISOString() === isoStr,
            `Standard ISO should remain unchanged: ${isoStr}`
        );

        console.log(`\nTests Complete: ${passed} Passed, ${failed} Failed`);
        if (failed > 0) process.exit(1);

    } catch (e: any) {
        console.error('CRITICAL FAILURE:', e.message);
        process.exit(1);
    }
}

verify();
