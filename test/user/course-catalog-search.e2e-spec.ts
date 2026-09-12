import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';
import { completeOnboarding } from '../utils/onboarding';

type Card = {
  id: string;
  slug: string;
  title: string;
  language: string;
  groupIds: string[];
  hasPreview: boolean;
  isEnrolled: boolean;
  avgRating: number | null;
  level: { id: string; name: string } | null;
};

/**
 * Epic 4.4 §1.5 — the catalog's full-text search, against a real Postgres.
 *
 * None of this can be proved against a mock. `khoa hoc` matching "Khoá học"
 * is a property of the `vi_unaccent` text search configuration and the
 * generated `searchVector` column; a unit test asserting the SQL string would
 * pass just as happily if the migration never ran.
 *
 * The corpus is built through the real admin endpoints so every course here is
 * genuinely published with enrollment open — the catalog's two hard-coded
 * conditions. Every fixture title carries `runId`, so the assertions filter to
 * this run's rows and a shared database cannot make them flap.
 */
describe('Epic 4.4 — course catalog search', () => {
  const app = APP_URL;
  const runId = Date.now();
  const tag = `e44${runId}`;

  let adminToken: string;
  let studentToken: string;

  let levelId: string;
  let categoryId: string;
  let groupAId: string;
  let groupBId: string;

  const slugs: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const registerAndLogin = async (email: string) => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password: 'secret', firstName: 'Cat', lastName: 'Alog' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);

    await completeOnboarding(app, body.token);

    return { token: body.token as string, userId: body.user.id as number };
  };

  const masterCode = async (groupKey: string, label: string, name: string) => {
    const { body } = await request(app)
      .post(`/api/v1/admin/master-data/groups/${groupKey}/codes`)
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `${tag}_${label}`, name })
      .expect(201);

    return body.id as string;
  };

  /**
   * One published course. `key` is the handle the assertions use; everything
   * else is the shape a card needs to exist.
   */
  const makeCourse = async (
    key: string,
    course: {
      title: string;
      shortDescription?: string;
      fullDescription?: string;
      instructorName: string;
      instructorHeadline?: string;
      language?: string;
      isPreviewLecture?: boolean;
      groupIds?: string[];
      categoryId?: string;
    },
  ) => {
    const { body: instructor } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(adminToken, { type: 'bearer' })
      .send({
        fullName: course.instructorName,
        headline: course.instructorHeadline,
      })
      .expect(201);

    const { body: created } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(adminToken, { type: 'bearer' })
      .send({
        courseId: `${tag}-${key}`,
        title: course.title,
        language: course.language ?? 'vi',
        price: 0,
        hasCertificate: true,
        enrollmentOpen: true,
        primaryInstructorId: instructor.id,
      })
      .expect(201);

    await request(app)
      .patch(`/api/v1/admin/courses/${created.id}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        shortDescription: course.shortDescription ?? 'Short',
        fullDescription: course.fullDescription,
        thumbnailUrl: 'https://example.com/t.png',
        levelId,
        categoryId: course.categoryId ?? categoryId,
      })
      .expect(200);

    if (course.groupIds?.length) {
      await request(app)
        .put(`/api/v1/admin/courses/${created.id}/groups`)
        .auth(adminToken, { type: 'bearer' })
        .send({ groupIds: course.groupIds })
        .expect(200);
    }

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${created.id}/sections`)
      .auth(adminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);

    const { body: lecture } = await request(app)
      .post(
        `/api/v1/admin/courses/${created.id}/sections/${section.id}/lectures`,
      )
      .auth(adminToken, { type: 'bearer' })
      .send({
        title: 'Lecture 1',
        lectureType: 'article',
        displayOrder: 1,
        durationSecs: 600,
        isPreview: course.isPreviewLecture ?? false,
        requiresCompletion: true,
      })
      .expect(201);

    await request(app)
      .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
      .auth(adminToken, { type: 'bearer' })
      .send({ lectureType: 'article', body: '<p>Body</p>' })
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/courses/${created.id}/publish`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const { body: detail } = await request(app)
      .get(`/api/v1/admin/courses/${created.id}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    ids[key] = created.id;
    slugs[key] = detail.slug;
  };

  /** Catalog call, narrowed to this run's fixtures. */
  const catalog = async (
    query: Record<string, string | number> = {},
    token?: string,
  ) => {
    const call = request(app)
      .get('/api/v1/courses')
      .query({ limit: 50, ...query });

    if (token) {
      call.auth(token, { type: 'bearer' });
    }

    const { body } = await call.expect(200);

    return {
      body,
      mine: (body.data as Card[]).filter((card) =>
        Object.values(ids).includes(card.id),
      ),
      titles: (body.data as Card[])
        .filter((card) => Object.values(ids).includes(card.id))
        .map((card) => card.title),
    };
  };

  beforeAll(async () => {
    const seeded = await loginSeededSuperAdmin(app);
    const admin = await registerAndLogin(`${tag}.admin@example.com`);
    await makeSuperAdmin(app, seeded, admin.userId);
    adminToken = (
      await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email: `${tag}.admin@example.com`, password: 'secret' })
        .expect(200)
    ).body.token;

    studentToken = (await registerAndLogin(`${tag}.student@example.com`)).token;

    levelId = await masterCode('course_level', 'lvl', `Level ${runId}`);
    categoryId = await masterCode('course_category', 'cat', `Cat ${runId}`);
    groupAId = await masterCode('course_group', 'grpA', `Group A ${runId}`);
    groupBId = await masterCode('course_group', 'grpB', `Group B ${runId}`);

    // The Vietnamese fixture. Every diacritic here is the point.
    await makeCourse('vi', {
      title: `Khoá học Dữ liệu ${runId}`,
      shortDescription: 'Nhập môn phân tích',
      fullDescription: 'Phân tích dữ liệu với Python và thống kê cơ bản.',
      instructorName: `Nguyễn Văn An ${runId}`,
      instructorHeadline: 'Giảng viên Khoa học Dữ liệu',
      isPreviewLecture: true,
      groupIds: [groupAId, groupBId],
    });

    // Word order and prefix fixtures.
    await makeCourse('genome', {
      title: `Sequencing the genome ${runId}`,
      shortDescription: 'Intro',
      fullDescription: 'A course about genomic sequencing methods.',
      instructorName: `Jane Genome ${runId}`,
    });

    // The same term as `genome`, but only deep in the body — AC-2d's loser.
    await makeCourse('mentions', {
      title: `Python basics ${runId}`,
      shortDescription: 'Short',
      fullDescription:
        'Paragraph nine of this description happens to mention genome exactly once.',
      instructorName: `Bob Body ${runId}`,
      language: 'en',
      groupIds: [groupAId],
    });
  }, 300000);

  /**
   * AC-2b — the reason this migration exists. A Vietnamese user typing without
   * diacritics is not making a typo; it is how the language is typed on a
   * keyboard in a hurry, and the old ILIKE returned nothing at all.
   */
  describe('Vietnamese diacritics', () => {
    it('should match "Khoá học Dữ liệu" for the diacritic-free "khoa hoc du lieu"', async () => {
      const { titles } = await catalog({ search: `khoa hoc du lieu ${runId}` });

      expect(titles).toEqual([`Khoá học Dữ liệu ${runId}`]);
    });

    it('should still match when the term is typed WITH diacritics', async () => {
      const { titles } = await catalog({ search: `Dữ liệu ${runId}` });

      expect(titles).toEqual([`Khoá học Dữ liệu ${runId}`]);
    });

    it('should be case-insensitive on top of that', async () => {
      const { titles } = await catalog({ search: `KHOA HOC ${runId}` });

      expect(titles).toEqual([`Khoá học Dữ liệu ${runId}`]);
    });

    /**
     * §1.5 "what FTS does not cover" — the instructor name lives in another
     * table and cannot be in the generated column, so it is an unaccented
     * ILIKE. Unranked, but a search for `nguyen van an` still has to find
     * `Nguyễn Văn An`.
     */
    it('should match an instructor name without diacritics', async () => {
      const { titles } = await catalog({ search: `nguyen van an ${runId}` });

      expect(titles).toContain(`Khoá học Dữ liệu ${runId}`);
    });
  });

  describe('tokenised matching', () => {
    /** AC-2 — the query a user would actually type for this course. */
    it('should match a two-word query whose words appear in the other order', async () => {
      const { titles } = await catalog({ search: 'genomic sequencing' });

      expect(titles).toContain(`Sequencing the genome ${runId}`);
    });

    /**
     * AC-2c — as-you-type. The prefix is on the FINAL token only, so the
     * run tag has to come first: `genom ${runId}` would make `genom` exact
     * and match nothing, which is the behaviour the next case pins down.
     */
    it('should match a prefix of the final token', async () => {
      const { titles } = await catalog({ search: `${runId} genom` });

      expect(titles).toContain(`Sequencing the genome ${runId}`);
    });

    it('should keep earlier tokens exact so results do not thrash', async () => {
      // "sequenc" is a prefix, but "genomeX" is not a word in the corpus, so
      // the AND fails — a prefix on every token would have matched here.
      const { titles } = await catalog({ search: 'genomeX sequenc' });

      expect(titles).toEqual([]);
    });

    /**
     * The documented behaviour change: an ILIKE `%nomic%` used to find
     * "genomic"; a tokenised index does not. Asserted so it is a decision
     * rather than a surprise.
     */
    it('should NOT match a mid-word substring (documented trade-off)', async () => {
      const { titles } = await catalog({ search: 'nomic' });

      expect(titles).not.toContain(`Sequencing the genome ${runId}`);
    });
  });

  /** AC-2d — the weights in the generated column, observed from outside. */
  describe('ranking', () => {
    it('should rank a title match above a description match for the same term', async () => {
      const { titles } = await catalog({ search: `genome ${runId}` });

      expect(titles).toEqual([
        `Sequencing the genome ${runId}`,
        `Python basics ${runId}`,
      ]);
    });

    it('should default to relevance when searching, without being asked (AC-2e)', async () => {
      // No sortBy at all — this is exactly what the header search sends.
      const withoutSort = await catalog({ search: `genome ${runId}` });
      const withRelevance = await catalog({
        search: `genome ${runId}`,
        sortBy: 'relevance',
      });

      expect(withoutSort.titles).toEqual(withRelevance.titles);
    });

    it('should let an explicit sort override the relevance default', async () => {
      const { body } = await catalog({
        search: `${runId}`,
        sortBy: 'shortest',
      });

      expect(body.data.length).toBeGreaterThan(0);
    });

    /** AC-2g — relevance against an empty query is meaningless. */
    it('should accept sortBy=relevance with no search term and degrade to newest', async () => {
      const relevance = await catalog({ sortBy: 'relevance' });
      const newest = await catalog({ sortBy: 'newest' });

      expect(relevance.titles).toEqual(newest.titles);
    });
  });

  /**
   * AC-2f — `websearch_to_tsquery` never throws, but the prefix suffix this
   * epic adds can: `-"a b"` renders as `!( 'a' <-> 'b' )`, and appending `:*`
   * to that is a tsquery syntax error. Every one of these is a 500 the user
   * could type into the search box.
   */
  describe('hostile input', () => {
    it.each([
      ['c++ ('],
      ['"'],
      ['-"khoa hoc"'],
      ['khoa -"du lieu"'],
      ['('],
      [')'],
      ['& | !'],
      ["'; DROP TABLE course; --"],
      ['<script>alert(1)</script>'],
      ['   '],
      ['a'.repeat(500)],
      ['khoa hoc '.repeat(60)],
      ['🙂🙂🙂'],
    ])('should answer 200 for %j', async (search) => {
      const { body } = await request(app)
        .get('/api/v1/courses')
        .query({ search, limit: 9 })
        .expect(200);

      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.totalCount).toBe('number');
    });
  });

  /** §1.2 — the only breaking change in this epic, and its migration path. */
  describe('plural filters', () => {
    it('should OR within one dimension', async () => {
      const { mine } = await catalog({
        groupIds: `${groupAId},${groupBId}`,
        search: `${runId}`,
      });

      expect(mine.map((card) => card.title).sort()).toEqual(
        [`Khoá học Dữ liệu ${runId}`, `Python basics ${runId}`].sort(),
      );
    });

    it('should AND across dimensions', async () => {
      const { mine } = await catalog({
        groupIds: `${groupAId},${groupBId}`,
        language: 'en',
        search: `${runId}`,
      });

      expect(mine.map((card) => card.title)).toEqual([
        `Python basics ${runId}`,
      ]);
    });

    it('should accept a repeated param as well as CSV', async () => {
      const { body } = await request(app)
        .get('/api/v1/courses')
        .query(
          `groupIds=${groupAId}&groupIds=${groupBId}&search=${runId}&limit=50`,
        )
        .expect(200);

      expect(body.data.length).toBe(2);
    });

    it('should give the same answer for one plural value as for the singular', async () => {
      const plural = await catalog({ levelIds: levelId, search: `${runId}` });
      const singular = await catalog({ levelId, search: `${runId}` });

      expect(plural.titles).toEqual(singular.titles);
      expect(plural.titles.length).toBe(3);
    });

    it('should treat an empty plural param as no filter', async () => {
      const empty = await catalog({ groupIds: '', search: `${runId}` });
      const absent = await catalog({ search: `${runId}` });

      expect(empty.titles).toEqual(absent.titles);
    });

    it('should reject a malformed uuid rather than silently ignoring it', async () => {
      await request(app)
        .get('/api/v1/courses')
        .query({ groupIds: 'not-a-uuid' })
        .expect(422);
    });

    it('should union a singular and a plural sent together', async () => {
      const { mine } = await catalog({
        groupIds: groupBId,
        groupId: groupAId,
        search: `${runId}`,
      });

      expect(mine).toHaveLength(2);
    });
  });

  /** §1.3 — the card additions the grid needs. */
  describe('card shape', () => {
    it('should carry language, groupIds and hasPreview', async () => {
      const { mine } = await catalog({ search: `khoa hoc ${runId}` });
      const [card] = mine;

      expect(card.language).toBe('vi');
      expect(card.groupIds.sort()).toEqual([groupAId, groupBId].sort());
      expect(card.hasPreview).toBe(true);
    });

    it('should report hasPreview=false when no lecture is a preview', async () => {
      const { mine } = await catalog({ search: `${runId} genom` });
      const card = mine.find((c) => c.id === ids.genome)!;

      expect(card.hasPreview).toBe(false);
    });

    it('should give a course with no groups an empty array, not null', async () => {
      const { mine } = await catalog({ search: `${runId} genom` });
      const card = mine.find((c) => c.id === ids.genome)!;

      expect(card.groupIds).toEqual([]);
    });

    /** AC-8 — an unrated course must render no stars, not zero stars. */
    it('should return avgRating as null before the first rating', async () => {
      const { mine } = await catalog({ search: `${runId}` });

      for (const card of mine) {
        expect(card.avgRating).toBeNull();
      }
    });
  });

  /** §1.4 option A — optional auth. */
  describe('isEnrolled', () => {
    it('should be false for every card when the caller is anonymous', async () => {
      const { mine } = await catalog({ search: `${runId}` });

      expect(mine.map((card) => card.isEnrolled)).toEqual([
        false,
        false,
        false,
      ]);
    });

    it('should set Vary: Authorization so a shared cache cannot leak a badge', async () => {
      const response = await request(app).get('/api/v1/courses').expect(200);

      expect(String(response.headers.vary)).toContain('Authorization');
    });

    it('should flag only the courses the signed-in student is enrolled in', async () => {
      await request(app)
        .post(`/api/v1/courses/${slugs.vi}/enroll`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      const { mine } = await catalog({ search: `${runId}` }, studentToken);

      const enrolled = mine.filter((card) => card.isEnrolled);
      expect(enrolled.map((card) => card.id)).toEqual([ids.vi]);
    });

    it('should not leak that enrollment to an anonymous caller', async () => {
      const { mine } = await catalog({ search: `${runId}` });

      expect(mine.every((card) => card.isEnrolled === false)).toBe(true);
    });
  });

  /** Regressions the epic's §0 says already pass — and must keep passing. */
  describe('envelope and paging', () => {
    it('should clamp a limit above the cap to 50 (AC-9)', async () => {
      const { body } = await request(app)
        .get('/api/v1/courses')
        .query({ limit: 500 })
        .expect(200);

      expect(body.limit).toBe(50);
      expect(body.data.length).toBeLessThanOrEqual(50);
    });

    /** AC-10 — the `course.id` tiebreak, which relevance must not drop. */
    it('should not repeat a row between pages while sorting by relevance', async () => {
      const first = await request(app)
        .get('/api/v1/courses')
        .query({ search: `${runId}`, limit: 2, page: 1 })
        .expect(200);
      const second = await request(app)
        .get('/api/v1/courses')
        .query({ search: `${runId}`, limit: 2, page: 2 })
        .expect(200);

      const firstIds = first.body.data.map((card: Card) => card.id);
      const secondIds = second.body.data.map((card: Card) => card.id);

      expect(first.body.totalCount).toBe(3);
      expect(first.body.hasNextPage).toBe(true);
      expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
    });

    it('should return an empty set, not an error, for a term nothing matches', async () => {
      const { body } = await request(app)
        .get('/api/v1/courses')
        .query({ search: 'zzzzqqqqxxxx' })
        .expect(200);

      expect(body.data).toEqual([]);
      expect(body.totalCount).toBe(0);
      expect(body.hasNextPage).toBe(false);
    });
  });
});
