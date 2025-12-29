/**
 * Unit tests for useChatStore pending item state management
 * Run with: npx ts-node src/store/__tests__/chatStore.test.ts
 */

// Type definitions (matching useChatStore.ts)
type ItemType = 'task' | 'bill' | 'renewal' | 'followup' | 'reminder' | 'note';
type ItemPriority = 'low' | 'med' | 'high';
type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface PendingItemState {
    partialData: {
        title?: string;
        type?: ItemType;
        priority?: ItemPriority;
        dueAt?: string | null;
        remindAt?: string | null;
        details?: string;
        repeat?: RepeatFrequency;
        repeatConfig?: string | null;
    };
    missingFields: ('priority' | 'dueAt' | 'remindAt' | 'type' | 'details')[];
    currentQuestion: string | null;
    awaitingField: string | null;
}

// Simple in-memory state simulation
let pendingItem: PendingItemState | null = null;

function startPendingItem(
    partialData: PendingItemState['partialData'],
    missingFields: PendingItemState['missingFields'],
    question: string | null,
    awaitingField: string | null
) {
    pendingItem = {
        partialData,
        missingFields,
        currentQuestion: question,
        awaitingField,
    };
}

function updatePendingItem(field: string, value: any) {
    if (!pendingItem) return;

    const updatedPartialData = {
        ...pendingItem.partialData,
        [field]: value,
    };

    const remainingFields = pendingItem.missingFields.filter(f => f !== field);

    pendingItem = {
        ...pendingItem,
        partialData: updatedPartialData,
        missingFields: remainingFields as PendingItemState['missingFields'],
        awaitingField: null,
        currentQuestion: null,
    };
}

function completePendingItem(): PendingItemState['partialData'] | null {
    if (!pendingItem) return null;
    const data = pendingItem.partialData;
    pendingItem = null;
    return data;
}

function cancelPendingItem() {
    pendingItem = null;
}

function hasPendingItem(): boolean {
    return pendingItem !== null;
}

// Reset state between tests
function resetState() {
    pendingItem = null;
}

// Test utilities
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    resetState();
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

function expect<T>(actual: T) {
    return {
        toBe(expected: T) {
            if (actual !== expected) {
                throw new Error(`Expected "${expected}" but got "${actual}"`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected truthy but got "${actual}"`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected falsy but got "${actual}"`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new Error(`Expected null but got "${actual}"`);
            }
        },
        toEqual(expected: any) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
            }
        },
        toContain(item: any) {
            if (!Array.isArray(actual) || !actual.includes(item)) {
                throw new Error(`Expected array to contain "${item}"`);
            }
        },
        toHaveLength(length: number) {
            if (!Array.isArray(actual) || actual.length !== length) {
                throw new Error(`Expected array length ${length} but got ${(actual as any)?.length}`);
            }
        }
    };
}

// ============ TESTS ============

console.log('\n💬 Testing useChatStore Pending Item State\n');
console.log('─'.repeat(60));

// Test 1: Initial state has no pending item
test('Initial state: hasPendingItem() returns false', () => {
    expect(hasPendingItem()).toBe(false);
});

// Test 2: Start pending item
test('startPendingItem creates pending state', () => {
    startPendingItem(
        { title: 'Buy groceries', type: 'task' },
        ['priority', 'dueAt'],
        'What priority should this be?',
        'priority'
    );

    expect(hasPendingItem()).toBe(true);
    expect(pendingItem!.partialData.title).toBe('Buy groceries');
    expect(pendingItem!.partialData.type).toBe('task');
    expect(pendingItem!.missingFields).toContain('priority');
    expect(pendingItem!.missingFields).toContain('dueAt');
    expect(pendingItem!.currentQuestion).toBe('What priority should this be?');
    expect(pendingItem!.awaitingField).toBe('priority');
});

