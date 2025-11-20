import * as fs from 'fs';
import * as path from 'path';

const NOTE_MAP: { [note: string]: number } = {
  'C': 0, 'C#': 1, 'C♯': 1, 'Db': 1, 'D♭': 1,
  'D': 2, 'D#': 3, 'D♯': 3, 'Eb': 3, 'E♭': 3,
  'E': 4, 'F': 5, 'F#': 6, 'F♯': 6, 'Gb': 6, 'G♭': 6,
  'G': 7, 'G#': 8, 'G♯': 8, 'Ab': 8, 'A♭': 8,
  'A': 9, 'A#': 10, 'A♯': 10, 'Bb': 10, 'B♭': 10,
  'B': 11,
};

// Bass guitar standard tuning: E(open) = E2, A(open) = A2, D(open) = D3, G(open) = G3
const STRING_NOTES: { [str: string]: number } = {
  'E': 4,  // E note
  'A': 9,  // A note  
  'D': 2,  // D note
  'G': 7,  // G note
};

// Function to normalize enharmonic equivalents
  const normalizeNote = (note: string | undefined): string => {
    if (!note) return '';
    
    // First convert unicode symbols to text
    const textNote = note.replace('♭', 'b').replace('♯', '#');
    
    // Then normalize enharmonic equivalents to sharps for consistency
    const enharmonicMap: { [key: string]: string } = {
      'Db': 'C#', 'D♭': 'C#', 
      'Eb': 'D#', 'E♭': 'D#', 
      'Gb': 'F#', 'G♭': 'F#', 
      'Ab': 'G#', 'A♭': 'G#', 
      'Bb': 'A#', 'B♭': 'A#'
    };
    
    return enharmonicMap[textNote] || textNote;
  };

  interface WalkingBassPosition {
    string: string;
    fret: number;
  }

  interface WalkingBassPattern {
    expectedNotes: string[];
    positions: WalkingBassPosition[];
  }

  interface WalkingBassTable {
    title?: string;
    patterns: WalkingBassPattern[];
  }

  const parseWalkingBassTable = (content: string): WalkingBassTable[] => {
    const tables: WalkingBassTable[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      const line = currentLine.trim();
      
      // Look for walking bass table pattern: beat numbers in first row
      if (line.includes('| 1 | 2 | 3 | 4 | 1 | 2 | 3 | 4 |')) {
        // Verify this is followed by a separator line and Note row
        const separatorLine = lines[i + 1];
        const noteLine = lines[i + 2];
        
        if (separatorLine && separatorLine.includes('---|') && 
            noteLine && (noteLine.startsWith('| Note|') || noteLine.startsWith('|Note|'))) {
          
          // Found a valid walking bass table
          // Find the table title (look backwards for a heading)
          let title = '';
          for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
            const prevLineRaw = lines[j];
            if (!prevLineRaw) continue;
            const prevLine = prevLineRaw.trim();
            if (prevLine.startsWith('#')) {
              title = prevLine.replace(/^#+\s*/, '');
              break;
            }
          }
          
          // If no title found, use line number for identification
          if (!title) {
            title = `Line ${i + 3}`;
          }

          // Move to Note row (skip beat row and separator)
          const noteRowIndex = i + 2;
          const noteRow = lines[noteRowIndex];
          if (!noteRow) continue;

          // Parse the Note row to get expected notes
          const noteCells = noteRow.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          const expectedNotes: string[] = noteCells.slice(1); // Skip the "Note" cell itself
          const positions: WalkingBassPosition[] = [];

          // Parse the following string rows (G, D, A, E)
          const stringNames = ['G', 'D', 'A', 'E'];
          const stringData: { [key: string]: (number | null)[] } = {};

          for (let stringIndex = 0; stringIndex < stringNames.length; stringIndex++) {
            const stringRowIndex = noteRowIndex + 1 + stringIndex;
            if (stringRowIndex >= lines.length) break;
            
            const stringLineRaw = lines[stringRowIndex];
            if (!stringLineRaw) break;
            const stringLine = stringLineRaw.trim();
            const stringName = stringNames[stringIndex];
            if (!stringName) continue;
            
            if (stringLine.includes(`| ${stringName} `) || stringLine.includes(`|${stringName} `)) {
              const cells = stringLine.split('|').map(cell => cell.trim());
              // Skip first empty cell and string name cell, keep all data cells including empty ones
              const dataCells = cells.slice(2, -1); // Remove first empty, string name, and last empty
              const fretValues = dataCells.map(cell => {
                if (cell === '' || cell === ' ' || isNaN(parseInt(cell))) {
                  return null;
                }
                return parseInt(cell);
              });
              stringData[stringName] = fretValues;
            }
          }

          // Match fret positions with expected notes
          for (let noteIndex = 0; noteIndex < expectedNotes.length; noteIndex++) {
            // Find which string has a fret value for this note position
            let foundString = '';
            let foundFret = -1;
            
            for (const [stringName, fretValues] of Object.entries(stringData)) {
              if (noteIndex < fretValues.length && fretValues[noteIndex] !== null && fretValues[noteIndex] !== undefined) {
                foundString = stringName;
                foundFret = fretValues[noteIndex] as number;
                break;
              }
            }
            
            if (foundString && foundFret >= 0) {
              positions.push({ 
                string: foundString, 
                fret: foundFret 
              });
            }
          }

          if (expectedNotes.length > 0 && positions.length === expectedNotes.length) {
            tables.push({
              title,
              patterns: [{
                expectedNotes,
                positions
              }]
            });
          }
          
          // Skip ahead past this table
          i = noteRowIndex + 4; // Skip past the 4 string rows
        }
      }
    }
    
    return tables;
  };

