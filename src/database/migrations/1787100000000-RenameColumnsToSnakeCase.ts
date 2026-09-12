import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The `course.search_vector` generation expression on either side of this
 * migration, frozen as literals rather than imported from `course-search.sql`.
 *
 * Both spellings have to be written down here for the same reason
 * `AddCourseFullTextSearch` freezes its own copy: a migration is a transition
 * between two fixed schema states. Importing the live constant would make this
 * file mean something different the moment the application changed it — a
 * fresh database would still create the column from the frozen camelCase
 * literal, while this migration wrote the *new* text into `typeorm_metadata`,
 * leaving the metadata row describing an expression the column does not have.
 * That is precisely the drift the row exists to prevent.
 *
 * `course-search.sql.spec.ts` pins the live constant, so a change there is
 * caught in review and arrives as a new migration.
 */
const SEARCH_VECTOR_EXPRESSION_CAMEL =
  `setweight(to_tsvector('vi_unaccent', coalesce("title", '')), 'A') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("shortDescription", '')), 'B') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("fullDescription", '')), 'C')`;

const SEARCH_VECTOR_EXPRESSION_SNAKE =
  `setweight(to_tsvector('vi_unaccent', coalesce("title", '')), 'A') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("short_description", '')), 'B') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("full_description", '')), 'C')`;

/**
 * Renames every camelCase column to snake_case.
 *
 * The table names were already snake_case; only the columns disagreed, because
 * TypeORM defaults to using the property name verbatim. That left the database
 * readable only through the ORM: every hand-written query, psql session, BI
 * tool and `\d` output needed double quotes, and forgetting them turns
 * `WHERE courseId = …` into a silent lookup of a lowercase column that does
 * not exist.
 *
 * **Rename, not recreate.** `ALTER TABLE … RENAME COLUMN` carries indexes,
 * check constraints and foreign keys with it, so no data moves and nothing is
 * rebuilt. The auto-generated constraint and index *names* are then renamed
 * too — see `RENAMES` for why that is not merely cosmetic.
 *
 * Generated from the live schema rather than from the entity files, so the
 * list matches the columns that actually exist. 288 columns across
 * 42 tables.
 */
export class RenameColumnsToSnakeCase1787100000000 implements MigrationInterface {
  name = 'RenameColumnsToSnakeCase1787100000000';

