const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'docs/qa/QA landsphera.md');
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

const sections = [
  { name: 'P1.1-decompose-editor-shell.md', start: null, end: null },
  { name: 'P1.2-autosave-dirty-flag.md', start: null, end: null },
  { name: 'P1.3-grapesjon-types.md', start: null, end: null },
  { name: 'P1.4-optimize-list-query.md', start: null, end: null },
  { name: 'P1.5-ci-standardization.md', start: null, end: null },
  { name: 'P1.6-readme-and-architecture.md', start: null, end: null },
];

// Find start/end lines for each section
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const section of sections) {
    if (line.trim() === `# ${section.name}`) {
      section.start = i;
    }
  }
}

// Find end lines (next section start or end of file)
for (let i = 0; i < sections.length; i++) {
  const section = sections[i];
  const nextSection = sections[i + 1];
  if (nextSection && nextSection.start !== null) {
    // End is the line before the next section header
    section.end = nextSection.start - 1;
  } else if (!nextSection) {
    // Last section: find the closing ``` before the final table
    for (let j = section.start; j < lines.length; j++) {
      if (lines[j].trim() === '````') {
        section.end = j;
        break;
      }
    }
  }
}

// Extract content for each section
for (const section of sections) {
  if (section.start === null || section.end === null) {
    console.error(`Failed to find bounds for ${section.name}`);
    continue;
  }

  // Find the opening ````markdown
  let contentStart = section.start;
  for (let i = section.start; i <= section.end; i++) {
    if (lines[i].trim().startsWith('```')) {
      contentStart = i + 1;
      break;
    }
  }

  // Find the closing ````
  let contentEnd = section.end;
  for (let i = section.end; i >= section.start; i--) {
    if (lines[i].trim() === '````' || lines[i].trim().match(/^```+$/)) {
      contentEnd = i - 1;
      break;
    }
  }

  const sectionContent = lines.slice(contentStart, contentEnd + 1).join('\n');
  const outputPath = path.join(__dirname, 'docs/qa/P1', section.name);
  fs.writeFileSync(outputPath, sectionContent, 'utf-8');
  console.log(`Written ${outputPath} (${sectionContent.length} chars)`);
}

console.log('Done!');
