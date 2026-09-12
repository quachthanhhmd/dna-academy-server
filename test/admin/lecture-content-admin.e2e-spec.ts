import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';

describe('Admin / Lecture Content', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Content', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;

  let superAdminToken: string;
  let courseId: string;
  let sectionId: string;
  let lectureId: string;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const superAdmin = await registerAndLogin(
      `lecture-content.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await makeSuperAdmin(app, seededAdminToken, superAdmin.userId);

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        courseId: `LCT-${runId}`,
        title: `Lecture Content Test ${runId}`,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);
    courseId = course.id;

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);
    sectionId = section.id;

    const { body: lecture } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${sectionId}/lectures`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'Lecture',
        lectureType: 'video',
        // Epic 4.2 §3.4 — a video lecture must carry a real duration; 0 is
        // now rejected, which is what this fixture used to send.
        durationSecs: 600,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      })
      .expect(201);
    lectureId = lecture.id;
  });

  it('should reject saving video content without a youtubeUrl', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ lectureType: 'video' })
      .expect(422);
  });

  it('should save video content and extract the youtube video id', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        lectureType: 'video',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.youtubeVideoId).toBe('dQw4w9WgXcQ');
        expect(body.incompatibleContentCleared).toBe(false);
      });
  });

  it('should reject an invalid youtube url', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        lectureType: 'video',
        youtubeUrl: 'https://not-a-real-video-url.example.com',
      })
      .expect(422);
  });

  it('should switch lecture type to quiz, clearing the prior video content', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        lectureType: 'quiz',
        passingScore: 70,
        allowResume: true,
        instructions: 'Answer all questions',
        quizQuestions: [
          {
            questionText: 'What is 2+2?',
            questionType: 'multiple_choice',
            isRequired: true,
            displayOrder: 1,
            options: [
              { optionText: '3', isCorrect: false, displayOrder: 1 },
              { optionText: '4', isCorrect: true, displayOrder: 2 },
            ],
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.passingScore).toBe(70);
        expect(body.incompatibleContentCleared).toBe(true);
      });

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        const section = body.sections.find((s) => s.id === sectionId);
        const lecture = section.lectures.find((l) => l.id === lectureId);
        expect(lecture.lectureType).toBe('quiz');
      });
  });

  it('should reject quiz content missing passingScore/allowResume', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ lectureType: 'quiz' })
      .expect(422);
  });

  it('should replace quiz questions on a subsequent save', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        lectureType: 'quiz',
        passingScore: 80,
        allowResume: false,
        quizQuestions: [
          {
            questionText: 'What is the capital of France?',
            questionType: 'short_answer',
            isRequired: true,
            displayOrder: 1,
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.passingScore).toBe(80);
        expect(body.incompatibleContentCleared).toBe(false);
      });
  });

  it('should save reflection content with questions', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        lectureType: 'reflection',
        minResponseLength: 50,
        reflectionQuestions: [
          { questionText: 'What did you learn?', displayOrder: 1 },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.minResponseLength).toBe(50);
        expect(body.incompatibleContentCleared).toBe(true);
      });
  });

  it('should save article content', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ lectureType: 'article', body: '<p>Hello world</p>' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.body).toBe('<p>Hello world</p>');
      });
  });

  it('should save pdf_document content', async () => {
    await request(app)
      .patch(`/api/v1/admin/lectures/${lectureId}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        lectureType: 'pdf_document',
        fileUrl: 'https://example.com/file.pdf',
        fileName: 'file.pdf',
        isDownloadable: true,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.fileUrl).toBe('https://example.com/file.pdf');
        expect(body.isDownloadable).toBe(true);
      });
  });

  it('should return 404 for a non-existent lecture', async () => {
    await request(app)
      .patch(
        '/api/v1/admin/lectures/00000000-0000-0000-0000-000000000000/content',
      )
      .auth(superAdminToken, { type: 'bearer' })
      .send({ lectureType: 'article', body: 'x' })
      .expect(404);
  });
});
