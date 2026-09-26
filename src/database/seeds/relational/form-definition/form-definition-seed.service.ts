import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormDefinitionEntity } from '../../../../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';
import { FormQuestionEntity } from '../../../../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormQuestionOptionEntity } from '../../../../form-question-option/infrastructure/persistence/relational/entities/form-question-option.entity';
import { mergeSeedTranslations } from '../shared/merge-seed-translations';
import { FORM_DEFINITIONS } from './form-definition-seed.data';

/**
 * Seeds the three EPIC-08 forms (spec §3.4). Idempotent on every level so a
 * boot after a content edit updates the row it already has rather than
 * duplicating it:
 *
 *  - definition by `code`
 *  - question by `(form_definition_id, code)` — the unique index the migration
 *    already declares
 *  - allowlist by `(question_id, option_code)`
 *
 * Labels merge additively (`mergeSeedTranslations`), so an admin's rename
 * survives the next boot. Questions are never deleted: a form version is
 * content, and a submission's answer references the question row by id, so
 * removing one would orphan history. Retiring a question is `display_order`
 * and a new form `version`, not a delete.
 */
@Injectable()
export class FormDefinitionSeedService {
  constructor(
    @InjectRepository(FormDefinitionEntity)
    private readonly definitions: Repository<FormDefinitionEntity>,
    @InjectRepository(FormQuestionEntity)
    private readonly questions: Repository<FormQuestionEntity>,
    @InjectRepository(FormQuestionOptionEntity)
    private readonly options: Repository<FormQuestionOptionEntity>,
  ) {}

  async run(): Promise<void> {
    for (const form of FORM_DEFINITIONS) {
      const definition = await this.upsertDefinition(form.code, form);
      const existingQuestions = await this.questions.find({
        where: { formDefinition: { id: definition.id } },
        relations: ['parentQuestion'],
      });
      const byCode = new Map(existingQuestions.map((q) => [q.code, q]));

      // Two passes: questions first (so a child can point at its parent's id),
      // then the allowlists that need those ids.
      for (const question of form.questions) {
        const parent = question.parentQuestionCode
          ? byCode.get(question.parentQuestionCode)
          : undefined;
        const saved = await this.upsertQuestion(
          definition,
          question,
          parent,
          byCode.get(question.code),
        );
        byCode.set(question.code, saved);
      }

      for (const question of form.questions) {
        const saved = byCode.get(question.code);
        if (!saved || !question.options?.length) continue;
        await this.upsertOptions(saved, question.options);
      }
    }
  }

  private async upsertDefinition(
    code: string,
    form: (typeof FORM_DEFINITIONS)[number],
  ): Promise<FormDefinitionEntity> {
    const existing = await this.definitions.findOne({ where: { code } });

    if (!existing) {
      return this.definitions.save(
        this.definitions.create({
          code,
          nameTranslations: form.nameTranslations,
          descriptionTranslations: form.descriptionTranslations ?? null,
          version: 1,
          isActive: true,
        }),
      );
    }

    existing.nameTranslations = mergeSeedTranslations(
      existing.nameTranslations,
      form.nameTranslations,
    );
    if (form.descriptionTranslations) {
      existing.descriptionTranslations = mergeSeedTranslations(
        existing.descriptionTranslations,
        form.descriptionTranslations,
      );
    }
    existing.isActive = true;

    return this.definitions.save(existing);
  }

  private async upsertQuestion(
    definition: FormDefinitionEntity,
    question: (typeof FORM_DEFINITIONS)[number]['questions'][number],
    parent: FormQuestionEntity | undefined,
    existing: FormQuestionEntity | undefined,
  ): Promise<FormQuestionEntity> {
    const payload: Partial<FormQuestionEntity> = {
      formDefinition: definition,
      code: question.code,
      sectionCode: question.sectionCode,
      questionType: question.questionType,
      masterDataGroupKey: question.masterDataGroupKey ?? null,
      isRequired: question.isRequired,
      displayOrder: question.displayOrder,
      minLength: question.minLength ?? null,
      maxLength: question.maxLength ?? null,
      allowOther: question.allowOther ?? false,
      consentCode: question.consentCode ?? null,
      parentQuestion: parent,
      parentOptionCode: question.parentOptionCode ?? null,
    };

    if (!existing) {
      return this.questions.save(
        this.questions.create({
          ...payload,
          labelTranslations: question.labelTranslations,
          placeholderTranslations: question.placeholderTranslations ?? null,
          helperTranslations: question.helperTranslations ?? null,
        }),
      );
    }

    Object.assign(existing, payload, {
      labelTranslations: mergeSeedTranslations(
        existing.labelTranslations,
        question.labelTranslations,
      ),
      placeholderTranslations: question.placeholderTranslations
        ? mergeSeedTranslations(
            existing.placeholderTranslations,
            question.placeholderTranslations,
          )
        : existing.placeholderTranslations,
      helperTranslations: question.helperTranslations
        ? mergeSeedTranslations(
            existing.helperTranslations,
            question.helperTranslations,
          )
        : existing.helperTranslations,
    });

    return this.questions.save(existing);
  }

  private async upsertOptions(
    question: FormQuestionEntity,
    codes: string[],
  ): Promise<void> {
    const existing = await this.options.find({
      where: { question: { id: question.id } },
    });
    const have = new Set(existing.map((row) => row.optionCode));

    for (const [index, optionCode] of codes.entries()) {
      const row = existing.find((r) => r.optionCode === optionCode);
      if (row) {
        if (row.displayOrder !== index + 1) {
          row.displayOrder = index + 1;
          await this.options.save(row);
        }
        continue;
      }

      if (have.has(optionCode)) continue;
      await this.options.save(
        this.options.create({
          question: { id: question.id } as FormQuestionEntity,
          optionCode,
          displayOrder: index + 1,
        }),
      );
    }
  }
}
