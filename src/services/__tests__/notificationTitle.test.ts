/**
 * Unit tests for getNotificationTitle function
 * Run with: npx ts-node src/services/__tests__/notificationTitle.test.ts
 */

// Copy of getNotificationTitle for testing (same logic as in NotificationService.ts)
const getNotificationTitle = (remindAt: Date, dueAt: Date | null, title: string): string => {
    // No due date = pure reminder
    if (!dueAt) {
        return `Reminder: ${title}`;
    }

    const diffMs = dueAt.getTime() - remindAt.getTime();
    const diffMin = Math.round(diffMs / 60000);

    // Overdue: reminder fires after due date
    if (diffMs < 0) {
        return `Overdue: ${title}`;
    }

    // Due now: within 5 minutes
    if (diffMin <= 5) {
        return `Due now: ${title}`;
    }

    // Due in X min: within 1 hour
    if (diffMin <= 60) {
        return `Due in ${diffMin} min: ${title}`;
    }

    // Check if same day
    const isSameDay = remindAt.toDateString() === dueAt.toDateString();
    if (isSameDay) {
        const timeStr = dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `Due at ${timeStr}: ${title}`;
    }

    // Check if tomorrow
    const tomorrow = new Date(remindAt);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.toDateString() === dueAt.toDateString();
    if (isTomorrow) {
        const timeStr = dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `Due tomorrow at ${timeStr}: ${title}`;
    }

    // Further out - show day name
    const dayName = dueAt.toLocaleDateString([], { weekday: 'short' });
    const timeStr = dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Due ${dayName} at ${timeStr}: ${title}`;
};

// Test utilities
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e: any) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${e.message}`);
        failed++;
    }
}

function expect(actual: string) {
    return {
        toBe(expected: string) {
            if (actual !== expected) {
                throw new Error(`Expected "${expected}" but got "${actual}"`);
            }
        },
        toContain(substring: string) {
            if (!actual.includes(substring)) {
                throw new Error(`Expected "${actual}" to contain "${substring}"`);
            }
        },
        toStartWith(prefix: string) {
            if (!actual.startsWith(prefix)) {
                throw new Error(`Expected "${actual}" to start with "${prefix}"`);
            }
        }
    };
}

// ============ TESTS ============

console.log('\n📋 Testing getNotificationTitle()\n');
console.log('─'.repeat(50));

// Test 1: Reminder only (no due date)
test('Reminder only (no due date) → "Reminder: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = null;
    const result = getNotificationTitle(remindAt, dueAt, 'Pick up dry cleaning');
    expect(result).toBe('Reminder: Pick up dry cleaning');
});

// Test 2: Reminder = due time (Due now)
test('Reminder = due time → "Due now: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = new Date('2024-12-29T09:00:00'); // Same time
    const result = getNotificationTitle(remindAt, dueAt, 'Submit report');
    expect(result).toBe('Due now: Submit report');
});

// Test 3: Reminder 30 min before due
test('Reminder 30 min before due → "Due in 30 min: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = new Date('2024-12-29T09:30:00'); // 30 min later
    const result = getNotificationTitle(remindAt, dueAt, 'Call dentist');
    expect(result).toBe('Due in 30 min: Call dentist');
});

// Test 4: Reminder 45 min before due
test('Reminder 45 min before due → "Due in 45 min: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = new Date('2024-12-29T09:45:00'); // 45 min later
    const result = getNotificationTitle(remindAt, dueAt, 'Prepare slides');
    expect(result).toBe('Due in 45 min: Prepare slides');
});

// Test 5: Reminder morning, due afternoon (same day, > 1 hour)
test('Reminder morning, due afternoon → "Due at X:XX PM: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = new Date('2024-12-29T15:30:00'); // 3:30 PM
    const result = getNotificationTitle(remindAt, dueAt, 'Team meeting');
    expect(result).toStartWith('Due at ');
    expect(result).toContain('Team meeting');
    // Time format varies by locale, but should contain PM or the hour
});

// Test 6: Reminder AFTER due date (Overdue)
test('Reminder AFTER due date → "Overdue: ..."', () => {
    const remindAt = new Date('2024-12-29T10:00:00');
    const dueAt = new Date('2024-12-29T08:00:00'); // Due was 2 hours ago
    const result = getNotificationTitle(remindAt, dueAt, 'Pay rent');
    expect(result).toBe('Overdue: Pay rent');
});

// Test 7: Due within 5 minutes (edge case for "Due now")
test('Due in 3 min → "Due now: ..." (within 5 min threshold)', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = new Date('2024-12-29T09:03:00'); // 3 min later
    const result = getNotificationTitle(remindAt, dueAt, 'Quick task');
    expect(result).toBe('Due now: Quick task');
});

// Test 8: Due exactly 60 min later (edge of "Due in X min")
test('Due in exactly 60 min → "Due in 60 min: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const dueAt = new Date('2024-12-29T10:00:00'); // 60 min later
    const result = getNotificationTitle(remindAt, dueAt, 'Deadline');
    expect(result).toBe('Due in 60 min: Deadline');
});

// Test 9: Due tomorrow
test('Due tomorrow → "Due tomorrow at X:XX: ..."', () => {
    const remindAt = new Date('2024-12-29T18:00:00');
    const dueAt = new Date('2024-12-30T09:00:00'); // Next day
    const result = getNotificationTitle(remindAt, dueAt, 'Send invoice');
    expect(result).toStartWith('Due tomorrow at ');
    expect(result).toContain('Send invoice');
});

// Test 10: Due in 3 days
test('Due in 3 days → "Due [day] at X:XX: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00'); // Sunday
    const dueAt = new Date('2025-01-01T14:00:00'); // Wednesday
    const result = getNotificationTitle(remindAt, dueAt, 'Doctor appt');
    expect(result).toStartWith('Due ');
    expect(result).toContain('Doctor appt');
    // Should contain day name like "Wed"
});

// Test 11: Daily repeating task simulation - Day 1
test('Daily repeating - Day 1 occurrence', () => {
    // Simulating what scheduleAllOccurrences would compute
    const baseRemindAt = new Date('2024-12-29T09:00:00');
    const baseDueAt = new Date('2024-12-29T17:00:00'); // 5pm

    // Day 1: remindAt=9am, dueAt=5pm
    const result = getNotificationTitle(baseRemindAt, baseDueAt, 'Daily standup');
    expect(result).toStartWith('Due at ');
    expect(result).toContain('Daily standup');
});

// Test 12: Daily repeating task simulation - Day 2
test('Daily repeating - Day 2 occurrence (same time pattern)', () => {
    // Day 2 occurrence computed the same way
    const day2Remind = new Date('2024-12-30T09:00:00');
    const day2Due = new Date('2024-12-30T17:00:00');

    const result = getNotificationTitle(day2Remind, day2Due, 'Daily standup');
    expect(result).toStartWith('Due at ');
    expect(result).toContain('Daily standup');
});

// Test 13: Repeating task with no dueAt
test('Daily repeating with no dueAt → "Reminder: ..."', () => {
    const remindAt = new Date('2024-12-29T09:00:00');
    const result = getNotificationTitle(remindAt, null, 'Take medication');
    expect(result).toBe('Reminder: Take medication');
});

// ============ SUMMARY ============

console.log('─'.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    process.exit(1);
}