const getNoteFromFret = (string: 'E' | 'A' | 'D' | 'G', fret: number): string => {
  const stringValue = STRING_NOTES[string];
  if (stringValue === undefined) {
    return '';
  }
  const noteValue = (stringValue + fret) % 12;
  
  // Return the note, preferring sharps with musical symbol ♯
  const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return noteNames[noteValue] || '';
};

const parseTab = (tab: string): { string: 'E' | 'A' | 'D' | 'G', fret: number, position: number }[] => {
  const notes: { string: 'E' | 'A' | 'D' | 'G', fret: number, position: number }[] = [];
  const lines = tab.trim().split('\n');
  
  for (const line of lines) {
    if (line.includes('|')) {
      const [stringName, frets] = line.split('|');
      const cleanStringName = stringName?.trim();
      
      if (cleanStringName && frets && ['E', 'A', 'D', 'G'].includes(cleanStringName)) {
        // Parse fret numbers from the line
        let i = 0;
        while (i < frets.length) {
          const char = frets[i];
          if (char && /\d/.test(char)) {
            let fretNumber = '';
            const startPosition = i; // Track position for ordering
            // Collect consecutive digits
            while (i < frets.length && /\d/.test(frets[i]!)) {
              fretNumber += frets[i];
              i++;
            }
            if (fretNumber) {
              notes.push({
                string: cleanStringName as 'E' | 'A' | 'D' | 'G',
                fret: parseInt(fretNumber),
                position: startPosition
              });
            }
          } else {
            i++;
          }
        }
      }
    }
  }
  
  // Sort by position to get the correct order (left to right)
  return notes.sort((a, b) => a.position - b.position);
};

const docsDir = path.join(__dirname, '../docs');
const files = fs.readdirSync(docsDir);

describe.each(files)('TAB Examples in %s', (file) => {
  if (path.extname(file) !== '.md') {
    return;
  }

  const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
  const sections = content.split('```');

  const testCases: { name: string, expectedNotes: string[], tab: string }[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Check for both old format (with "The notes are") and new format (with ```tab)
    if (section && section.includes('The notes are')) {
      // Old format: The TAB is in the same section
      const notesMatch = section.match(/The notes are ([^.]+)\./);
      if (notesMatch && notesMatch[1]) {
        const expectedNotes = notesMatch[1]
          .split(', ')
          .map(note => note.trim())
          .map(note => note.replace(/\*\*/g, '')); // Remove markdown bold formatting
        
        testCases.push({
          name: `should have correct notes for the TAB for notes ${expectedNotes.join(', ')}`,
          expectedNotes,
          tab: section, // Use the same section
        });
      }
    } else if (section && section.startsWith('tab\n')) {
      // New format: ```tab block, look for notes in the previous section
      const previousSection = sections[i - 1];
      if (previousSection) {
        // Look for various note patterns in the previous section
        const notesMatch = previousSection.match(/The notes are ([^.]+)\./) ||
                          previousSection.match(/\*\*Notes:\*\* ([^*\n]+)/) ||
                          previousSection.match(/Notes: ([^.]+)/);
        
        if (notesMatch && notesMatch[1]) {
          const expectedNotes = notesMatch[1]
            .split(/[,]/) // Split on comma
            .map(note => note.trim())
            .map(note => note.replace(/\*\*/g, '')); // Remove markdown formatting
          
          testCases.push({
            name: `should have correct notes for the TAB for notes ${expectedNotes.join(', ')}`,
            expectedNotes,
            tab: section.substring(4), // Remove 'tab\n' prefix
          });
        }
      }
    }
  }

  if (testCases.length === 0) {
    it('has no TAB examples to test', () => {
      expect(true).toBe(true); // Skip files with no examples
    });
    return;
  }

  it.each(testCases)('$name', ({ expectedNotes, tab }) => {
    const tabPositions = parseTab(tab);
    const tabNotes = tabPositions.map(note => getNoteFromFret(note.string, note.fret));
    
    if (tabNotes.length > 0 && expectedNotes.length > 0) {
      // Normalize both expected and calculated notes for comparison
      const normalizedTabNotes = tabNotes.map(normalizeNote);
      const normalizedExpectedNotes = expectedNotes.map(normalizeNote);
      
      // The first note in the tab should be the root note
      expect(normalizedTabNotes[0]).toBe(normalizedExpectedNotes[0]);
      
      // Check that we have the correct number of unique notes
      const uniqueTabNotes = [...new Set(normalizedTabNotes)];
      const uniqueExpectedNotes = [...new Set(normalizedExpectedNotes)];
      
      // Normalize both sets for comparison
      const normalizedExpected = uniqueExpectedNotes.map(note => normalizeNote(note));
      const normalizedTab = uniqueTabNotes.map(note => normalizeNote(note));
      
      // All expected notes should be present in the tab
      normalizedExpected.forEach(expectedNote => {
        expect(normalizedTab).toContain(expectedNote);
      });
      
      // All notes in the tab should be expected notes
      normalizedTab.forEach(tabNote => {
        expect(normalizedExpected).toContain(tabNote);
      });
      
      // Should have the same number of unique notes
      expect(uniqueTabNotes.length).toBe(uniqueExpectedNotes.length);
    }
  });
});