  /** `[table, camelCase, snake_case]` */
  private static readonly COLUMNS: readonly [string, string, string][] = [
    // career_reflection_answer
    ['career_reflection_answer', 'submittedAt', 'submitted_at'],
    ['career_reflection_answer', 'textAnswer', 'text_answer'],
    ['career_reflection_answer', 'ratingAnswer', 'rating_answer'],
    ['career_reflection_answer', 'createdAt', 'created_at'],
    ['career_reflection_answer', 'updatedAt', 'updated_at'],
    ['career_reflection_answer', 'questionId', 'question_id'],
    ['career_reflection_answer', 'enrollmentId', 'enrollment_id'],
    // career_reflection_question
    ['career_reflection_question', 'isActive', 'is_active'],
    ['career_reflection_question', 'displayOrder', 'display_order'],
    ['career_reflection_question', 'questionText', 'question_text'],
    ['career_reflection_question', 'createdAt', 'created_at'],
    ['career_reflection_question', 'updatedAt', 'updated_at'],
    ['career_reflection_question', 'courseId', 'course_id'],
    ['career_reflection_question', 'questionType', 'question_type'],
    ['career_reflection_question', 'labelMin', 'label_min'],
    ['career_reflection_question', 'labelMax', 'label_max'],
    [
      'career_reflection_question',
      'labelMinTranslations',
      'label_min_translations',
    ],
    [
      'career_reflection_question',
      'labelMaxTranslations',
      'label_max_translations',
    ],
    // certificate
    ['certificate', 'issuedAt', 'issued_at'],
    ['certificate', 'completionDate', 'completion_date'],
    ['certificate', 'courseTitleSnapshot', 'course_title_snapshot'],
    ['certificate', 'studentNameSnapshot', 'student_name_snapshot'],
    ['certificate', 'certificateNumber', 'certificate_number'],
    ['certificate', 'createdAt', 'created_at'],
    ['certificate', 'updatedAt', 'updated_at'],
    ['certificate', 'fileId', 'file_id'],
    ['certificate', 'courseId', 'course_id'],
    ['certificate', 'studentId', 'student_id'],
    ['certificate', 'enrollmentId', 'enrollment_id'],
    ['certificate', 'finalGradePct', 'final_grade_pct'],
    // course
    ['course', 'publishedAt', 'published_at'],
    ['course', 'avgRating', 'avg_rating'],
    ['course', 'totalEnrollments', 'total_enrollments'],
    ['course', 'totalDurationSecs', 'total_duration_secs'],
    ['course', 'totalLectures', 'total_lectures'],
    ['course', 'totalSections', 'total_sections'],
    ['course', 'enrollmentOpen', 'enrollment_open'],
    ['course', 'hasCertificate', 'has_certificate'],
    ['course', 'isFree', 'is_free'],
    ['course', 'introVideoUrl', 'intro_video_url'],
    ['course', 'thumbnailUrl', 'thumbnail_url'],
    ['course', 'fullDescription', 'full_description'],
    ['course', 'shortDescription', 'short_description'],
    ['course', 'createdAt', 'created_at'],
    ['course', 'updatedAt', 'updated_at'],
    ['course', 'createdById', 'created_by_id'],
    ['course', 'publishedById', 'published_by_id'],
    ['course', 'categoryId', 'category_id'],
    ['course', 'levelId', 'level_id'],
    ['course', 'courseId', 'course_id'],
    ['course', 'unpublishedAt', 'unpublished_at'],
    ['course', 'unpublishedById', 'unpublished_by_id'],
    [
      'course',
      'requiresSequentialCompletion',
      'requires_sequential_completion',
    ],
    ['course', 'searchVector', 'search_vector'],
    // course_group_assignment
    ['course_group_assignment', 'createdAt', 'created_at'],
    ['course_group_assignment', 'updatedAt', 'updated_at'],
    ['course_group_assignment', 'groupId', 'group_id'],
    ['course_group_assignment', 'courseId', 'course_id'],
    // course_instructor
    ['course_instructor', 'displayOrder', 'display_order'],
    ['course_instructor', 'createdAt', 'created_at'],
    ['course_instructor', 'updatedAt', 'updated_at'],
    ['course_instructor', 'courseId', 'course_id'],
    ['course_instructor', 'instructorId', 'instructor_id'],
    // course_learning_outcome
    ['course_learning_outcome', 'displayOrder', 'display_order'],
    ['course_learning_outcome', 'createdAt', 'created_at'],
    ['course_learning_outcome', 'updatedAt', 'updated_at'],
    ['course_learning_outcome', 'courseId', 'course_id'],
    // course_rating
    ['course_rating', 'submittedAt', 'submitted_at'],
    ['course_rating', 'reviewStatus', 'review_status'],
    ['course_rating', 'reviewText', 'review_text'],
    ['course_rating', 'createdAt', 'created_at'],
    ['course_rating', 'updatedAt', 'updated_at'],
    ['course_rating', 'courseId', 'course_id'],
    ['course_rating', 'studentId', 'student_id'],
    ['course_rating', 'enrollmentId', 'enrollment_id'],
    // course_requirement
    ['course_requirement', 'displayOrder', 'display_order'],
    ['course_requirement', 'createdAt', 'created_at'],
    ['course_requirement', 'updatedAt', 'updated_at'],
    ['course_requirement', 'courseId', 'course_id'],
    // course_target_learner
    ['course_target_learner', 'displayOrder', 'display_order'],
    ['course_target_learner', 'createdAt', 'created_at'],
    ['course_target_learner', 'updatedAt', 'updated_at'],
    ['course_target_learner', 'courseId', 'course_id'],
    // enrollment
    ['enrollment', 'lastAccessedAt', 'last_accessed_at'],
    ['enrollment', 'progressPct', 'progress_pct'],
    ['enrollment', 'completedAt', 'completed_at'],
    ['enrollment', 'startedAt', 'started_at'],
    ['enrollment', 'enrollmentSource', 'enrollment_source'],
    ['enrollment', 'enrollmentDate', 'enrollment_date'],
    ['enrollment', 'createdAt', 'created_at'],
    ['enrollment', 'updatedAt', 'updated_at'],
    ['enrollment', 'lastLectureId', 'last_lecture_id'],
    ['enrollment', 'courseId', 'course_id'],
    ['enrollment', 'studentId', 'student_id'],
    // instructor
    ['instructor', 'fullName', 'full_name'],
    ['instructor', 'profilePictureUrl', 'profile_picture_url'],
    ['instructor', 'emailPublic', 'email_public'],
    ['instructor', 'yearsOfExperience', 'years_of_experience'],
    ['instructor', 'isActive', 'is_active'],
    ['instructor', 'displayOrder', 'display_order'],
    ['instructor', 'totalCourses', 'total_courses'],
    ['instructor', 'totalStudents', 'total_students'],
    ['instructor', 'avgRating', 'avg_rating'],
    ['instructor', 'createdAt', 'created_at'],
    ['instructor', 'updatedAt', 'updated_at'],
    ['instructor', 'userId', 'user_id'],
    ['instructor', 'createdById', 'created_by_id'],
    // instructor_expertise
    ['instructor_expertise', 'createdAt', 'created_at'],
    ['instructor_expertise', 'updatedAt', 'updated_at'],
    ['instructor_expertise', 'instructorId', 'instructor_id'],
    ['instructor_expertise', 'expertiseCodeId', 'expertise_code_id'],
    // instructor_social_link
    ['instructor_social_link', 'displayOrder', 'display_order'],
    ['instructor_social_link', 'createdAt', 'created_at'],
    ['instructor_social_link', 'updatedAt', 'updated_at'],
    ['instructor_social_link', 'instructorId', 'instructor_id'],
    // lecture
    ['lecture', 'displayOrder', 'display_order'],
    ['lecture', 'requiresCompletion', 'requires_completion'],
    ['lecture', 'isPreview', 'is_preview'],
    ['lecture', 'durationSecs', 'duration_secs'],
    ['lecture', 'lectureType', 'lecture_type'],
    ['lecture', 'createdAt', 'created_at'],
    ['lecture', 'updatedAt', 'updated_at'],
    ['lecture', 'sectionId', 'section_id'],
    // lecture_content_article
    ['lecture_content_article', 'createdAt', 'created_at'],
    ['lecture_content_article', 'updatedAt', 'updated_at'],
    ['lecture_content_article', 'lectureId', 'lecture_id'],
    // lecture_content_document
    ['lecture_content_document', 'isDownloadable', 'is_downloadable'],
    ['lecture_content_document', 'fileName', 'file_name'],
    ['lecture_content_document', 'fileUrl', 'file_url'],
    ['lecture_content_document', 'createdAt', 'created_at'],
    ['lecture_content_document', 'updatedAt', 'updated_at'],
    ['lecture_content_document', 'lectureId', 'lecture_id'],
    // lecture_content_quiz
    ['lecture_content_quiz', 'allowResume', 'allow_resume'],
    ['lecture_content_quiz', 'passingScore', 'passing_score'],
    ['lecture_content_quiz', 'createdAt', 'created_at'],
    ['lecture_content_quiz', 'updatedAt', 'updated_at'],
    ['lecture_content_quiz', 'lectureId', 'lecture_id'],
    ['lecture_content_quiz', 'timeLimitSecs', 'time_limit_secs'],
    ['lecture_content_quiz', 'passThresholdPercent', 'pass_threshold_percent'],
    // lecture_content_reflection
    ['lecture_content_reflection', 'minResponseLength', 'min_response_length'],
    ['lecture_content_reflection', 'createdAt', 'created_at'],
    ['lecture_content_reflection', 'updatedAt', 'updated_at'],
    ['lecture_content_reflection', 'lectureId', 'lecture_id'],
    // lecture_content_video
    ['lecture_content_video', 'youtubeVideoId', 'youtube_video_id'],
    ['lecture_content_video', 'youtubeUrl', 'youtube_url'],
    ['lecture_content_video', 'createdAt', 'created_at'],
    ['lecture_content_video', 'updatedAt', 'updated_at'],
    ['lecture_content_video', 'lectureId', 'lecture_id'],
    // lecture_progress
    ['lecture_progress', 'watchDurationSecs', 'watch_duration_secs'],
    ['lecture_progress', 'completedAt', 'completed_at'],
    ['lecture_progress', 'startedAt', 'started_at'],
    ['lecture_progress', 'createdAt', 'created_at'],
    ['lecture_progress', 'updatedAt', 'updated_at'],
    ['lecture_progress', 'lectureId', 'lecture_id'],
    ['lecture_progress', 'enrollmentId', 'enrollment_id'],
    // master_data_code
    ['master_data_code', 'displayOrder', 'display_order'],
    ['master_data_code', 'isActive', 'is_active'],
    ['master_data_code', 'thumbnailUrl', 'thumbnail_url'],
    ['master_data_code', 'createdAt', 'created_at'],
    ['master_data_code', 'updatedAt', 'updated_at'],
    ['master_data_code', 'createdById', 'created_by_id'],
    ['master_data_code', 'groupId', 'group_id'],
    ['master_data_code', 'nameTranslations', 'name_translations'],
    ['master_data_code', 'descriptionTranslations', 'description_translations'],
    // master_data_group
    ['master_data_group', 'displayOrder', 'display_order'],
    ['master_data_group', 'isActive', 'is_active'],
    ['master_data_group', 'groupKey', 'group_key'],
    ['master_data_group', 'createdAt', 'created_at'],
    ['master_data_group', 'updatedAt', 'updated_at'],
    ['master_data_group', 'createdById', 'created_by_id'],
    ['master_data_group', 'nameTranslations', 'name_translations'],
    [
      'master_data_group',
      'descriptionTranslations',
      'description_translations',
    ],
    // media_file
    ['media_file', 'sizeBytes', 'size_bytes'],
    ['media_file', 'mimeType', 'mime_type'],
    ['media_file', 'fileName', 'file_name'],
    ['media_file', 'objectKey', 'object_key'],
    ['media_file', 'createdAt', 'created_at'],
    ['media_file', 'updatedAt', 'updated_at'],
    ['media_file', 'uploadedById', 'uploaded_by_id'],
    // module
    ['module', 'createdAt', 'created_at'],
    ['module', 'updatedAt', 'updated_at'],
    // oauth_account
    ['oauth_account', 'tokenExpiresAt', 'token_expires_at'],
    ['oauth_account', 'refreshToken', 'refresh_token'],
    ['oauth_account', 'accessToken', 'access_token'],
    ['oauth_account', 'providerUid', 'provider_uid'],
    ['oauth_account', 'createdAt', 'created_at'],
    ['oauth_account', 'updatedAt', 'updated_at'],
    ['oauth_account', 'userId', 'user_id'],
    // permission
    ['permission', 'createdAt', 'created_at'],
    ['permission', 'updatedAt', 'updated_at'],
    ['permission', 'moduleId', 'module_id'],
    // quiz_answer_option
    ['quiz_answer_option', 'displayOrder', 'display_order'],
    ['quiz_answer_option', 'isCorrect', 'is_correct'],
    ['quiz_answer_option', 'optionText', 'option_text'],
    ['quiz_answer_option', 'createdAt', 'created_at'],
    ['quiz_answer_option', 'updatedAt', 'updated_at'],
    ['quiz_answer_option', 'questionId', 'question_id'],
    // quiz_attempt
    ['quiz_attempt', 'submittedAt', 'submitted_at'],
    ['quiz_attempt', 'createdAt', 'created_at'],
    ['quiz_attempt', 'updatedAt', 'updated_at'],
    ['quiz_attempt', 'lectureId', 'lecture_id'],
    ['quiz_attempt', 'enrollmentId', 'enrollment_id'],
    // quiz_attempt_answer
    ['quiz_attempt_answer', 'gradedAt', 'graded_at'],
    ['quiz_attempt_answer', 'isCorrect', 'is_correct'],
    ['quiz_attempt_answer', 'ratingAnswer', 'rating_answer'],
    ['quiz_attempt_answer', 'textAnswer', 'text_answer'],
    ['quiz_attempt_answer', 'selectedOptionIds', 'selected_option_ids'],
    ['quiz_attempt_answer', 'createdAt', 'created_at'],
    ['quiz_attempt_answer', 'updatedAt', 'updated_at'],
    ['quiz_attempt_answer', 'gradedById', 'graded_by_id'],
    ['quiz_attempt_answer', 'fileId', 'file_id'],
    ['quiz_attempt_answer', 'selectedOptionId', 'selected_option_id'],
    ['quiz_attempt_answer', 'questionId', 'question_id'],
    ['quiz_attempt_answer', 'attemptId', 'attempt_id'],
    // quiz_question
    ['quiz_question', 'displayOrder', 'display_order'],
    ['quiz_question', 'maxFileSizeMb', 'max_file_size_mb'],
    ['quiz_question', 'allowedMimeTypes', 'allowed_mime_types'],
    ['quiz_question', 'minWordCount', 'min_word_count'],
    ['quiz_question', 'ratingLabelMax', 'rating_label_max'],
    ['quiz_question', 'ratingLabelMin', 'rating_label_min'],
    ['quiz_question', 'ratingMax', 'rating_max'],
    ['quiz_question', 'ratingMin', 'rating_min'],
    ['quiz_question', 'isRequired', 'is_required'],
    ['quiz_question', 'questionType', 'question_type'],
    ['quiz_question', 'questionText', 'question_text'],
    ['quiz_question', 'createdAt', 'created_at'],
    ['quiz_question', 'updatedAt', 'updated_at'],
    ['quiz_question', 'lectureId', 'lecture_id'],
    // quiz_save
    ['quiz_save', 'savedAt', 'saved_at'],
    ['quiz_save', 'answersJson', 'answers_json'],
    ['quiz_save', 'createdAt', 'created_at'],
    ['quiz_save', 'updatedAt', 'updated_at'],
    ['quiz_save', 'lectureId', 'lecture_id'],
    ['quiz_save', 'enrollmentId', 'enrollment_id'],
    // reflection_question
    ['reflection_question', 'displayOrder', 'display_order'],
    ['reflection_question', 'questionText', 'question_text'],
    ['reflection_question', 'createdAt', 'created_at'],
    ['reflection_question', 'updatedAt', 'updated_at'],
    ['reflection_question', 'lectureId', 'lecture_id'],
    // reflection_response
    ['reflection_response', 'submittedAt', 'submitted_at'],
    ['reflection_response', 'responseText', 'response_text'],
    ['reflection_response', 'createdAt', 'created_at'],
    ['reflection_response', 'updatedAt', 'updated_at'],
    ['reflection_response', 'questionId', 'question_id'],
    ['reflection_response', 'enrollmentId', 'enrollment_id'],
    // role
    ['role', 'isActive', 'is_active'],
    // role_permission
    ['role_permission', 'createdAt', 'created_at'],
    ['role_permission', 'updatedAt', 'updated_at'],
    ['role_permission', 'permissionId', 'permission_id'],
    ['role_permission', 'roleId', 'role_id'],
    // section
    ['section', 'displayOrder', 'display_order'],
    ['section', 'learningObjective', 'learning_objective'],
    ['section', 'createdAt', 'created_at'],
    ['section', 'updatedAt', 'updated_at'],
    ['section', 'courseId', 'course_id'],
    // session
    ['session', 'createdAt', 'created_at'],
    ['session', 'updatedAt', 'updated_at'],
    ['session', 'deletedAt', 'deleted_at'],
    ['session', 'userId', 'user_id'],
    // student_career_interest
    ['student_career_interest', 'customInterest', 'custom_interest'],
    ['student_career_interest', 'createdAt', 'created_at'],
    ['student_career_interest', 'updatedAt', 'updated_at'],
    ['student_career_interest', 'careerInterestId', 'career_interest_id'],
    ['student_career_interest', 'userId', 'user_id'],
    // student_profile
    ['student_profile', 'createdAt', 'created_at'],
    ['student_profile', 'updatedAt', 'updated_at'],
    ['student_profile', 'educationStageCodeId', 'education_stage_code_id'],
    ['student_profile', 'userId', 'user_id'],
    // user
    ['user', 'socialId', 'social_id'],
    ['user', 'firstName', 'first_name'],
    ['user', 'lastName', 'last_name'],
    ['user', 'createdAt', 'created_at'],
    ['user', 'updatedAt', 'updated_at'],
    ['user', 'deletedAt', 'deleted_at'],
    ['user', 'photoId', 'photo_id'],
    ['user', 'roleId', 'role_id'],
    ['user', 'statusId', 'status_id'],
    ['user', 'onboardingDone', 'onboarding_done'],
    ['user', 'dateOfBirth', 'date_of_birth'],
    ['user', 'profilePictureUrl', 'profile_picture_url'],
    ['user', 'emailVerified', 'email_verified'],
    ['user', 'fullName', 'full_name'],
    // user_role
    ['user_role', 'assignedAt', 'assigned_at'],
    ['user_role', 'createdAt', 'created_at'],
    ['user_role', 'updatedAt', 'updated_at'],
    ['user_role', 'assignedById', 'assigned_by_id'],
    ['user_role', 'roleId', 'role_id'],
    ['user_role', 'userId', 'user_id'],
  ];

