function chunkText(text, options = {}) {
  const { chunkSize = 1000, overlap = 200 } = options;

  if (!text || !text.trim()) return [];

  // Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();

    // If a single paragraph exceeds chunk size, split it by sentences
    if (trimmed.length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const sentences = splitSentences(trimmed);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > chunkSize && sentenceChunk) {
          chunks.push(sentenceChunk.trim());
          // Overlap: keep tail of previous chunk
          sentenceChunk = sentenceChunk.slice(-overlap) + ' ' + sentence;
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
        }
      }
      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
      continue;
    }

    if (currentChunk.length + trimmed.length + 1 > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: keep tail of previous chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+\s*/g) || [text];
}

module.exports = { chunkText };