// Function to parse table and extract notes with their fret positions
const parseTable = (content: string): { string: 'E' | 'A' | 'D' | 'G', fret: number, note: string }[] => {
  const tableNotes: { string: 'E' | 'A' | 'D' | 'G', fret: number, note: string }[] = [];
  const lines = content.split('\n');
  
  let headerLine = -1;
  let fretColumns: number[] = [];
  
  // Find the table header and extract fret positions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.includes('| Fret ') && line.includes('|')) {
      headerLine = i;
      // Extract fret numbers from header
      const headerParts = line.split('|').map(part => part.trim()).filter(part => part !== '' && part !== 'Fret');
      for (const part of headerParts) {
        const fretNum = parseInt(part);
        if (!isNaN(fretNum)) {
          fretColumns.push(fretNum);
        }
      }
      break;
    }
  }
  
  if (headerLine === -1) return tableNotes;
  
  // Process string rows (skip header and separator line)  
  for (let i = headerLine + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.includes('|')) break; // Stop at end of table
    
    const parts = line.split('|').map(part => part.trim());
    // Remove empty first and last elements (before first | and after last |)
    if (parts.length > 0 && parts[0] === '') parts.shift();
    if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    if (parts.length < 2) continue;
    
    const stringName = parts[0]?.replace(/\*\*/g, ''); // Remove markdown bold
    if (!stringName || !['E', 'A', 'D', 'G'].includes(stringName)) continue;
    
    // Process each fret column (start from index 1, skip string name)
    for (let fretIndex = 0; fretIndex < fretColumns.length && fretIndex + 1 < parts.length; fretIndex++) {
      const cellContent = parts[fretIndex + 1]; // +1 to skip string name column
      if (cellContent && cellContent.includes('**')) {
        // Extract note from bold markdown
        const noteMatch = cellContent.match(/\*\*([^*]+)\*\*/);
        if (noteMatch && noteMatch[1]) {
          tableNotes.push({
            string: stringName as 'E' | 'A' | 'D' | 'G',
            fret: fretColumns[fretIndex] ?? 0,
            note: noteMatch[1].trim()
          });
        }
      }
    }
  }
  
  return tableNotes;
};

describe.each(files)('Table Examples in %s', (file) => {
  if (path.extname(file) !== '.md') {
    return;
  }

  const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
  const tables = parseTable(content);

  // Test walking bass tables using the new generic parser
  const walkingBassTables = parseWalkingBassTable(content);
  
  if (tables.length === 0 && walkingBassTables.length === 0) {
    it('has no table examples to test', () => {
      expect(true).toBe(true); // Skip files with no table examples
    });
    return;
  }

  if (tables.length > 0) {
    it('should have correct notes in fretboard tables', () => {
      tables.forEach(({ string, fret, note }) => {
        const expectedNote = getNoteFromFret(string, fret);
        const normalizedTableNote = normalizeNote(note);
        const normalizedExpectedNote = normalizeNote(expectedNote);
        
        expect(normalizedTableNote).toBe(normalizedExpectedNote);
      });
    });
  }

  if (walkingBassTables.length > 0) {
    describe('Walking Bass Table Examples', () => {
      walkingBassTables.forEach((table, tableIndex) => {
        it(`should have correct fret positions for table ${tableIndex + 1}${table.title ? ` - ${table.title}` : ''}`, () => {
          table.patterns.forEach((pattern, patternIndex) => {
            pattern.positions.forEach((position, posIndex) => {
              const actualNote = getNoteFromFret(position.string as 'E' | 'A' | 'D' | 'G', position.fret);
              expect(actualNote).toBeDefined();
              expect(normalizeNote(actualNote!)).toBe(normalizeNote(pattern.expectedNotes[posIndex]));
            });
          });
        });
      });
    });
  }
});
