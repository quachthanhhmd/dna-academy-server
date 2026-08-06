import { MigrationInterface, QueryRunner } from 'typeorm';

export class DnaAcademySchema1786004882103 implements MigrationInterface {
  name = 'DnaAcademySchema1786004882103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_role" ("assignedAt" TIMESTAMP NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "assignedById" integer, "roleId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_fb2e442d14add3cefbdf33c4561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "master_data_group" ("displayOrder" integer NOT NULL, "isActive" boolean NOT NULL, "description" character varying, "name" character varying NOT NULL, "groupKey" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, CONSTRAINT "PK_862d425410387614fe3d65fe0c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "master_data_code" ("displayOrder" integer NOT NULL, "isActive" boolean NOT NULL, "thumbnailUrl" character varying, "description" character varying, "name" character varying NOT NULL, "code" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "groupId" uuid NOT NULL, CONSTRAINT "PK_0f845c9f5e0ce51efddc7023a77" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "educationStageCodeId" uuid, "userId" integer NOT NULL, CONSTRAINT "REL_940639e2ce4b06e9857bbef0c9" UNIQUE ("userId"), CONSTRAINT "PK_48e055651592504b63f3910d204" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_career_interest" ("customInterest" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "careerInterestId" uuid NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_527f466f0232a5bf50539d1d5d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course" ("publishedAt" TIMESTAMP, "avgRating" integer, "totalEnrollments" integer NOT NULL, "totalDurationSecs" integer NOT NULL, "totalLectures" integer NOT NULL, "totalSections" integer NOT NULL, "status" character varying NOT NULL, "enrollmentOpen" boolean NOT NULL, "hasCertificate" boolean NOT NULL, "isFree" boolean NOT NULL, "price" integer NOT NULL, "language" character varying NOT NULL, "introVideoUrl" character varying, "thumbnailUrl" character varying, "fullDescription" character varying, "shortDescription" character varying, "title" character varying NOT NULL, "slug" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "publishedById" integer, "instructorId" integer, "categoryId" uuid, "levelId" uuid, CONSTRAINT "PK_bf95180dd756fd204fb01ce4916" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "section" ("displayOrder" integer NOT NULL, "learningObjective" character varying, "description" character varying, "title" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, CONSTRAINT "PK_3c41d2d699384cc5e8eac54777d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "module" ("label" character varying, "name" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0e20d657f968b051e674fbe3117" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "permission" ("label" character varying, "action" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "moduleId" uuid NOT NULL, CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "permissionId" uuid NOT NULL, "roleId" integer NOT NULL, CONSTRAINT "PK_96c8f1fd25538d3692024115b47" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture" ("status" character varying NOT NULL, "displayOrder" integer NOT NULL, "requiresCompletion" boolean NOT NULL, "isPreview" boolean NOT NULL, "durationSecs" integer NOT NULL, "lectureType" character varying NOT NULL, "description" character varying, "title" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "sectionId" uuid NOT NULL, CONSTRAINT "PK_2abef7c1e52b7b58a9f905c9643" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reflection_question" ("displayOrder" integer NOT NULL, "questionText" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "PK_fb56fac1ac2bcf1d2a1af957d59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "enrollment" ("lastAccessedAt" TIMESTAMP, "progressPct" integer NOT NULL, "completedAt" TIMESTAMP, "startedAt" TIMESTAMP, "enrollmentSource" character varying, "enrollmentDate" TIMESTAMP NOT NULL, "status" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastLectureId" uuid, "courseId" uuid NOT NULL, "studentId" integer NOT NULL, CONSTRAINT "PK_7e200c699fa93865cdcdd025885" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reflection_response" ("submittedAt" TIMESTAMP NOT NULL, "responseText" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "questionId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "PK_eab8a9121b2958f58dffe5cc274" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_save" ("savedAt" TIMESTAMP NOT NULL, "answersJson" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "PK_47697f982eb300903bc0b8d5a24" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_question" ("displayOrder" integer NOT NULL, "maxFileSizeMb" integer, "allowedMimeTypes" character varying, "minWordCount" integer, "ratingLabelMax" character varying, "ratingLabelMin" character varying, "ratingMax" integer, "ratingMin" integer, "isRequired" boolean NOT NULL, "questionType" character varying NOT NULL, "questionText" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "PK_0bab74c2a71b9b3f8a941104083" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_attempt" ("submittedAt" TIMESTAMP, "passed" boolean, "score" integer, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "PK_9a6c33ec08b4bcb74ca27701a94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "media_file" ("status" character varying NOT NULL, "sizeBytes" integer, "mimeType" character varying, "fileName" character varying, "objectKey" character varying NOT NULL, "bucket" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "uploadedById" integer, CONSTRAINT "PK_cac82b29eea888470cc40043b76" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_answer_option" ("displayOrder" integer NOT NULL, "isCorrect" boolean NOT NULL, "optionText" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "questionId" uuid NOT NULL, CONSTRAINT "PK_822a5fd0aea75d5ae59c6a2383e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_attempt_answer" ("gradedAt" TIMESTAMP, "score" integer, "isCorrect" boolean, "ratingAnswer" integer, "textAnswer" character varying, "selectedOptionIds" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "gradedById" integer, "fileId" uuid, "selectedOptionId" uuid, "questionId" uuid NOT NULL, "attemptId" uuid NOT NULL, CONSTRAINT "PK_f69f832c759a492853b854ff85c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_account" ("tokenExpiresAt" TIMESTAMP, "refreshToken" character varying, "accessToken" character varying, "providerUid" character varying NOT NULL, "provider" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_01ec7d2a8273dcaaed3dd10a4fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_progress" ("watchDurationSecs" integer NOT NULL, "completedAt" TIMESTAMP, "startedAt" TIMESTAMP, "status" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "PK_95a6266aedf0fb6ea54f2c0400a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_content_video" ("youtubeVideoId" character varying, "youtubeUrl" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "REL_fb08c432cbebe06403390b5398" UNIQUE ("lectureId"), CONSTRAINT "PK_3e7646766fe1569ee226b0e1369" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_content_reflection" ("minResponseLength" integer NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "REL_21cb04ef6cdf8e4eacf0498dff" UNIQUE ("lectureId"), CONSTRAINT "PK_a574ffd8ed4a40b8a6a035350d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_content_quiz" ("allowResume" boolean NOT NULL, "passingScore" integer NOT NULL, "instructions" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "REL_8778326df4349471b3c0959fa5" UNIQUE ("lectureId"), CONSTRAINT "PK_56ac67470c6770adadc33448432" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_content_document" ("isDownloadable" boolean NOT NULL, "fileName" character varying, "fileUrl" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "REL_554315946cedc03462f871a10c" UNIQUE ("lectureId"), CONSTRAINT "PK_62db613117b7819b498bdff5079" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_content_article" ("body" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lectureId" uuid NOT NULL, CONSTRAINT "REL_58c179095ab6754527baf93ffd" UNIQUE ("lectureId"), CONSTRAINT "PK_0fb6c6eb6b9efc419e3da264c74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_target_learner" ("displayOrder" integer NOT NULL, "description" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, CONSTRAINT "PK_aa3ee4cb846261bb7bcd94a1edb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_requirement" ("displayOrder" integer NOT NULL, "description" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, CONSTRAINT "PK_3e6004ede72d7cc1d174bc7a829" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_rating" ("submittedAt" TIMESTAMP NOT NULL, "reviewStatus" character varying NOT NULL, "reviewText" character varying, "rating" integer NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, "studentId" integer NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "REL_048dc1bd439ad739f28f68d6f4" UNIQUE ("enrollmentId"), CONSTRAINT "PK_572d8c6598842f8b6cbde2e1aa5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_learning_outcome" ("displayOrder" integer NOT NULL, "description" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, CONSTRAINT "PK_16f8b942e859a66eb91956d47b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_group_assignment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "groupId" uuid NOT NULL, "courseId" uuid NOT NULL, CONSTRAINT "PK_39de85e585905c2da5d0c26e556" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "certificate" ("issuedAt" TIMESTAMP NOT NULL, "completionDate" TIMESTAMP NOT NULL, "courseTitleSnapshot" character varying NOT NULL, "studentNameSnapshot" character varying NOT NULL, "certificateNumber" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fileId" uuid, "courseId" uuid NOT NULL, "studentId" integer NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "REL_f531d68488c762967073817d8b" UNIQUE ("enrollmentId"), CONSTRAINT "PK_8daddfc65f59e341c2bbc9c9e43" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "career_reflection_question" ("isActive" boolean NOT NULL, "displayOrder" integer NOT NULL, "questionText" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid, CONSTRAINT "PK_3b586d6d7b7c48ed3697b56afa0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "career_reflection_answer" ("submittedAt" TIMESTAMP NOT NULL, "textAnswer" character varying, "ratingAnswer" integer, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "questionId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, CONSTRAINT "PK_cd515edf70d3a64ad3e443fafdd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "onboardingDone" boolean NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "age" integer`);
    await queryRunner.query(`ALTER TABLE "user" ADD "dateOfBirth" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "profilePictureUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailVerified" boolean NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "fullName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" ADD CONSTRAINT "FK_f6883010496756ea3e2d980429d" FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" ADD CONSTRAINT "FK_dba55ed826ef26b5b22bd39409b" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" ADD CONSTRAINT "FK_ab40a6f0cd7d3ebfcce082131fd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "master_data_group" ADD CONSTRAINT "FK_55c90fe105fedc35ea2a0e7a86a" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "master_data_code" ADD CONSTRAINT "FK_ad52f1da9c358131efe173f154e" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "master_data_code" ADD CONSTRAINT "FK_a7e5dd1f9fb4315787d7dabd2ca" FOREIGN KEY ("groupId") REFERENCES "master_data_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profile" ADD CONSTRAINT "FK_0752cdd13d22bf0550ff568e2c3" FOREIGN KEY ("educationStageCodeId") REFERENCES "master_data_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profile" ADD CONSTRAINT "FK_940639e2ce4b06e9857bbef0c90" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_career_interest" ADD CONSTRAINT "FK_a4566cb104a88b143ac04af4e5e" FOREIGN KEY ("careerInterestId") REFERENCES "master_data_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_career_interest" ADD CONSTRAINT "FK_8992f7e06206a58533e4409b0b8" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_2481291d5c97aaff5cf3ce5359c" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_9f34520df18045e70119da8a09a" FOREIGN KEY ("publishedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_32d94af473bb59d808d9a68e17b" FOREIGN KEY ("instructorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_c6c48d73b3b32e47e9cc1cfc4c4" FOREIGN KEY ("categoryId") REFERENCES "master_data_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_9679d37e8ce033b56d27e271609" FOREIGN KEY ("levelId") REFERENCES "master_data_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "section" ADD CONSTRAINT "FK_c61e35b7deed3caab17e821144a" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_18f3ac6d3f1e3e6b5e3f8123289" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_72e80be86cab0e93e67ed1a7a9a" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_e3130a39c1e4a740d044e685730" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture" ADD CONSTRAINT "FK_3fe04dfc836b1abfdef34580941" FOREIGN KEY ("sectionId") REFERENCES "section"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reflection_question" ADD CONSTRAINT "FK_a8b85b29a618feed82711e754e4" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" ADD CONSTRAINT "FK_692519768173f3b478890d0decb" FOREIGN KEY ("lastLectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" ADD CONSTRAINT "FK_d1a599a7740b4f4bd1120850f04" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" ADD CONSTRAINT "FK_5ce702e71b98cc1bb37b81e83d8" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reflection_response" ADD CONSTRAINT "FK_5a0d1498c0458c25da2d1cea390" FOREIGN KEY ("questionId") REFERENCES "reflection_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reflection_response" ADD CONSTRAINT "FK_69151d55c89ab863b0162bc2167" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_save" ADD CONSTRAINT "FK_0a89e93bc6c2816760280b8e075" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_save" ADD CONSTRAINT "FK_9ffb52340bb693cf4dcefec9879" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_question" ADD CONSTRAINT "FK_845213123415fe595ee4431862e" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD CONSTRAINT "FK_78d676fa5355a413bf049a7104b" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD CONSTRAINT "FK_b0f8065b63263170d9bc39f01aa" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_file" ADD CONSTRAINT "FK_da069aecdbca0994ddc2bb13f1e" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_answer_option" ADD CONSTRAINT "FK_eb0d53e906c47eb0956041fee4e" FOREIGN KEY ("questionId") REFERENCES "quiz_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" ADD CONSTRAINT "FK_4b2f6742d3f9edc943379f47a0e" FOREIGN KEY ("gradedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" ADD CONSTRAINT "FK_0152ffa686cd548156ec88b5bef" FOREIGN KEY ("fileId") REFERENCES "media_file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" ADD CONSTRAINT "FK_af6bdb5ddc4bd9a7f9c208cf774" FOREIGN KEY ("selectedOptionId") REFERENCES "quiz_answer_option"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" ADD CONSTRAINT "FK_193ab38af6b3cc2d455c401b8ed" FOREIGN KEY ("questionId") REFERENCES "quiz_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" ADD CONSTRAINT "FK_2f5419e41bd6924de82867cfc3a" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempt"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_account" ADD CONSTRAINT "FK_a9124d5956d6244b17bdd67f92b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_progress" ADD CONSTRAINT "FK_85811dd926b0ac79fc24aa8c05d" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_progress" ADD CONSTRAINT "FK_1632433ea7e758949973aa44779" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_video" ADD CONSTRAINT "FK_fb08c432cbebe06403390b5398e" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_reflection" ADD CONSTRAINT "FK_21cb04ef6cdf8e4eacf0498dfff" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" ADD CONSTRAINT "FK_8778326df4349471b3c0959fa55" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" ADD CONSTRAINT "FK_554315946cedc03462f871a10c0" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_article" ADD CONSTRAINT "FK_58c179095ab6754527baf93ffd6" FOREIGN KEY ("lectureId") REFERENCES "lecture"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_target_learner" ADD CONSTRAINT "FK_08ef18d1435c391e76a52629836" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_requirement" ADD CONSTRAINT "FK_2e113498f0df628e679827a2a61" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" ADD CONSTRAINT "FK_a3d4d5506ab43943558e8618206" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" ADD CONSTRAINT "FK_7e2c4436f6257f147eb56469fc8" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" ADD CONSTRAINT "FK_048dc1bd439ad739f28f68d6f41" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_learning_outcome" ADD CONSTRAINT "FK_a318741db7c08968d85b91b623d" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_group_assignment" ADD CONSTRAINT "FK_a2625431566e64d78a684fd762e" FOREIGN KEY ("groupId") REFERENCES "master_data_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_group_assignment" ADD CONSTRAINT "FK_cc85cf8f24f3e599af68ac25b15" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_fd8ba8683cc4732c9f069e3a453" FOREIGN KEY ("fileId") REFERENCES "media_file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_067bc1af8daea88b10772b8749f" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_a5b1acee8501273d8c777df4bc1" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_f531d68488c762967073817d8be" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question" ADD CONSTRAINT "FK_cb6c250732855797201c82c84e0" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_answer" ADD CONSTRAINT "FK_618305812b2306913e4cf7c0450" FOREIGN KEY ("questionId") REFERENCES "career_reflection_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_answer" ADD CONSTRAINT "FK_d294329d59937a423750abad8e0" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "career_reflection_answer" DROP CONSTRAINT "FK_d294329d59937a423750abad8e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_answer" DROP CONSTRAINT "FK_618305812b2306913e4cf7c0450"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question" DROP CONSTRAINT "FK_cb6c250732855797201c82c84e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "FK_f531d68488c762967073817d8be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "FK_a5b1acee8501273d8c777df4bc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "FK_067bc1af8daea88b10772b8749f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "FK_fd8ba8683cc4732c9f069e3a453"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_group_assignment" DROP CONSTRAINT "FK_cc85cf8f24f3e599af68ac25b15"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_group_assignment" DROP CONSTRAINT "FK_a2625431566e64d78a684fd762e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_learning_outcome" DROP CONSTRAINT "FK_a318741db7c08968d85b91b623d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" DROP CONSTRAINT "FK_048dc1bd439ad739f28f68d6f41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" DROP CONSTRAINT "FK_7e2c4436f6257f147eb56469fc8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" DROP CONSTRAINT "FK_a3d4d5506ab43943558e8618206"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_requirement" DROP CONSTRAINT "FK_2e113498f0df628e679827a2a61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_target_learner" DROP CONSTRAINT "FK_08ef18d1435c391e76a52629836"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_article" DROP CONSTRAINT "FK_58c179095ab6754527baf93ffd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" DROP CONSTRAINT "FK_554315946cedc03462f871a10c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" DROP CONSTRAINT "FK_8778326df4349471b3c0959fa55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_reflection" DROP CONSTRAINT "FK_21cb04ef6cdf8e4eacf0498dfff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_video" DROP CONSTRAINT "FK_fb08c432cbebe06403390b5398e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_progress" DROP CONSTRAINT "FK_1632433ea7e758949973aa44779"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_progress" DROP CONSTRAINT "FK_85811dd926b0ac79fc24aa8c05d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_account" DROP CONSTRAINT "FK_a9124d5956d6244b17bdd67f92b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" DROP CONSTRAINT "FK_2f5419e41bd6924de82867cfc3a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" DROP CONSTRAINT "FK_193ab38af6b3cc2d455c401b8ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" DROP CONSTRAINT "FK_af6bdb5ddc4bd9a7f9c208cf774"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" DROP CONSTRAINT "FK_0152ffa686cd548156ec88b5bef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt_answer" DROP CONSTRAINT "FK_4b2f6742d3f9edc943379f47a0e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_answer_option" DROP CONSTRAINT "FK_eb0d53e906c47eb0956041fee4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_file" DROP CONSTRAINT "FK_da069aecdbca0994ddc2bb13f1e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" DROP CONSTRAINT "FK_b0f8065b63263170d9bc39f01aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" DROP CONSTRAINT "FK_78d676fa5355a413bf049a7104b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_question" DROP CONSTRAINT "FK_845213123415fe595ee4431862e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_save" DROP CONSTRAINT "FK_9ffb52340bb693cf4dcefec9879"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_save" DROP CONSTRAINT "FK_0a89e93bc6c2816760280b8e075"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reflection_response" DROP CONSTRAINT "FK_69151d55c89ab863b0162bc2167"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reflection_response" DROP CONSTRAINT "FK_5a0d1498c0458c25da2d1cea390"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" DROP CONSTRAINT "FK_5ce702e71b98cc1bb37b81e83d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" DROP CONSTRAINT "FK_d1a599a7740b4f4bd1120850f04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" DROP CONSTRAINT "FK_692519768173f3b478890d0decb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reflection_question" DROP CONSTRAINT "FK_a8b85b29a618feed82711e754e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture" DROP CONSTRAINT "FK_3fe04dfc836b1abfdef34580941"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_e3130a39c1e4a740d044e685730"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_72e80be86cab0e93e67ed1a7a9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_18f3ac6d3f1e3e6b5e3f8123289"`,
    );
    await queryRunner.query(
      `ALTER TABLE "section" DROP CONSTRAINT "FK_c61e35b7deed3caab17e821144a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_9679d37e8ce033b56d27e271609"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_c6c48d73b3b32e47e9cc1cfc4c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_32d94af473bb59d808d9a68e17b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_9f34520df18045e70119da8a09a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_2481291d5c97aaff5cf3ce5359c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_career_interest" DROP CONSTRAINT "FK_8992f7e06206a58533e4409b0b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_career_interest" DROP CONSTRAINT "FK_a4566cb104a88b143ac04af4e5e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profile" DROP CONSTRAINT "FK_940639e2ce4b06e9857bbef0c90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profile" DROP CONSTRAINT "FK_0752cdd13d22bf0550ff568e2c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "master_data_code" DROP CONSTRAINT "FK_a7e5dd1f9fb4315787d7dabd2ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "master_data_code" DROP CONSTRAINT "FK_ad52f1da9c358131efe173f154e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "master_data_group" DROP CONSTRAINT "FK_55c90fe105fedc35ea2a0e7a86a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" DROP CONSTRAINT "FK_ab40a6f0cd7d3ebfcce082131fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" DROP CONSTRAINT "FK_dba55ed826ef26b5b22bd39409b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role" DROP CONSTRAINT "FK_f6883010496756ea3e2d980429d"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "fullName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "emailVerified"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "profilePictureUrl"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dateOfBirth"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "age"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "onboardingDone"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "description"`);
    await queryRunner.query(`DROP TABLE "career_reflection_answer"`);
    await queryRunner.query(`DROP TABLE "career_reflection_question"`);
    await queryRunner.query(`DROP TABLE "certificate"`);
    await queryRunner.query(`DROP TABLE "course_group_assignment"`);
    await queryRunner.query(`DROP TABLE "course_learning_outcome"`);
    await queryRunner.query(`DROP TABLE "course_rating"`);
    await queryRunner.query(`DROP TABLE "course_requirement"`);
    await queryRunner.query(`DROP TABLE "course_target_learner"`);
    await queryRunner.query(`DROP TABLE "lecture_content_article"`);
    await queryRunner.query(`DROP TABLE "lecture_content_document"`);
    await queryRunner.query(`DROP TABLE "lecture_content_quiz"`);
    await queryRunner.query(`DROP TABLE "lecture_content_reflection"`);
    await queryRunner.query(`DROP TABLE "lecture_content_video"`);
    await queryRunner.query(`DROP TABLE "lecture_progress"`);
    await queryRunner.query(`DROP TABLE "oauth_account"`);
    await queryRunner.query(`DROP TABLE "quiz_attempt_answer"`);
    await queryRunner.query(`DROP TABLE "quiz_answer_option"`);
    await queryRunner.query(`DROP TABLE "media_file"`);
    await queryRunner.query(`DROP TABLE "quiz_attempt"`);
    await queryRunner.query(`DROP TABLE "quiz_question"`);
    await queryRunner.query(`DROP TABLE "quiz_save"`);
    await queryRunner.query(`DROP TABLE "reflection_response"`);
    await queryRunner.query(`DROP TABLE "enrollment"`);
    await queryRunner.query(`DROP TABLE "reflection_question"`);
    await queryRunner.query(`DROP TABLE "lecture"`);
    await queryRunner.query(`DROP TABLE "role_permission"`);
    await queryRunner.query(`DROP TABLE "permission"`);
    await queryRunner.query(`DROP TABLE "module"`);
    await queryRunner.query(`DROP TABLE "section"`);
    await queryRunner.query(`DROP TABLE "course"`);
    await queryRunner.query(`DROP TABLE "student_career_interest"`);
    await queryRunner.query(`DROP TABLE "student_profile"`);
    await queryRunner.query(`DROP TABLE "master_data_code"`);
    await queryRunner.query(`DROP TABLE "master_data_group"`);
    await queryRunner.query(`DROP TABLE "user_role"`);
  }
}
