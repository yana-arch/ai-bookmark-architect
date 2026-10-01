import { describe, it, expect } from 'vitest';
import { generateLegacyUserHash, generateUserHash } from '@/src/db/cloud';

describe('cloud user hash', () => {
    it('generates a stable legacy hash', () => {
        expect(generateLegacyUserHash('alice', 'db.example.com')).toBe('ywxpy2vazg');
    });

    it('generates a deterministic SHA-256 hash', async () => {
        const hash = await generateUserHash('alice', 'db.example.com');
        expect(hash).toHaveLength(10);
        expect(hash).toMatch(/^[0-9a-f]{10}$/);
        expect(await generateUserHash('alice', 'db.example.com')).toBe(hash);
    });

    it('differs from the legacy hash for the same credentials', async () => {
        const legacy = generateLegacyUserHash('alice', 'db.example.com');
        const current = await generateUserHash('alice', 'db.example.com');
        expect(current).not.toBe(legacy);
    });
});