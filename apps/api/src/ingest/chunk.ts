export type SectionChunk = {
  heading: string;
  content: string;
  tokenCount: number;
};

const estimateTokens = (text: string): number => Math.max(1, Math.round(text.split(/\s+/).length * 1.3));

const splitBySentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

const splitOversizedChunk = (
  heading: string,
  content: string,
  targetMin = 300,
  targetMax = 800,
): SectionChunk[] => {
  const sentences = splitBySentences(content);
  const chunks: SectionChunk[] = [];
  let acc: string[] = [];
  let tokenAcc = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    if (tokenAcc + sentenceTokens > targetMax && acc.length > 0) {
      chunks.push({
        heading,
        content: acc.join(' ').trim(),
        tokenCount: tokenAcc,
      });
      acc = [];
      tokenAcc = 0;
    }

    acc.push(sentence);
    tokenAcc += sentenceTokens;
  }

  if (acc.length > 0) {
    chunks.push({
      heading,
      content: acc.join(' ').trim(),
      tokenCount: tokenAcc,
    });
  }

  if (chunks.length > 1) {
    return chunks.map((chunk, index) => ({
      heading: `${heading} (parte ${index + 1})`,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
    }));
  }

  const firstChunk = chunks[0];
  if (chunks.length === 1 && firstChunk && firstChunk.tokenCount < targetMin) {
    return [
      {
        heading,
        content: firstChunk.content,
        tokenCount: estimateTokens(firstChunk.content),
      },
    ];
  }

  return chunks;
};

export const chunkByHeadings = (inputText: string, targetMin = 300, targetMax = 800): SectionChunk[] => {
  const lines = inputText.split('\n');
  const sections: Array<{ heading: string; body: string[] }> = [];
  let currentHeading = 'General';
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody });
      }
      currentHeading = (headingMatch[2] ?? 'General').trim();
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody });
  }

  const chunks: SectionChunk[] = [];
  for (const section of sections) {
    const sectionText = section.body.join(' ').replace(/\s+/g, ' ').trim();
    if (!sectionText) {
      continue;
    }
    const tokenCount = estimateTokens(sectionText);
    if (tokenCount >= targetMin && tokenCount <= targetMax) {
      chunks.push({
        heading: section.heading,
        content: sectionText,
        tokenCount,
      });
    } else {
      chunks.push(...splitOversizedChunk(section.heading, sectionText, targetMin, targetMax));
    }
  }

  const filtered = chunks.filter((chunk) => chunk.content.length > 30);
  const merged: SectionChunk[] = [];
  let buffer: SectionChunk | null = null;

  for (const chunk of filtered) {
    if (!buffer) {
      buffer = { ...chunk };
      continue;
    }

    if (buffer.tokenCount < targetMin) {
      buffer = {
        heading: `${buffer.heading} + ${chunk.heading}`,
        content: `${buffer.content} ${chunk.content}`.trim(),
        tokenCount: buffer.tokenCount + chunk.tokenCount,
      };

      if (buffer.tokenCount <= targetMax) {
        continue;
      }
    }

    merged.push(buffer);
    buffer = { ...chunk };
  }

  if (buffer) {
    if (buffer.tokenCount < targetMin && merged.length > 0) {
      const previous = merged[merged.length - 1];
      if (previous) {
        merged[merged.length - 1] = {
          heading: `${previous.heading} + ${buffer.heading}`,
          content: `${previous.content} ${buffer.content}`.trim(),
          tokenCount: previous.tokenCount + buffer.tokenCount,
        };
      } else {
        merged.push(buffer);
      }
    } else {
      merged.push(buffer);
    }
  }

  return merged;
};