  /**
   * Auto-named constraints and indexes, whose identifiers TypeORM derives by
   * hashing the table and column names — so renaming a column changes the
   * name TypeORM expects, even though the constraint itself is untouched.
   *
   * Left alone these are harmless to queries but poisonous to tooling: every
   * `migration:generate` would emit 153 statements dropping and re-adding all
   * 72 foreign keys, drowning real changes in noise until someone applied it.
   *
   * `RENAME` rather than the drop-and-add pair TypeORM generates: renaming is
   * a catalogue update, while re-adding a foreign key takes a stronger lock
   * and revalidates every row in the table.
   *
   * The *current* name is looked up from the catalogue rather than written
   * down here, because it is not the same everywhere: a database built by
   * replaying these migrations and one that has been carried forward can
   * disagree on a generated hash. Only the target names are fixed, since
   * those are what the entities now imply. An object that is absent is
   * skipped — the schema it belongs to simply never had it.
   *
   * Each entry is one column, and a foreign key or auto-named index covers a
   * single column, so `(table, column)` identifies it uniquely.
   *
   * `[kind, table, camelColumn, snakeColumn, nameBefore, nameAfter]`
   */
  private static readonly RENAMES: readonly [
    'constraint' | 'index',
    string,
    string,
    string,
    string,
    string,
  ][] = [
    [
      'index',
      'user',
      'socialId',
      'social_id',
      'IDX_9bd2fe7a8e694dedc4ec2f666f',
      'IDX_0cd76a8cdee62eeff31d384b73',
    ],
    [
      'index',
      'user',
      'firstName',
      'first_name',
      'IDX_58e4dbff0e1a32a9bdc861bb29',
      'IDX_7a4fd2a547828e5efe420e50d1',
    ],
    [
      'index',
      'user',
      'lastName',
      'last_name',
      'IDX_f0e1b4ecdca13b177e2e3a0613',
      'IDX_6937e802be2946855a3ad0e6be',
    ],
    [
      'index',
      'session',
      'userId',
      'user_id',
      'IDX_3d2f174ef04fb312fdebd0ddc5',
      'IDX_30e98e8746699fb9af235410af',
    ],
    [
      'constraint',
      'user',
      'photoId',
      'photo_id',
      'FK_75e2be4ce11d447ef43be0e374f',
      'FK_2863d588f4efce8bf42c9c63526',
    ],
    [
      'constraint',
      'user',
      'roleId',
      'role_id',
      'FK_c28e52f758e7bbc53828db92194',
      'FK_fb2e442d14add3cefbdf33c4561',
    ],
    [
      'constraint',
      'user',
      'statusId',
      'status_id',
      'FK_dc18daa696860586ba4667a9d31',
      'FK_892a2061d6a04a7e2efe4c26d6f',
    ],
    [
      'constraint',
      'user_role',
      'assignedById',
      'assigned_by_id',
      'FK_f6883010496756ea3e2d980429d',
      'FK_9cbb77db19b830dbda4f8ee33d6',
    ],
    [
      'constraint',
      'user_role',
      'roleId',
      'role_id',
      'FK_dba55ed826ef26b5b22bd39409b',
      'FK_32a6fc2fcb019d8e3a8ace0f55f',
    ],
    [
      'constraint',
      'user_role',
      'userId',
      'user_id',
      'FK_ab40a6f0cd7d3ebfcce082131fd',
      'FK_d0e5815877f7395a198a4cb0a46',
    ],
    [
      'constraint',
      'master_data_group',
      'createdById',
      'created_by_id',
      'FK_55c90fe105fedc35ea2a0e7a86a',
      'FK_ed2c3d92048713de01e0a6ae652',
    ],
    [
      'constraint',
      'master_data_code',
      'createdById',
      'created_by_id',
      'FK_ad52f1da9c358131efe173f154e',
      'FK_e6c358a50fe12d35e8dadda351a',
    ],
    [
      'constraint',
      'master_data_code',
      'groupId',
      'group_id',
      'FK_a7e5dd1f9fb4315787d7dabd2ca',
      'FK_cc5a257710f9ee195dfa76a2f42',
    ],
    [
      'constraint',
      'student_profile',
      'educationStageCodeId',
      'education_stage_code_id',
      'FK_0752cdd13d22bf0550ff568e2c3',
      'FK_c3ce3a720aa40d380f306256de0',
    ],
    [
      'constraint',
      'student_profile',
      'userId',
      'user_id',
      'FK_940639e2ce4b06e9857bbef0c90',
      'FK_1f5209fc71a9181affa7647b8b5',
    ],
    [
      'constraint',
      'student_career_interest',
      'careerInterestId',
      'career_interest_id',
      'FK_a4566cb104a88b143ac04af4e5e',
      'FK_cba985104a783f58ca970e6a6b1',
    ],
    [
      'constraint',
      'student_career_interest',
      'userId',
      'user_id',
      'FK_8992f7e06206a58533e4409b0b8',
      'FK_ab33570212fed1aaf44fac05f13',
    ],
    [
      'constraint',
      'session',
      'userId',
      'user_id',
      'FK_3d2f174ef04fb312fdebd0ddc53',
      'FK_30e98e8746699fb9af235410aff',
    ],
    [
      'constraint',
      'course',
      'createdById',
      'created_by_id',
      'FK_2481291d5c97aaff5cf3ce5359c',
      'FK_f9fd9eca86a30ba191cecbbc7bd',
    ],
    [
      'constraint',
      'course',
      'publishedById',
      'published_by_id',
      'FK_9f34520df18045e70119da8a09a',
      'FK_da31795082e293e82517ffab10b',
    ],
    [
      'constraint',
      'course',
      'categoryId',
      'category_id',
      'FK_c6c48d73b3b32e47e9cc1cfc4c4',
      'FK_2f133fd8aa7a4d85ff7cd6f7c98',
    ],
    [
      'constraint',
      'course',
      'levelId',
      'level_id',
      'FK_9679d37e8ce033b56d27e271609',
      'FK_fab4dc4ff554cd78d16012c6d41',
    ],
    [
      'constraint',
      'section',
      'courseId',
      'course_id',
      'FK_c61e35b7deed3caab17e821144a',
      'FK_7e12912705e3430a0bd74dad81f',
    ],
    [
      'constraint',
      'permission',
      'moduleId',
      'module_id',
      'FK_18f3ac6d3f1e3e6b5e3f8123289',
      'FK_9b0b5d512656563cef9f0236a77',
    ],
    [
      'constraint',
      'role_permission',
      'permissionId',
      'permission_id',
      'FK_72e80be86cab0e93e67ed1a7a9a',
      'FK_e3a3ba47b7ca00fd23be4ebd6cf',
    ],
    [
      'constraint',
      'role_permission',
      'roleId',
      'role_id',
      'FK_e3130a39c1e4a740d044e685730',
      'FK_3d0a7155eafd75ddba5a7013368',
    ],
    [
      'constraint',
      'lecture',
      'sectionId',
      'section_id',
      'FK_3fe04dfc836b1abfdef34580941',
      'FK_05b264a75ceaafc30411e2e986e',
    ],
    [
      'constraint',
      'reflection_question',
      'lectureId',
      'lecture_id',
      'FK_a8b85b29a618feed82711e754e4',
      'FK_f25deb9aef9c1dc2f99c4a8232c',
    ],
    [
      'constraint',
      'enrollment',
      'lastLectureId',
      'last_lecture_id',
      'FK_692519768173f3b478890d0decb',
      'FK_66101e3cbafeb1ad7363ea85a95',
    ],
    [
      'constraint',
      'enrollment',
      'courseId',
      'course_id',
      'FK_d1a599a7740b4f4bd1120850f04',
      'FK_dd1ce01d1164c8bbdda052ced74',
    ],
    [
      'constraint',
      'enrollment',
      'studentId',
      'student_id',
      'FK_5ce702e71b98cc1bb37b81e83d8',
      'FK_eb0d79d7b8954d3129d032b0bb1',
    ],
    [
      'constraint',
      'reflection_response',
      'questionId',
      'question_id',
      'FK_5a0d1498c0458c25da2d1cea390',
      'FK_48ee944151b2b1c8f7d5597ee6b',
    ],
    [
      'constraint',
      'reflection_response',
      'enrollmentId',
      'enrollment_id',
      'FK_69151d55c89ab863b0162bc2167',
      'FK_13df4764520af2fe219ee74d82c',
    ],
    [
      'constraint',
      'quiz_save',
      'lectureId',
      'lecture_id',
      'FK_0a89e93bc6c2816760280b8e075',
      'FK_0408edf03d555cd0f436e61827b',
    ],
    [
      'constraint',
      'quiz_save',
      'enrollmentId',
      'enrollment_id',
      'FK_9ffb52340bb693cf4dcefec9879',
      'FK_9b3fa6d34ee5d9bdf65a6ec116c',
    ],
    [
      'constraint',
      'quiz_question',
      'lectureId',
      'lecture_id',
      'FK_845213123415fe595ee4431862e',
      'FK_a30149c45d239c3458de4ce2a2d',
    ],
    [
      'constraint',
      'quiz_attempt',
      'lectureId',
      'lecture_id',
      'FK_78d676fa5355a413bf049a7104b',
      'FK_c7a2e1f0951026c05c5a7f97930',
    ],
    [
      'constraint',
      'quiz_attempt',
      'enrollmentId',
      'enrollment_id',
      'FK_b0f8065b63263170d9bc39f01aa',
      'FK_1fc7c68a73aeaa1be5a3326760c',
    ],
    [
      'constraint',
      'media_file',
      'uploadedById',
      'uploaded_by_id',
      'FK_da069aecdbca0994ddc2bb13f1e',
      'FK_cbe4e7c1a0cfadf9ee32986812e',
    ],
    [
      'constraint',
      'quiz_answer_option',
      'questionId',
      'question_id',
      'FK_eb0d53e906c47eb0956041fee4e',
      'FK_86140eb074f9a24b6b1e73df187',
    ],
    [
      'constraint',
      'quiz_attempt_answer',
      'gradedById',
      'graded_by_id',
      'FK_4b2f6742d3f9edc943379f47a0e',
      'FK_852760bf342ac86aece429d2749',
    ],
    [
      'constraint',
      'quiz_attempt_answer',
      'fileId',
      'file_id',
      'FK_0152ffa686cd548156ec88b5bef',
      'FK_53bd5ff5eff3bbb2c59e6569417',
    ],
    [
      'constraint',
      'quiz_attempt_answer',
      'selectedOptionId',
      'selected_option_id',
      'FK_af6bdb5ddc4bd9a7f9c208cf774',
      'FK_3958dd54508ea9c8248359497fd',
    ],
    [
      'constraint',
      'quiz_attempt_answer',
      'questionId',
      'question_id',
      'FK_193ab38af6b3cc2d455c401b8ed',
      'FK_68c8fb3780d1c29e47762129185',
    ],
    [
      'constraint',
      'quiz_attempt_answer',
      'attemptId',
      'attempt_id',
      'FK_2f5419e41bd6924de82867cfc3a',
      'FK_48531ffcf28ef4bf761626cc75d',
    ],
    [
      'constraint',
      'oauth_account',
      'userId',
      'user_id',
      'FK_a9124d5956d6244b17bdd67f92b',
      'FK_e355ddb0b69b083cbf253345d1c',
    ],
    [
      'constraint',
      'lecture_progress',
      'lectureId',
      'lecture_id',
      'FK_85811dd926b0ac79fc24aa8c05d',
      'FK_fa150b048aefe6973adb23ef45e',
    ],
    [
      'constraint',
      'lecture_progress',
      'enrollmentId',
      'enrollment_id',
      'FK_1632433ea7e758949973aa44779',
      'FK_d3a47dcac4e78b405c50f1d1092',
    ],
    [
      'constraint',
      'lecture_content_video',
      'lectureId',
      'lecture_id',
      'FK_fb08c432cbebe06403390b5398e',
      'FK_9b25eaa382714fb6dfcb2c7e3ad',
    ],
    [
      'constraint',
      'lecture_content_reflection',
      'lectureId',
      'lecture_id',
      'FK_21cb04ef6cdf8e4eacf0498dfff',
      'FK_8c1d1e7a88c25a0ecdd3c9a9f31',
    ],
    [
      'constraint',
      'lecture_content_quiz',
      'lectureId',
      'lecture_id',
      'FK_8778326df4349471b3c0959fa55',
      'FK_746d56071228c954ddf3fa42575',
    ],
    [
      'constraint',
      'lecture_content_document',
      'lectureId',
      'lecture_id',
      'FK_554315946cedc03462f871a10c0',
      'FK_0ff471a4baab2d23940a3a2b07e',
    ],
    [
      'constraint',
      'lecture_content_article',
      'lectureId',
      'lecture_id',
      'FK_58c179095ab6754527baf93ffd6',
      'FK_b908b27d219ef25bcdd64a59856',
    ],
    [
      'constraint',
      'instructor',
      'userId',
      'user_id',
      'FK_a914853943da2844065d6e5c383',
      'FK_017e5f8348ae0b4f877c6339dff',
    ],
    [
      'constraint',
      'instructor',
      'createdById',
      'created_by_id',
      'FK_ce6e86bd3994debeedb4e37e050',
      'FK_1b0f5517c46f58bf541d882cbe9',
    ],
    [
      'constraint',
      'instructor_social_link',
      'instructorId',
      'instructor_id',
      'FK_050584f96d4d000248abf4470e6',
      'FK_bc269501021b7294542761cdc82',
    ],
    [
      'constraint',
      'instructor_expertise',
      'instructorId',
      'instructor_id',
      'FK_c14f1b79880fe58a57be3e7f993',
      'FK_95c14604b11b4fc4dc45fc86852',
    ],
    [
      'constraint',
      'instructor_expertise',
      'expertiseCodeId',
      'expertise_code_id',
      'FK_356530d9755d06cfcaa76a76869',
      'FK_3d3e71b7785ab59b574c696ad33',
    ],
    [
      'constraint',
      'course_target_learner',
      'courseId',
      'course_id',
      'FK_08ef18d1435c391e76a52629836',
      'FK_7c753360fecda8087878a9cc5a4',
    ],
    [
      'constraint',
      'course_requirement',
      'courseId',
      'course_id',
      'FK_2e113498f0df628e679827a2a61',
      'FK_d25a403e5475d579d9176f91a41',
    ],
    [
      'constraint',
      'course_rating',
      'courseId',
      'course_id',
      'FK_a3d4d5506ab43943558e8618206',
      'FK_a0818bf0324e54b38f18e317008',
    ],
    [
      'constraint',
      'course_rating',
      'studentId',
      'student_id',
      'FK_7e2c4436f6257f147eb56469fc8',
      'FK_9372c6bd45b8410c793bceb08c7',
    ],
    [
      'constraint',
      'course_rating',
      'enrollmentId',
      'enrollment_id',
      'FK_048dc1bd439ad739f28f68d6f41',
      'FK_4fa90d06b13eac5752b89b12376',
    ],
    [
      'constraint',
      'course_learning_outcome',
      'courseId',
      'course_id',
      'FK_a318741db7c08968d85b91b623d',
      'FK_a5c77075cd4c10c281c00645e5f',
    ],
    [
      'constraint',
      'course_instructor',
      'courseId',
      'course_id',
      'FK_2d903e73a7da87b36f79dbe8400',
      'FK_741b54642d16e8d8530df00d301',
    ],
    [
      'constraint',
      'course_instructor',
      'instructorId',
      'instructor_id',
      'FK_8c4dda917b09dd3b4fc47dcb6b3',
      'FK_f139a278698901827a62f366d4c',
    ],
    [
      'constraint',
      'course_group_assignment',
      'groupId',
      'group_id',
      'FK_a2625431566e64d78a684fd762e',
      'FK_ba7f78a3624408200734ef072e4',
    ],
    [
      'constraint',
      'course_group_assignment',
      'courseId',
      'course_id',
      'FK_cc85cf8f24f3e599af68ac25b15',
      'FK_81c52a8924cb7171ee4759f70cf',
    ],
    [
      'constraint',
      'certificate',
      'fileId',
      'file_id',
      'FK_fd8ba8683cc4732c9f069e3a453',
      'FK_677700ed018024d61d803e2d72f',
    ],
    [
      'constraint',
      'certificate',
      'courseId',
      'course_id',
      'FK_067bc1af8daea88b10772b8749f',
      'FK_5855acb3f0c9c7f287c7191cefa',
    ],
    [
      'constraint',
      'certificate',
      'studentId',
      'student_id',
      'FK_a5b1acee8501273d8c777df4bc1',
      'FK_404984efcaaa5afc0d2822a8e00',
    ],
    [
      'constraint',
      'certificate',
      'enrollmentId',
      'enrollment_id',
      'FK_f531d68488c762967073817d8be',
      'FK_a11a0623f33563e8f878875553a',
    ],
    [
      'constraint',
      'career_reflection_question',
      'courseId',
      'course_id',
      'FK_cb6c250732855797201c82c84e0',
      'FK_53eda9e13ef3084db11ae2b6da7',
    ],
    [
      'constraint',
      'career_reflection_answer',
      'questionId',
      'question_id',
      'FK_618305812b2306913e4cf7c0450',
      'FK_32b5a9a9b9c4b2c473b94933ac5',
    ],
    [
      'constraint',
      'career_reflection_answer',
      'enrollmentId',
      'enrollment_id',
      'FK_d294329d59937a423750abad8e0',
      'FK_db83c108a7ffaaafa4c6ae7644c',
    ],
  ];

