export interface PhpStripResult {
  strippedHtml: string;
  phpMarkers: string[];
}

const PHP_BLOCK_RE = /<\?(?:php|=)?[\s\S]*?\?>/gi;

export function stripPhpBlocks(html: string): PhpStripResult {
  const phpMarkers: string[] = [];
  let markerIndex = 0;

  const strippedHtml = html.replace(PHP_BLOCK_RE, (block) => {
    markerIndex += 1;
    const marker = `<!--LS_PHP_BLOCK_${markerIndex}-->`;
    phpMarkers.push(marker);

    if (/\r?\n/.test(block)) {
      return `${marker}\n`;
    }

    return marker;
  });

  return { strippedHtml, phpMarkers };
}
