import { safeIsoDate, safeParseDate } from '../dateUtils';

describe('dateUtils', () => {
    describe('safeIsoDate', () => {
        it('should replace space with T in Postgres-style timestamp', () => {
            const input = '2025-12-30 14:00:00+00';
            const expected = '2025-12-30T14:00:00+00';
            expect(safeIsoDate(input)).toBe(expected);
        });

        it('should leave already valid ISO strings alone', () => {
            const input = '2025-12-30T14:00:00.000Z';
            expect(safeIsoDate(input)).toBe(input);
        });

        it('should handle empty string', () => {
            expect(safeIsoDate('')).toBe('');
        });
    });

    describe('safeParseDate', () => {
        it('should correctly parse Postgres timestamp as valid Date', () => {
            // Postgres format: 2025-01-01 10:00:00+00 (10am UTC)
            // If parsed as local (without +00 being respected due to space), it might vary.
            // With 'T', it should be respected as ISO 8601 with offset.

            const postgresStr = '2025-01-01 10:00:00+00';
            const date = safeParseDate(postgresStr);

            // 2025-01-01T10:00:00+00 is 10:00 UTC
            expect(date.toISOString()).toBe('2025-01-01T10:00:00.000Z');
        });

        it('should handle standard ISO string', () => {
            const isoStr = '2025-01-01T10:00:00.000Z';
            const date = safeParseDate(isoStr);
            expect(date.toISOString()).toBe(isoStr);
        });

        it('should handle local date string (no offset, assumes local)', () => {
            // 2025-01-01T10:00:00 (no Z or offset) -> Treated as local time by Date()
            // We just want to ensure it parses successfully
            const localStr = '2025-01-01T10:00:00';
            const date = safeParseDate(localStr);
            expect(date).toBeInstanceOf(Date);
            expect(isNaN(date.getTime())).toBe(false);
        });
    });
});
