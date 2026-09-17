import { Injectable } from '@nestjs/common';
import { Table } from './export-dataset.service';

/**
 * Excel on Windows reads a BOM-less UTF-8 file as Windows-1252, which turns
 * every Vietnamese name into mojibake. Three bytes, and without them the
 * export is unusable for the audience most likely to open it (BE-6).
 */
const BOM = '﻿';

@Injectable()
export class CsvService {
  /**
   * RFC 4180. A field is quoted whenever it contains a delimiter, a quote or a
   * newline, and an embedded quote is doubled.
   *
   * CRLF line endings, again for Excel.
   */
  render(table: Table): string {
    const header = table.columns.map((c) => CsvService.escape(c.label));
    const rows = table.rows.map((row) =>
      table.columns.map((c) =>
        CsvService.escape(CsvService.format(row[c.key])),
      ),
    );

    return (
      BOM +
      [header, ...rows].map((cells) => cells.join(',')).join('\r\n') +
      '\r\n'
    );
  }

  /** A null renders empty, never as the string "null" or as 0 (§1.3). */
  private static format(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  }

  private static escape(value: string): string {
    if (!/[",\r\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }
}
