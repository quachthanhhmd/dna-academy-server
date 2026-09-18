import { describe, expect, it, beforeEach } from '@jest/globals';
import { CsvService } from './csv.service';
import { Table } from './export-dataset.service';

const table = (rows: Record<string, unknown>[]): Table => ({
  key: 't',
  title: 'T',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'count', label: 'Count' },
  ],
  rows,
});

/** Epic 7 BE-6. */
describe('CsvService', () => {
  let service: CsvService;

  beforeEach(() => {
    service = new CsvService();
  });

  it('should start with a UTF-8 BOM so Excel does not read it as Windows-1252', () => {
    const csv = service.render(table([]));

    expect(Buffer.from(csv, 'utf8').subarray(0, 3)).toEqual(
      Buffer.from([0xef, 0xbb, 0xbf]),
    );
  });

  it('should keep Vietnamese diacritics intact', () => {
    const csv = service.render(table([{ name: 'Nguyễn Thị Hường', count: 1 }]));

    expect(csv).toContain('Nguyễn Thị Hường');
  });

  it('should use CRLF line endings', () => {
    const csv = service.render(table([{ name: 'a', count: 1 }]));

    expect(csv).toContain('Name,Count\r\n');
  });

  it('should quote a field containing a comma', () => {
    const csv = service.render(table([{ name: 'Toán, ứng dụng', count: 1 }]));

    expect(csv).toContain('"Toán, ứng dụng"');
  });

  it('should double an embedded quote', () => {
    const csv = service.render(table([{ name: 'He said "hi"', count: 1 }]));

    expect(csv).toContain('"He said ""hi"""');
  });

  it('should quote a field containing a newline', () => {
    const csv = service.render(
      table([{ name: 'line one\nline two', count: 1 }]),
    );

    expect(csv).toContain('"line one\nline two"');
  });

  it('should render null as empty rather than the text "null"', () => {
    const csv = service.render(table([{ name: null, count: null }]));

    expect(csv).toContain('\r\n,\r\n');
    expect(csv).not.toContain('null');
  });

  it('should not turn a null into a zero', () => {
    const csv = service.render(table([{ name: 'x', count: null }]));

    expect(csv).toContain('x,\r\n');
    expect(csv).not.toContain('x,0');
  });

  it('should write dates as ISO instants', () => {
    const csv = service.render(
      table([{ name: 'x', count: new Date('2026-03-04T03:00:00Z') }]),
    );

    expect(csv).toContain('2026-03-04T03:00:00.000Z');
  });

  it('should emit only a header when there are no rows', () => {
    const csv = service.render(table([]));

    expect(csv.replace('﻿', '')).toBe('Name,Count\r\n');
  });
});
