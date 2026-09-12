import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';
import { completeOnboarding } from '../utils/onboarding';

/**
 * Epic 4 v2 §2.3 / §5.6 / §5.7 — the two interactive lecture types plus the
 * endpoints the first learning-flow spec does not reach: quiz attempts, quiz
 * answer file upload, reflection responses and certificate regeneration.
 *
 * The course here deliberately does NOT require sequential completion, so each
 * lecture can be exercised on its own.
 */
describe('Epic 4 v2 — quiz and reflection lectures', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Quiz', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    // Every learning endpoint is behind OnboardingGuard.
    await completeOnboarding(app, body.token);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;

  let adminToken: string;
  let studentToken: string;
  let courseSlug: string;
  let courseId: string;
  let enrollmentId: string;
  let sectionId: string;
  let quizLectureId: string;
  let reflectionLectureId: string;
  let attemptId: string;
  let questionIds: Record<string, string> = {};

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const admin = await registerAndLogin(`e4q.admin.${runId}@example.com`);
    adminToken = admin.token;
    await makeSuperAdmin(app, seededAdminToken, admin.userId);

    const student = await registerAndLogin(`e4q.student.${runId}@example.com`);
    studentToken = student.token;

    const { body: level } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e4q_level_${runId}`, name: `Level ${runId}` })
      .expect(201);
    const { body: category } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_category/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e4q_cat_${runId}`, name: `Category ${runId}` })
      .expect(201);
    const { body: instructor } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(adminToken, { type: 'bearer' })
      .send({ fullName: `E4Q Instructor ${runId}` })
      .expect(201);

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(adminToken, { type: 'bearer' })
      .send({
        courseId: `E4Q-${runId}`,
        title: `Interactive ${runId}`,
        language: 'vi',
        price: 0,
        hasCertificate: true,
        enrollmentOpen: true,
        primaryInstructorId: instructor.id,
      })
      .expect(201);
    courseId = course.id;

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        shortDescription: 'Short',
        thumbnailUrl: 'https://example.com/t.png',
        levelId: level.id,
        categoryId: category.id,
      })
      .expect(200);

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(adminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);
    sectionId = section.id;

    const makeLecture = async (
      title: string,
      lectureType: string,
      displayOrder: number,
      content: Record<string, unknown>,
    ) => {
      const { body } = await request(app)
        .post(
          `/api/v1/admin/courses/${courseId}/sections/${sectionId}/lectures`,
        )
        .auth(adminToken, { type: 'bearer' })
        .send({
          title,
          lectureType,
          displayOrder,
          durationSecs: 60,
          isPreview: false,
          requiresCompletion: true,
        })
        .expect(201);

      await request(app)
        .patch(`/api/v1/admin/lectures/${body.id}/content`)
        .auth(adminToken, { type: 'bearer' })
        .send({ lectureType, ...content })
        .expect(200);

      return body.id as string;
    };

    quizLectureId = await makeLecture('Quiz', 'quiz', 1, {
      passingScore: 50,
      allowResume: true,
      instructions: 'Answer everything',
      timeLimitSecs: 900,
      quizQuestions: [
        {
          questionText: 'Pick the right one',
          questionType: 'multiple_choice',
          isRequired: true,
          displayOrder: 1,
          explanation: 'Right follows from the premise; Wrong does not.',
          options: [
            { optionText: 'Right', isCorrect: true, displayOrder: 1 },
            { optionText: 'Wrong', isCorrect: false, displayOrder: 2 },
          ],
        },
        {
          questionText: 'Attach your work',
          questionType: 'file_upload',
          isRequired: false,
          displayOrder: 2,
          allowedMimeTypes: 'image/png',
          maxFileSizeMb: 5,
        },
      ],
    });

    reflectionLectureId = await makeLecture('Reflection', 'reflection', 2, {
      minResponseLength: 3,
      reflectionQuestions: [
        { questionText: 'What did you learn?', displayOrder: 1 },
      ],
    });

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/publish`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const { body: detail } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    courseSlug = detail.slug;

    const { body: enrollment } = await request(app)
      .post(`/api/v1/courses/${courseSlug}/enroll`)
      .auth(studentToken, { type: 'bearer' })
      .expect(201);
    enrollmentId = enrollment.enrollmentId;
  }, 180000);

  describe('enrollment guards', () => {
    it('should return the same enrollment for a retry carrying an idempotency key', async () => {
      await request(app)
        .post(`/api/v1/courses/${courseSlug}/enroll`)
        .set('Idempotency-Key', `retry-${runId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201)
        .expect(({ body }) => expect(body.enrollmentId).toBe(enrollmentId));
    });

    it('should still conflict without an idempotency key', async () => {
      await request(app)
        .post(`/api/v1/courses/${courseSlug}/enroll`)
        .auth(studentToken, { type: 'bearer' })
        .expect(409);
    });
  });

  describe('quiz', () => {
    it('should expose the quiz payload on the player', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${quizLectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.lectureType).toBe('quiz');
          expect(body.contentPayload.passingScore).toBe(50);
          expect(body.contentPayload.timeLimitSecs).toBe(900);
          expect(body.contentPayload.questionCount).toBe(2);
        });
    });

    it('should start an attempt without leaking the correct answers', async () => {
      const { body } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      attemptId = body.attemptId;
      questionIds = Object.fromEntries(
        body.questions.map((question) => [question.questionType, question.id]),
      );

      expect(body.timeLimitSecs).toBe(900);
      expect(body.questions).toHaveLength(2);
      expect(JSON.stringify(body)).not.toContain('isCorrect');
    });

    it('should save and resume a draft', async () => {
      await request(app)
        .put(`/api/v1/lectures/${quizLectureId}/quiz-save`)
        .auth(studentToken, { type: 'bearer' })
        .send({ answersJson: { draft: true } })
        .expect(204);

      await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201)
        .expect(({ body }) =>
          expect(body.resumedAnswers).toEqual({ draft: true }),
        );
    });

    it('should reject a file whose type the question does not allow', async () => {
      await request(app)
        .post(
          `/api/v1/quiz-attempts/${attemptId}/answers/${questionIds.file_upload}/file`,
        )
        .auth(studentToken, { type: 'bearer' })
        .attach('file', Buffer.from('not an image'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(422);
    });

    it('should refuse to attach a file to a question that takes no file', async () => {
      await request(app)
        .post(
          `/api/v1/quiz-attempts/${attemptId}/answers/${questionIds.multiple_choice}/file`,
        )
        .auth(studentToken, { type: 'bearer' })
        .attach('file', pngBytes(), {
          filename: 'shot.png',
          contentType: 'image/png',
        })
        .expect(422);
    });

    it('should store an allowed file and hand back its id', async () => {
      await request(app)
        .post(
          `/api/v1/quiz-attempts/${attemptId}/answers/${questionIds.file_upload}/file`,
        )
        .auth(studentToken, { type: 'bearer' })
        .attach('file', pngBytes(), {
          filename: 'shot.png',
          contentType: 'image/png',
        })
        .expect(201)
        .expect(({ body }) => {
          expect(body.fileId).toEqual(expect.any(String));
          expect(body.path).toEqual(expect.any(String));
        });
    });

    /**
     * v2.3 — `explanation` is answer-key material. If it reaches the browser
     * before submit, the answer key is on the page.
     */
    it('should not send the explanation before the attempt is submitted', async () => {
      const { body: attempt } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      expect(JSON.stringify(attempt)).not.toContain('follows from the premise');
      expect(JSON.stringify(attempt)).not.toContain('explanation');
    });

    it('should send the explanation once the attempt is submitted', async () => {
      const { body: attempt } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      const wrong = attempt.questions
        .find((question) => question.questionType === 'multiple_choice')
        .options.find((option) => option.optionText === 'Wrong');

      const { body: result } = await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [
            {
              questionId: questionIds.multiple_choice,
              selectedOptionIds: [wrong.id],
            },
          ],
        })
        .expect(200);

      expect(
        result.feedback.find(
          (item) => item.questionId === questionIds.multiple_choice,
        ).explanation,
      ).toBe('Right follows from the premise; Wrong does not.');

      // A question with no explanation authored renders no box.
      expect(
        result.feedback.find(
          (item) => item.questionId === questionIds.file_upload,
        ).explanation,
      ).toBeNull();

      await request(app)
        .get(`/api/v1/quiz-attempts/${attempt.attemptId}/review`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(
            body.review.find(
              (item) => item.questionId === questionIds.multiple_choice,
            ).explanation,
          ).toBe('Right follows from the premise; Wrong does not.');
        });
    }, 120000);

    it('should apply the env default threshold when the quiz sets none', async () => {
      // The fixture saves passingScore: 50 and no passThresholdPercent, so
      // §2.4.1 says QUIZ_PASS_THRESHOLD_DEFAULT (70) is what grading uses.
      const { body: attempt } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      expect(attempt.passThresholdPercent).toBe(70);
      expect(attempt.passingScore).toBe(50);
    });

    it('should fail a half-answered quiz against the 70% threshold', async () => {
      const { body: attempt } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      const correctOption = attempt.questions
        .find((question) => question.questionType === 'multiple_choice')
        .options.find((option) => option.optionText === 'Right');

      // v2.1 counts the unanswered file_upload in the denominator, so this is
      // 50% of a two-question quiz — under the threshold.
      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [
            {
              questionId: questionIds.multiple_choice,
              selectedOptionIds: [correctOption.id],
            },
          ],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.score).toBe(50);
          expect(body.passed).toBe(false);
          expect(body.passThresholdPercent).toBe(70);
        });
    });

    it('should grade a passing submission and complete the lecture', async () => {
      const { body: attempt } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      const correctOption = attempt.questions
        .find((question) => question.questionType === 'multiple_choice')
        .options.find((option) => option.optionText === 'Right');

      const { body: uploaded } = await request(app)
        .post(
          `/api/v1/quiz-attempts/${attempt.attemptId}/answers/${questionIds.file_upload}/file`,
        )
        .auth(studentToken, { type: 'bearer' })
        .attach('file', pngBytes(), {
          filename: 'shot.png',
          contentType: 'image/png',
        })
        .expect(201);

      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [
            {
              questionId: questionIds.multiple_choice,
              selectedOptionIds: [correctOption.id],
            },
            // §2.4 — the upload auto-passes on any file, taking the quiz to
            // 100% and over the threshold.
            { questionId: questionIds.file_upload, fileId: uploaded.fileId },
          ],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.score).toBe(100);
          expect(body.passed).toBe(true);
          expect(body.passThresholdPercent).toBe(70);
          expect(
            body.feedback.find(
              (item) => item.questionId === questionIds.file_upload,
            ).autoPassed,
          ).toBe(true);
        });

      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${quizLectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.progressStatus).toBe('completed'));
    });

    it('should refuse to submit the same attempt twice', async () => {
      const { body: attempt } = await request(app)
        .post(`/api/v1/lectures/${quizLectureId}/quiz-attempts`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);

      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({ answers: [] })
        .expect(200);

      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({ answers: [] })
        .expect(409);
    });
  });

  describe('reflection', () => {
    it('should return the questions and the minimum length', async () => {
      await request(app)
        .get(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          // v2.1 §2.4 — REFLECTION_MIN_WORDS, not the per-lecture column,
          // which this lecture set to 3.
          expect(body.minResponseLength).toBe(10);
          expect(body.questions).toHaveLength(1);
        });
    });

    it('should accept a short draft without completing the lecture', async () => {
      const { body: loaded } = await request(app)
        .get(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      await request(app)
        .post(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          isDraft: true,
          answers: [
            { questionId: loaded.questions[0].id, responseText: 'too short' },
          ],
        })
        .expect(200)
        .expect(({ body }) => expect(body.saved).toBe(true));
    });

    it('should reject a final submit below the word minimum', async () => {
      const { body: loaded } = await request(app)
        .get(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      await request(app)
        .post(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          isDraft: false,
          answers: [
            { questionId: loaded.questions[0].id, responseText: 'one' },
          ],
        })
        .expect(422);
    });

    it('should complete the course on a valid final submit', async () => {
      const { body: loaded } = await request(app)
        .get(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      await request(app)
        .post(`/api/v1/lectures/${reflectionLectureId}/reflection-responses`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          isDraft: false,
          answers: [
            {
              questionId: loaded.questions[0].id,
              responseText:
                'I learned a great deal today about how this all fits together',
            },
          ],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.progressPct).toBe(100);
          expect(body.enrollmentStatus).toBe('completed');
        });
    });
  });

  /**
   * A quiz whose only question is an essay. Under v2.1 this auto-passes on any
   * non-empty answer — there is no reviewer and no queue. Marked optional so
   * adding it after the course was already completed does not move
   * progressPct for the certificate tests below.
   */
  const makeEssayLecture = async (
    passThresholdPercent = 50,
  ): Promise<string> => {
    const { body: lecture } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${sectionId}/lectures`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        title: `Essay ${Date.now()}`,
        lectureType: 'quiz',
        displayOrder: 3,
        durationSecs: 60,
        isPreview: false,
        requiresCompletion: false,
      })
      .expect(201);

    await request(app)
      .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        lectureType: 'quiz',
        passingScore: 50,
        passThresholdPercent,
        allowResume: false,
        quizQuestions: [
          {
            questionText: 'Explain your reasoning',
            questionType: 'essay',
            isRequired: true,
            displayOrder: 1,
            minWordCount: 3,
          },
        ],
      })
      .expect(200);

    return lecture.id as string;
  };

  const startAttempt = async (lectureId: string) => {
    const { body } = await request(app)
      .post(`/api/v1/lectures/${lectureId}/quiz-attempts`)
      .auth(studentToken, { type: 'bearer' })
      .expect(201);

    return body;
  };

  /**
   * Epic 4 v2.1 §2.4 — the manual grading queue was removed. These assert the
   * behaviour that replaced it: an essay resolves on submit, and the admin
   * routes that used to serve the queue are gone.
   */
  describe('v2.1 auto-grading', () => {
    let essayLectureId: string;

    beforeAll(async () => {
      essayLectureId = await makeEssayLecture();
    }, 120000);

    it('should auto-pass a non-empty essay and complete the lecture', async () => {
      const attempt = await startAttempt(essayLectureId);

      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [
            {
              questionId: attempt.questions[0].id,
              textAnswer: 'My considered answer to the prompt.',
            },
          ],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.passed).toBe(true);
          expect(body.score).toBe(100);
          expect(body.pendingManualReview).toBeUndefined();
          expect(body.feedback[0]).toMatchObject({
            questionId: attempt.questions[0].id,
            autoPassed: true,
            isCorrect: true,
          });
        });

      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${essayLectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.progressStatus).toBe('completed'));
    }, 120000);

    it('should fail an empty essay instead of parking the attempt', async () => {
      const lectureId = await makeEssayLecture();
      const attempt = await startAttempt(lectureId);

      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [{ questionId: attempt.questions[0].id, textAnswer: '   ' }],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.passed).toBe(false);
          expect(body.score).toBe(0);
        });

      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${lectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) =>
          expect(body.progressStatus).not.toBe('completed'),
        );
    }, 120000);

    it('should grade against the per-quiz threshold', async () => {
      const lectureId = await makeEssayLecture(100);
      const attempt = await startAttempt(lectureId);

      expect(attempt.passThresholdPercent).toBe(100);

      await request(app)
        .post(`/api/v1/quiz-attempts/${attempt.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [
            { questionId: attempt.questions[0].id, textAnswer: 'Answered' },
          ],
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.passThresholdPercent).toBe(100);
          expect(body.passed).toBe(true);
        });
    }, 120000);

    it('should report the best previous score and allow unlimited retries', async () => {
      const lectureId = await makeEssayLecture();
      const first = await startAttempt(lectureId);

      expect(first.bestScore).toBeNull();

      await request(app)
        .post(`/api/v1/quiz-attempts/${first.attemptId}/submit`)
        .auth(studentToken, { type: 'bearer' })
        .send({
          answers: [
            { questionId: first.questions[0].id, textAnswer: 'Answered' },
          ],
        })
        .expect(200);

      const second = await startAttempt(lectureId);

      expect(second.bestScore).toBe(100);
      expect(second.previousAttempts).toBeGreaterThanOrEqual(1);
    }, 120000);

    it('should no longer expose the grading queue to anyone', async () => {
      await request(app)
        .get('/api/v1/admin/quiz-attempts/pending')
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });

    it('should no longer accept a manual grade', async () => {
      await request(app)
        .post('/api/v1/admin/quiz-attempts/does-not-matter/grade')
        .auth(adminToken, { type: 'bearer' })
        .send({ grades: [] })
        .expect(404);
    });
  });

  describe('certificate regeneration', () => {
    it('should keep the number while refreshing the snapshots', async () => {
      const { body: before } = await request(app)
        .get(`/api/v1/enrollments/${enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      expect(before.ready).toBe(true);

      await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/certificate/regenerate`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.certificate.number).toBe(before.certificate.number);
          expect(body.certificate.courseTitle).toBe(`Interactive ${runId}`);
        });
    });

    it('should refuse a student without the courses:edit permission', async () => {
      await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/certificate/regenerate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });

    // D6 — the re-issue returns the same shape as the student read, so the
    // root context cannot be present on one and missing on the other.
    it('should return the D6 root context on a re-issue too', async () => {
      await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/certificate/regenerate`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.course.id).toEqual(expect.any(String));
          expect(body.progressPct).toEqual(expect.any(Number));
          expect(body).toHaveProperty('pathway');
          expect(body).toHaveProperty('lastLectureId');
        });
    });
  });

  /**
   * Epic 4.2 §2 — the P0 regression, in the exact shape QA hit it: finish the
   * course, reopen the last lecture, and check the student still holds what
   * they earned.
   */
  describe('BUG-01 — re-opening a finished lecture', () => {
    let numberBefore: string;
    let completedAtBefore: string;

    it('should start from a completed course with a certificate', async () => {
      const { body } = await request(app)
        .get(`/api/v1/enrollments/${enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      expect(body.ready).toBe(true);
      expect(body.progressPct).toBe(100);

      numberBefore = body.certificate.number;
      completedAtBefore = body.certificate.completionDate;
    }, 120000);

    it('should accept the player re-opening a finished lecture', async () => {
      // The stray ping that caused the outage: the player posts in_progress
      // whenever a lecture is opened.
      await request(app)
        .post(`/api/v1/lectures/${reflectionLectureId}/progress`)
        .auth(studentToken, { type: 'bearer' })
        .send({ status: 'in_progress' })
        .expect(200)
        .expect(({ body }) => {
          // D7 — accepted and ignored, not an error, and the percentage holds.
          expect(body.progressPct).toBe(100);
          expect(body.enrollmentStatus).toBe('completed');
        });
    }, 120000);

    it('should keep the same certificate afterwards', async () => {
      await request(app)
        .get(`/api/v1/enrollments/${enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.ready).toBe(true);
          expect(body.certificate.number).toBe(numberBefore);
          // BUG-02 — the completion date must not have moved.
          expect(body.certificate.completionDate).toBe(completedAtBefore);
        });
    }, 120000);

    it('should leave the lecture reading completed', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${reflectionLectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.progressStatus).toBe('completed'));
    }, 120000);

    it('should still record the watch position the ping carried', async () => {
      await request(app)
        .post(`/api/v1/lectures/${reflectionLectureId}/progress`)
        .auth(studentToken, { type: 'bearer' })
        .send({ status: 'in_progress', watchDurationSecs: 99 })
        .expect(200);

      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${reflectionLectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.watchDurationSecs).toBe(99);
          expect(body.progressStatus).toBe('completed');
        });
    }, 120000);
  });

  /**
   * Epic 4.1 D6 — `STU_CER_10` renders from this one response. The context is
   * at the root precisely so the not-complete branch gets it too.
   */
  describe('D6 certificate response context', () => {
    it('should carry the live course, progress and pathway at the root', async () => {
      await request(app)
        .get(`/api/v1/enrollments/${enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.ready).toBe(true);
          expect(body.course).toMatchObject({
            id: courseId,
            slug: courseSlug,
            title: `Interactive ${runId}`,
          });
          expect(body.course).toHaveProperty('thumbnailUrl');
          expect(body.progressPct).toBe(100);
          expect(body).toHaveProperty('lastLectureId');
          // No group assigned to this fixture course, so the card is hidden.
          expect(body.pathway).toBeNull();
        });
    });

    it('should let the FE reach the reflection questions from course.id alone', async () => {
      const { body } = await request(app)
        .get(`/api/v1/enrollments/${enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      // The detour D6 removes: no /students/me/courses, no /courses/:slug.
      await request(app)
        .get(
          `/api/v1/career-reflection-questions/grouped?courseId=${body.course.id}`,
        )
        .expect(200);
    });

    it('should return the same root context before the course is finished', async () => {
      const email = `d6.unfinished.${runId}@example.com`;
      await request(app)
        .post('/api/v1/auth/email/register')
        .send({ email, password: 'secret', firstName: 'D6', lastName: 'User' })
        .expect(204);

      const { body: login } = await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email, password: 'secret' })
        .expect(200);

      await completeOnboarding(app, login.token);

      const { body: fresh } = await request(app)
        .post(`/api/v1/courses/${courseSlug}/enroll`)
        .auth(login.token, { type: 'bearer' })
        .expect(201);

      await request(app)
        .get(`/api/v1/enrollments/${fresh.enrollmentId}/certificate`)
        .auth(login.token, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.ready).toBe(false);
          expect(body.certificate).toBeNull();
          // The whole point of the root placement.
          expect(body.course.id).toBe(courseId);
          expect(body.progressPct).toBe(0);
          expect(body.lastLectureId).toBeNull();
          expect(body).toHaveProperty('pathway');
        });
    }, 120000);
  });
});

/** Smallest valid PNG — enough for a mime check and a real disk write. */
const pngBytes = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
