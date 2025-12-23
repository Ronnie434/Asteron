import * as Crypto from 'expo-crypto';
import { Item } from '../db/items';

// Helper function to create dates relative to today
const getRelativeDate = (daysOffset: number, hour = 9, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
};

export const MOCK_ITEMS: Item[] = [
    {
        id: Crypto.randomUUID(),
        title: 'Finish project proposal draft',
        details: 'Include budget estimates and timeline.',
        type: 'task',
        dueAt: getRelativeDate(0, 17, 0), // Today at 5 PM
        remindAt: getRelativeDate(0, 9, 0), // Today at 9 AM
        priority: 'high',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Team meeting at 2:00 PM',
        details: 'Zoom link in calendar.',
        type: 'task',
        dueAt: getRelativeDate(0, 14, 0), // Today at 2 PM
        remindAt: getRelativeDate(0, 13, 45), // Today at 1:45 PM
        priority: 'med',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Call dentist for appointment',
        type: 'task',
        dueAt: getRelativeDate(0, 16, 0), // Today at 4 PM
        priority: 'low',
        status: 'active',
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Review Q4 performance metrics',
        type: 'task',
        dueAt: getRelativeDate(0, 11, 0), // Today at 11 AM
        priority: 'high',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Send birthday card to mom',
        type: 'task',
        dueAt: getRelativeDate(0, 18, 0), // Today at 6 PM
        priority: 'med',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Pick up dry cleaning',
        type: 'task',
        dueAt: getRelativeDate(0, 15, 30), // Today at 3:30 PM
        priority: 'low',
        status: 'active',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Submit quarterly report',
        type: 'task',
        dueAt: getRelativeDate(2, 9, 0), // 2 days from now
        priority: 'high',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Pay electricity bill',
        type: 'bill',
        dueAt: getRelativeDate(1, 9, 0), // Tomorrow
        priority: 'high',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Schedule annual checkup',
        type: 'task',
        dueAt: getRelativeDate(3, 10, 0), // 3 days from now
        priority: 'med',
        status: 'active',
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Car maintenance due',
        type: 'task',
        dueAt: getRelativeDate(7, 9, 0), // 7 days from now
        priority: 'med',
        status: 'active',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Renew gym membership',
        type: 'task',
        dueAt: getRelativeDate(5, 12, 0), // 5 days from now
        priority: 'low',
        status: 'active',
        confidence: 0.7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Book flight for vacation',
        type: 'task',
        dueAt: getRelativeDate(4, 14, 0), // 4 days from now
        priority: 'high',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Update LinkedIn profile',
        type: 'task',
        dueAt: getRelativeDate(6, 10, 0), // 6 days from now
        priority: 'low',
        status: 'active',
        confidence: 0.6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Prepare presentation slides',
        type: 'task',
        dueAt: getRelativeDate(1, 16, 0), // Tomorrow at 4 PM
        priority: 'high',
        status: 'active',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: Crypto.randomUUID(),
        title: 'Order office supplies',
        type: 'task',
        dueAt: getRelativeDate(2, 11, 0), // 2 days from now
        priority: 'med',
        status: 'active',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];
