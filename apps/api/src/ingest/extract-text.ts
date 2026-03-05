import fs from 'node:fs/promises';
import path from 'node:path';

import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

export type ParsedDocument = {
  title: string;
  sourceUrl: string;
  docType: string;
  rolesAllowed: string[];
  validFrom?: Date;
  validTo?: Date;
  body: string;
};

type Frontmatter = {
  title?: string;
  sourceUrl?: string;
  docType?: string;
  rolesAllowed?: string[];
  validFrom?: Date;
  validTo?: Date;
};

const parseDate = (value: string): Date | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseFrontmatter = (content: string): { frontmatter: Frontmatter; markdownBody: string } => {
  if (!content.startsWith('---\n')) {
    return { frontmatter: {}, markdownBody: content };
  }

  const separator = '\n---\n';
  const end = content.indexOf(separator, 4);
  if (end === -1) {
    return { frontmatter: {}, markdownBody: content };
  }

  const block = content.slice(4, end);
  const markdownBody = content.slice(end + separator.length);

  const frontmatter: Frontmatter = {};
  for (const line of block.split('\n')) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) {
      continue;
    }
    const key = rawKey.trim();
    const value = rest.join(':').trim();
    if (key === 'rolesAllowed') {
      frontmatter.rolesAllowed = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (key === 'validFrom') {
      frontmatter.validFrom = parseDate(value);
    } else if (key === 'validTo') {
      frontmatter.validTo = parseDate(value);
    } else if (key === 'title') {
      frontmatter.title = value;
    } else if (key === 'sourceUrl') {
      frontmatter.sourceUrl = value;
    } else if (key === 'docType') {
      frontmatter.docType = value;
    }
  }

  return { frontmatter, markdownBody };
};

const stripMarkdown = (content: string): string =>
  content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_>-]/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

const extractFromMarkdown = async (filePath: string): Promise<ParsedDocument> => {
  const raw = await fs.readFile(filePath, 'utf-8');
  const { frontmatter, markdownBody } = parseFrontmatter(raw);
  const title = frontmatter.title ?? path.basename(filePath, path.extname(filePath));
  return {
    title,
    sourceUrl: frontmatter.sourceUrl ?? `file://${filePath.replaceAll('\\', '/')}`,
    docType: frontmatter.docType ?? 'sop',
    rolesAllowed: frontmatter.rolesAllowed ?? ['finance', 'sales', 'support', 'admin'],
    validFrom: frontmatter.validFrom,
    validTo: frontmatter.validTo,
    body: stripMarkdown(markdownBody),
  };
};

const extractFromHtml = async (filePath: string): Promise<ParsedDocument> => {
  const raw = await fs.readFile(filePath, 'utf-8');
  const { frontmatter, markdownBody } = parseFrontmatter(raw);
  const $ = cheerio.load(markdownBody);
  const title = frontmatter.title ?? $('title').text().trim() || path.basename(filePath, path.extname(filePath));
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  return {
    title,
    sourceUrl: frontmatter.sourceUrl ?? `file://${filePath.replaceAll('\\', '/')}`,
    docType: frontmatter.docType ?? 'policy',
    rolesAllowed: frontmatter.rolesAllowed ?? ['finance', 'sales', 'support', 'admin'],
    validFrom: frontmatter.validFrom,
    validTo: frontmatter.validTo,
    body: text,
  };
};

const extractFromPdf = async (filePath: string): Promise<ParsedDocument> => {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);

  return {
    title: path.basename(filePath, path.extname(filePath)),
    sourceUrl: `file://${filePath.replaceAll('\\', '/')}`,
    docType: 'policy',
    rolesAllowed: ['finance', 'sales', 'support', 'admin'],
    body: parsed.text.replace(/\s+/g, ' ').trim(),
  };
};

export const extractDocument = async (filePath: string): Promise<ParsedDocument> => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.md' || extension === '.markdown') {
    return extractFromMarkdown(filePath);
  }
  if (extension === '.html' || extension === '.htm') {
    return extractFromHtml(filePath);
  }
  if (extension === '.pdf') {
    return extractFromPdf(filePath);
  }

  throw new Error(`Unsupported extension for ingestion: ${extension}`);
};

