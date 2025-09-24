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
const normalizeNote = (note: string): string => {
  const enharmonicMap: { [key: string]: string } = {
    'C♯': 'D♭', 'C#': 'D♭', 'D♭': 'D♭', 'Db': 'D♭',
    'D♯': 'E♭', 'D#': 'E♭', 'E♭': 'E♭', 'Eb': 'E♭', 
    'F♯': 'G♭', 'F#': 'G♭', 'G♭': 'G♭', 'Gb': 'G♭',
    'G♯': 'A♭', 'G#': 'A♭', 'A♭': 'A♭', 'Ab': 'A♭',
    'A♯': 'B♭', 'A#': 'B♭', 'B♭': 'B♭', 'Bb': 'B♭'
  };
  return enharmonicMap[note] || note;
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
      
      // All expected notes should be present in the tab
      uniqueExpectedNotes.forEach(expectedNote => {
        expect(uniqueTabNotes).toContain(expectedNote);
      });
      
      // All notes in the tab should be expected notes
      uniqueTabNotes.forEach(tabNote => {
        expect(uniqueExpectedNotes).toContain(tabNote);
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
            fret: fretColumns[fretIndex] || 0,
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

  if (tables.length === 0) {
    it('has no table examples to test', () => {
      expect(true).toBe(true); // Skip files with no table examples
    });
    return;
  }

  it('should have correct notes in fretboard tables', () => {
    tables.forEach(({ string, fret, note }) => {
      const expectedNote = getNoteFromFret(string, fret);
      const normalizedTableNote = normalizeNote(note);
      const normalizedExpectedNote = normalizeNote(expectedNote);
      
      expect(normalizedTableNote).toBe(normalizedExpectedNote);
    });
  });
});