  /** The generated name Postgres currently has for this column's object. */
  private async currentName(
    queryRunner: QueryRunner,
    kind: 'constraint' | 'index',
    table: string,
    column: string,
  ): Promise<string | undefined> {
    const rows: { name: string }[] = await queryRunner.query(
      kind === 'constraint'
        ? `SELECT con.conname AS name
             FROM pg_constraint con
             JOIN pg_class rel ON rel.oid = con.conrelid
             JOIN pg_attribute att ON att.attrelid = con.conrelid
                                  AND att.attnum = con.conkey[1]
            WHERE con.contype = 'f'
              AND array_length(con.conkey, 1) = 1
              AND rel.relnamespace = 'public'::regnamespace
              AND rel.relname = $1
              AND att.attname = $2
              AND con.conname ~ '^FK_[0-9a-f]{20,}$'`
        : `SELECT idx.relname AS name
             FROM pg_index ix
             JOIN pg_class tbl ON tbl.oid = ix.indrelid
             JOIN pg_class idx ON idx.oid = ix.indexrelid
             JOIN pg_attribute att ON att.attrelid = tbl.oid
                                  AND att.attnum = ANY (ix.indkey)
             LEFT JOIN pg_constraint con ON con.conname = idx.relname
            WHERE con.oid IS NULL
              AND NOT ix.indisunique
              AND array_length(ix.indkey::int[], 1) = 1
              AND tbl.relnamespace = 'public'::regnamespace
              AND tbl.relname = $1
              AND att.attname = $2
              AND idx.relname ~ '^IDX_[0-9a-f]{20,}$'`,
      [table, column],
    );

    return rows[0]?.name;
  }

