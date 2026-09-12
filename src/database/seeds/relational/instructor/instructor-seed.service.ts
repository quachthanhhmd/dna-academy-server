import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstructorEntity } from '../../../../instructors/infrastructure/persistence/relational/entities/instructor.entity';

/**
 * Epic 4.2 §4.2 — BUG-05.
 *
 * The imported MIT course was credited to `E4 Instructor 1788230375265`,
 * because that generated fixture row was the only instructor in the system.
 * The instructor block on the player and the overview therefore read as a
 * rendering bug rather than as missing content.
 *
 * These are deliberately, visibly placeholder people: the names say "Mẫu"
 * (sample) so nobody mistakes them for real staff, while the headlines, bios
 * and experience are realistic enough that the components render the way they
 * will in production. Replace them through the admin UI whenever the real
 * instructors are known — this seed only ever fills a gap, it never overwrites.
 */
export const SEEDED_INSTRUCTORS = [
  {
    slug: 'giang-vien-mau-a',
    fullName: 'Giảng viên Mẫu A',
    headline: 'Tiến sĩ Khoa học Dữ liệu',
    bio:
      '<p>Mười năm giảng dạy và nghiên cứu về khoa học dữ liệu, tập trung ' +
      'vào việc đưa thống kê ứng dụng đến với người mới bắt đầu.</p>',
    yearsOfExperience: 10,
    displayOrder: 1,
  },
  {
    slug: 'giang-vien-mau-b',
    fullName: 'Giảng viên Mẫu B',
    headline: 'Kỹ sư Phần mềm',
    bio:
      '<p>Xây dựng hệ thống backend quy mô lớn và hướng dẫn kỹ sư mới vào ' +
      'nghề trong tám năm qua.</p>',
    yearsOfExperience: 8,
    displayOrder: 2,
  },
  {
    slug: 'giang-vien-mau-c',
    fullName: 'Giảng viên Mẫu C',
    headline: 'Chuyên gia Hướng nghiệp',
    bio:
      '<p>Đồng hành cùng sinh viên trong quá trình chọn ngành và chuyển đổi ' +
      'nghề nghiệp, với trọng tâm là các ngành kỹ thuật.</p>',
    yearsOfExperience: 12,
    displayOrder: 3,
  },
];

@Injectable()
export class InstructorSeedService {
  private readonly logger = new Logger(InstructorSeedService.name);

  constructor(
    @InjectRepository(InstructorEntity)
    private readonly repository: Repository<InstructorEntity>,
  ) {}

  async run(): Promise<void> {
    for (const instructor of SEEDED_INSTRUCTORS) {
      // Keyed on the slug and never updated: a re-run must not overwrite an
      // instructor an admin has since edited, and must not orphan the
      // `course_instructor` rows pointing at it.
      const existing = await this.repository.count({
        where: { slug: instructor.slug },
      });

      if (existing) {
        continue;
      }

      await this.repository.save(
        this.repository.create({
          ...instructor,
          // No photo: the FE renders an initials avatar, which is honest about
          // these being placeholders. A stock face would not be.
          profilePictureUrl: null,
          isActive: true,
          totalCourses: 0,
          totalStudents: 0,
        }),
      );

      this.logger.log(`Seeded instructor ${instructor.fullName}`);
    }
  }
}
