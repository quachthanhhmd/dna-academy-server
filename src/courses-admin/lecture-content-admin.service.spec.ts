import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LectureContentAdminService } from './lecture-content-admin.service';

describe('LectureContentAdminService', () => {
  let service: LectureContentAdminService;

  let lecturesService: { findById: jest.Mock<any>; update: jest.Mock<any> };
  let youtubeService: { validateAndExtractVideoId: jest.Mock<any> };
  let lectureContentVideosService: {
    findByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let lectureContentArticlesService: {
    findByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let lectureContentDocumentsService: {
    findByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let lectureContentQuizzesService: {
    findByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let quizQuestionsService: {
    findByLectureId: jest.Mock<any>;
    removeByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let quizAnswerOptionsService: {
    removeByQuestionIds: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let lectureContentReflectionsService: {
    findByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let reflectionQuestionsService: {
    findByLectureId: jest.Mock<any>;
    removeByLectureId: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let courseAggregatesService: { recalculate: jest.Mock<any> };

  const lecture = (lectureType: string) => ({
    id: 'lecture-1',
    lectureType,
    section: { id: 'section-1', course: { id: 'course-1' } },
  });

  beforeEach(() => {
    lecturesService = { findById: jest.fn(), update: jest.fn() };
    youtubeService = { validateAndExtractVideoId: jest.fn() };
    lectureContentVideosService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    lectureContentArticlesService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    lectureContentDocumentsService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    lectureContentQuizzesService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    quizQuestionsService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      removeByLectureId: jest.fn(),
      create: jest.fn(),
    };
    quizAnswerOptionsService = {
      removeByQuestionIds: jest.fn(),
      create: jest.fn(),
    };
    lectureContentReflectionsService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    reflectionQuestionsService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      removeByLectureId: jest.fn(),
      create: jest.fn(),
    };
    courseAggregatesService = { recalculate: jest.fn() };

    service = new LectureContentAdminService(
      lecturesService as any,
      youtubeService as any,
      lectureContentVideosService as any,
      lectureContentArticlesService as any,
      lectureContentDocumentsService as any,
      lectureContentQuizzesService as any,
      quizQuestionsService as any,
      quizAnswerOptionsService as any,
      lectureContentReflectionsService as any,
      reflectionQuestionsService as any,
      courseAggregatesService as any,
    );
  });

  it('should 404 when the lecture does not exist', async () => {
    lecturesService.findById.mockResolvedValue(null);

    await expect(
      service.save('missing', { lectureType: 'article', body: 'x' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('video', () => {
    it('should 422 when youtubeUrl is missing', async () => {
      lecturesService.findById.mockResolvedValue(lecture('video'));

      await expect(
        service.save('lecture-1', { lectureType: 'video' } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should validate via oEmbed, extract the video id, and create content', async () => {
      lecturesService.findById.mockResolvedValue(lecture('video'));
      youtubeService.validateAndExtractVideoId.mockResolvedValue('abc123');
      lectureContentVideosService.create.mockResolvedValue({ id: 'v-1' });

      await service.save('lecture-1', {
        lectureType: 'video',
        youtubeUrl: 'https://youtu.be/abc123',
      } as any);

      expect(youtubeService.validateAndExtractVideoId).toHaveBeenCalledWith(
        'https://youtu.be/abc123',
      );
      expect(lectureContentVideosService.create).toHaveBeenCalledWith({
        lecture: { id: 'lecture-1' },
        youtubeUrl: 'https://youtu.be/abc123',
        youtubeVideoId: 'abc123',
      });
    });

    it('should update existing video content instead of creating a duplicate', async () => {
      lecturesService.findById.mockResolvedValue(lecture('video'));
      lectureContentVideosService.findByLectureId.mockResolvedValue({
        id: 'v-1',
      });
      youtubeService.validateAndExtractVideoId.mockResolvedValue('xyz789');

      await service.save('lecture-1', {
        lectureType: 'video',
        youtubeUrl: 'https://youtu.be/xyz789',
      } as any);

      expect(lectureContentVideosService.update).toHaveBeenCalledWith('v-1', {
        youtubeUrl: 'https://youtu.be/xyz789',
        youtubeVideoId: 'xyz789',
      });
      expect(lectureContentVideosService.create).not.toHaveBeenCalled();
    });
  });

  describe('article', () => {
    it('should 422 when body is missing', async () => {
      lecturesService.findById.mockResolvedValue(lecture('article'));

      await expect(
        service.save('lecture-1', { lectureType: 'article' } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should create article content', async () => {
      lecturesService.findById.mockResolvedValue(lecture('article'));
      lectureContentArticlesService.create.mockResolvedValue({ id: 'a-1' });

      await service.save('lecture-1', {
        lectureType: 'article',
        body: '<p>Hi</p>',
      } as any);

      expect(lectureContentArticlesService.create).toHaveBeenCalledWith({
        lecture: { id: 'lecture-1' },
        body: '<p>Hi</p>',
      });
    });
  });

  describe('pdf_document', () => {
    it('should 422 when fileUrl is missing', async () => {
      lecturesService.findById.mockResolvedValue(lecture('pdf_document'));

      await expect(
        service.save('lecture-1', { lectureType: 'pdf_document' } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should create document content defaulting isDownloadable to false', async () => {
      lecturesService.findById.mockResolvedValue(lecture('pdf_document'));
      lectureContentDocumentsService.create.mockResolvedValue({ id: 'd-1' });

      await service.save('lecture-1', {
        lectureType: 'pdf_document',
        fileUrl: 'https://example.com/f.pdf',
        fileName: 'f.pdf',
      } as any);

      expect(lectureContentDocumentsService.create).toHaveBeenCalledWith({
        lecture: { id: 'lecture-1' },
        fileUrl: 'https://example.com/f.pdf',
        fileName: 'f.pdf',
        isDownloadable: false,
      });
    });
  });

  describe('quiz', () => {
    it('should 422 when passingScore or allowResume is missing', async () => {
      lecturesService.findById.mockResolvedValue(lecture('quiz'));

      await expect(
        service.save('lecture-1', {
          lectureType: 'quiz',
          allowResume: true,
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should upsert quiz content and replace questions + options', async () => {
      lecturesService.findById.mockResolvedValue(lecture('quiz'));
      lectureContentQuizzesService.create.mockResolvedValue({ id: 'q-1' });
      quizQuestionsService.findByLectureId.mockResolvedValueOnce([
        { id: 'old-question' },
      ]);
      quizQuestionsService.create.mockResolvedValue({
        id: 'new-question',
      });

      await service.save('lecture-1', {
        lectureType: 'quiz',
        passingScore: 70,
        allowResume: true,
        quizQuestions: [
          {
            questionText: 'Q1?',
            questionType: 'single_choice',
            isRequired: true,
            displayOrder: 1,
            options: [
              { optionText: 'A', isCorrect: true, displayOrder: 1 },
              { optionText: 'B', isCorrect: false, displayOrder: 2 },
            ],
          },
        ],
      } as any);

      expect(quizAnswerOptionsService.removeByQuestionIds).toHaveBeenCalledWith(
        ['old-question'],
      );
      expect(quizQuestionsService.removeByLectureId).toHaveBeenCalledWith(
        'lecture-1',
      );
      expect(quizQuestionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lecture: { id: 'lecture-1' },
          questionText: 'Q1?',
        }),
      );
      expect(quizAnswerOptionsService.create).toHaveBeenCalledWith({
        question: { id: 'new-question' },
        optionText: 'A',
        isCorrect: true,
        displayOrder: 1,
      });
      expect(quizAnswerOptionsService.create).toHaveBeenCalledWith({
        question: { id: 'new-question' },
        optionText: 'B',
        isCorrect: false,
        displayOrder: 2,
      });
    });
  });

  describe('reflection', () => {
    it('should 422 when minResponseLength is missing', async () => {
      lecturesService.findById.mockResolvedValue(lecture('reflection'));

      await expect(
        service.save('lecture-1', { lectureType: 'reflection' } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should upsert reflection content and replace reflection questions', async () => {
      lecturesService.findById.mockResolvedValue(lecture('reflection'));
      lectureContentReflectionsService.create.mockResolvedValue({
        id: 'r-1',
      });

      await service.save('lecture-1', {
        lectureType: 'reflection',
        minResponseLength: 50,
        reflectionQuestions: [
          { questionText: 'How do you feel?', displayOrder: 1 },
        ],
      } as any);

      expect(reflectionQuestionsService.removeByLectureId).toHaveBeenCalledWith(
        'lecture-1',
      );
      expect(reflectionQuestionsService.create).toHaveBeenCalledWith({
        lecture: { id: 'lecture-1' },
        questionText: 'How do you feel?',
        displayOrder: 1,
      });
    });
  });

  describe('type switching', () => {
    it('should clear previous content and set incompatibleContentCleared=true when the type changes and old content existed', async () => {
      lecturesService.findById.mockResolvedValue(lecture('article'));
      lectureContentArticlesService.findByLectureId.mockResolvedValue({
        id: 'old-article',
      });
      lectureContentVideosService.create.mockResolvedValue({ id: 'v-1' });
      youtubeService.validateAndExtractVideoId.mockResolvedValue('abc123');

      const result = await service.save('lecture-1', {
        lectureType: 'video',
        youtubeUrl: 'https://youtu.be/abc123',
      } as any);

      expect(lectureContentArticlesService.remove).toHaveBeenCalledWith(
        'old-article',
      );
      expect(lecturesService.update).toHaveBeenCalledWith('lecture-1', {
        lectureType: 'video',
      });
      expect(result.incompatibleContentCleared).toBe(true);
    });

    it('should set incompatibleContentCleared=false when the type changes but there was no prior content', async () => {
      lecturesService.findById.mockResolvedValue(lecture('article'));
      lectureContentArticlesService.findByLectureId.mockResolvedValue(null);
      lectureContentVideosService.create.mockResolvedValue({ id: 'v-1' });
      youtubeService.validateAndExtractVideoId.mockResolvedValue('abc123');

      const result = await service.save('lecture-1', {
        lectureType: 'video',
        youtubeUrl: 'https://youtu.be/abc123',
      } as any);

      expect(lectureContentArticlesService.remove).not.toHaveBeenCalled();
      expect(result.incompatibleContentCleared).toBe(false);
    });

    it('should set incompatibleContentCleared=false when the type is unchanged', async () => {
      lecturesService.findById.mockResolvedValue(lecture('article'));
      lectureContentArticlesService.create.mockResolvedValue({ id: 'a-1' });

      const result = await service.save('lecture-1', {
        lectureType: 'article',
        body: 'Updated body',
      } as any);

      expect(lectureContentArticlesService.remove).not.toHaveBeenCalled();
      expect(result.incompatibleContentCleared).toBe(false);
    });
  });

  it('should always trigger course aggregate recalculation on save', async () => {
    lecturesService.findById.mockResolvedValue(lecture('article'));
    lectureContentArticlesService.create.mockResolvedValue({ id: 'a-1' });

    await service.save('lecture-1', {
      lectureType: 'article',
      body: 'x',
    } as any);

    expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
      'course-1',
    );
  });
});
