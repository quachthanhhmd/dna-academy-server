import { describe, expect, it } from '@jest/globals';
import { optionalUserId } from './optional-user-id';

describe('optionalUserId', () => {
  it('should return the id of an authenticated user', () => {
    expect(optionalUserId({ user: { id: 42 } })).toBe(42);
  });

  it('should return undefined when no user is attached', () => {
    expect(optionalUserId({})).toBeUndefined();
  });

  it('should return undefined when the anonymous strategy echoes the request back as user', () => {
    // passport-anonymous resolves `request.user` to the request object itself,
    // which has no numeric `id` — this must not read as a signed-in student.
    const request: any = { headers: {}, method: 'GET' };
    request.user = request;

    expect(optionalUserId(request)).toBeUndefined();
  });

  it('should reject a non-numeric id', () => {
    expect(optionalUserId({ user: { id: 'not-a-number' } })).toBeUndefined();
  });
});