  private async renameObjects(
    queryRunner: QueryRunner,
    direction: 'forward' | 'back',
  ): Promise<void> {
    for (const [
      kind,
      table,
      camelColumn,
      snakeColumn,
      nameBefore,
      nameAfter,
    ] of RenameColumnsToSnakeCase1787100000000.RENAMES) {
      // The columns have already been renamed by the time this runs, so look
      // the object up under the spelling in force for this direction.
      const column = direction === 'forward' ? snakeColumn : camelColumn;
      const target = direction === 'forward' ? nameAfter : nameBefore;
      const current = await this.currentName(queryRunner, kind, table, column);

      if (current === undefined || current === target) {
        continue;
      }

      await queryRunner.query(
        kind === 'constraint'
          ? `ALTER TABLE "${table}" RENAME CONSTRAINT "${current}" TO "${target}"`
          : `ALTER INDEX "${current}" RENAME TO "${target}"`,
      );
    }
  }

  /**
   * `course.search_vector` is a generated column, and TypeORM keeps its
   * expression in `typeorm_metadata` rather than reading it back from
   * Postgres. Postgres rewrites the column's real expression by itself when a
   * referenced column is renamed, but that metadata row is an opaque string it
   * knows nothing about — so it has to be rewritten here, together with the
   * `name` of the column it describes.
   *
   * Leaving it stale does not break a query; it breaks tooling. TypeORM
   * compares the row against `CourseEntity.searchVector`'s `asExpression`
   * character for character, so a mismatch makes every future
   * `migration:generate` emit a drop-and-recreate of the column and its GIN
   * index.
   */
  private async rewriteSearchVectorMetadata(
    queryRunner: QueryRunner,
    name: string,
    expression: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "typeorm_metadata"
          SET "name" = $1, "value" = $2
        WHERE "type" = 'GENERATED_COLUMN'
          AND "table" = 'course'`,
      [name, expression],
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [
      table,
      from,
      to,
    ] of RenameColumnsToSnakeCase1787100000000.COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`,
      );
    }

    await this.renameObjects(queryRunner, 'forward');

    await this.rewriteSearchVectorMetadata(
      queryRunner,
      'search_vector',
      SEARCH_VECTOR_EXPRESSION_SNAKE,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, from, to] of [
      ...RenameColumnsToSnakeCase1787100000000.COLUMNS,
    ].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "${to}" TO "${from}"`,
      );
    }

    await this.renameObjects(queryRunner, 'back');

    await this.rewriteSearchVectorMetadata(
      queryRunner,
      'searchVector',
      SEARCH_VECTOR_EXPRESSION_CAMEL,
    );
  }
}
