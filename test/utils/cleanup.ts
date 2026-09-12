import request from 'supertest';

/**
 * Epic 4.2 §4.1 — BUG-04, part three.
 *
 * A `grep -c afterAll test/**` returned 0 for every spec, and the suite was
 * run against the dev database: 585 `course_level` codes accumulated against
 * ~4 real ones, and admin dropdowns stopped being usable.
 *
 * The real fix is the isolated stack in `docker-compose.test.yaml`, where the
 * database dies with the container. This exists for the developer who runs one
 * spec file against a longer-lived database anyway — teardown should not
 * depend on remembering which stack you are pointed at.
 *
 * Deliberately forgiving: a cleanup failure must never fail a green run, or
 * the teardown becomes a second source of red.
 */
export const deactivateMasterDataCodes = async (
  app: string,
  adminToken: string,
  groupKey: string,
  codeIds: string[],
): Promise<void> => {
  for (const id of codeIds.filter(Boolean)) {
    try {
      // Master data has no delete endpoint by design (Epic 2 §5), so the
      // remove semantics are `isActive: false` — the same thing the admin UI
      // does.
      await request(app)
        .patch(
          `/api/v1/admin/master-data/groups/${groupKey}/codes/${id}/deactivate`,
        )
        .auth(adminToken, { type: 'bearer' });
    } catch {
      // Ignored on purpose — see the note above.
    }
  }
};

/** Collects ids a spec created so `afterAll` can hand them back. */
export const createdIds = () => {
  const ids: string[] = [];

  return {
    track: <T extends { id?: string }>(created: T): T => {
      if (created?.id) {
        ids.push(created.id);
      }
      return created;
    },
    all: (): string[] => [...ids],
  };
};
