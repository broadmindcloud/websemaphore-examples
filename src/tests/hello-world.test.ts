import { describe, it, expect } from 'vitest';

describe('Hello World', () => {
    it('should return "Hello, World!"', () => {
        const greeting = "Hello, World!";
        expect(greeting).toBe("Hello, World!");
    });
});