// Test 3: Update pending item
test('updatePendingItem adds field and removes from missing', () => {
    startPendingItem(
        { title: 'Buy groceries', type: 'task' },
        ['priority', 'dueAt'],
        'What priority?',
        'priority'
    );

    updatePendingItem('priority', 'high');

    expect(pendingItem!.partialData.priority).toBe('high');
    expect(pendingItem!.missingFields).toHaveLength(1);
    expect(pendingItem!.missingFields).toContain('dueAt');
    expect(pendingItem!.awaitingField).toBeNull();
    expect(pendingItem!.currentQuestion).toBeNull();
});

// Test 4: Complete pending item
test('completePendingItem returns data and clears state', () => {
    startPendingItem(
        { title: 'Buy groceries', type: 'task', priority: 'high' },
        [],
        null,
        null
    );

    const data = completePendingItem();

    expect(data!.title).toBe('Buy groceries');
    expect(data!.type).toBe('task');
    expect(data!.priority).toBe('high');
    expect(hasPendingItem()).toBe(false);
});

// Test 5: Cancel pending item
test('cancelPendingItem clears state', () => {
    startPendingItem(
        { title: 'Task' },
        ['priority'],
        'What priority?',
        'priority'
    );

    expect(hasPendingItem()).toBe(true);

    cancelPendingItem();

    expect(hasPendingItem()).toBe(false);
});

// Test 6: Multiple field updates
test('Multiple field updates accumulate correctly', () => {
    startPendingItem(
        { title: 'Meeting' },
        ['priority', 'dueAt', 'remindAt'],
        'Priority?',
        'priority'
    );

    updatePendingItem('priority', 'high');
    expect(pendingItem!.missingFields).toHaveLength(2);

    updatePendingItem('dueAt', '2024-12-30T09:00:00');
    expect(pendingItem!.missingFields).toHaveLength(1);

    updatePendingItem('remindAt', '2024-12-30T08:30:00');
    expect(pendingItem!.missingFields).toHaveLength(0);

    const data = completePendingItem();
    expect(data!.title).toBe('Meeting');
    expect(data!.priority).toBe('high');
    expect(data!.dueAt).toBe('2024-12-30T09:00:00');
    expect(data!.remindAt).toBe('2024-12-30T08:30:00');
});

// Test 7: Complete with no pending item
test('completePendingItem returns null when no pending item', () => {
    const data = completePendingItem();
    expect(data).toBeNull();
});

// Test 8: Update with no pending item (no-op)
test('updatePendingItem does nothing when no pending item', () => {
    updatePendingItem('priority', 'high');
    // Should not throw, pendingItem stays null
    expect(hasPendingItem()).toBe(false);
});

// Test 9: Full conversation flow simulation
test('Full conversation flow: create → question → answer → complete', () => {
    // User says "Add buy groceries"
    // AI responds with clarification needed
    startPendingItem(
        { title: 'Buy groceries', type: 'task' },
        ['priority'],
        'What priority should this be - high, medium, or low?',
        'priority'
    );

    expect(pendingItem!.awaitingField).toBe('priority');

    // User responds "High"
    updatePendingItem('priority', 'high');

    // No more missing fields
    expect(pendingItem!.missingFields).toHaveLength(0);

    // Complete and create item
    const finalData = completePendingItem();
    expect(finalData!.title).toBe('Buy groceries');
    expect(finalData!.type).toBe('task');
    expect(finalData!.priority).toBe('high');

    // State is cleared
    expect(hasPendingItem()).toBe(false);
});

// Test 10: Preserve other fields when updating
test('updatePendingItem preserves existing data', () => {
    startPendingItem(
        {
            title: 'Complex task',
            type: 'reminder',
            details: 'Some details here',
            repeat: 'daily'
        },
        ['priority', 'dueAt'],
        'Priority?',
        'priority'
    );

    updatePendingItem('priority', 'med');

    expect(pendingItem!.partialData.title).toBe('Complex task');
    expect(pendingItem!.partialData.type).toBe('reminder');
    expect(pendingItem!.partialData.details).toBe('Some details here');
    expect(pendingItem!.partialData.repeat).toBe('daily');
    expect(pendingItem!.partialData.priority).toBe('med');
});

// ============ SUMMARY ============

console.log('─'.repeat(60));
console.log(`\n📊 Chat Store Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    process.exit(1);
}
