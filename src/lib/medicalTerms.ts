/**
 * Vocabulary Bank Terms
 *
 * Cross-subject academic terms and definitions for the clickable terms feature.
 * Terms are case-insensitive and match whole words only.
 */

export interface VocabularyTerm {
  term: string
  definition: string
  category?: string // Optional category (e.g., 'Cardiology', 'Pharmacology')
}

export const VOCABULARY_TERMS: VocabularyTerm[] = [
  // Math
  { term: 'fraction', definition: 'A number that represents part of a whole, written as a/b where a is the numerator and b is the denominator.', category: 'Math' },
  { term: 'numerator', definition: 'The top number in a fraction that tells how many parts are being considered.', category: 'Math' },
  { term: 'denominator', definition: 'The bottom number in a fraction that tells how many equal parts the whole is divided into.', category: 'Math' },
  { term: 'equation', definition: 'A statement that two expressions are equal, often containing an unknown value to solve for.', category: 'Math' },
  { term: 'variable', definition: 'A symbol (like x or y) that represents an unknown value.', category: 'Math' },
  { term: 'ratio', definition: 'A comparison between two quantities using division.', category: 'Math' },
  { term: 'proportion', definition: 'An equation stating that two ratios are equal.', category: 'Math' },
  { term: 'mean', definition: 'The average of a set of numbers, found by adding them and dividing by the count.', category: 'Math' },
  { term: 'area', definition: 'The amount of space inside a 2D shape, measured in square units.', category: 'Math' },
  { term: 'perimeter', definition: 'The distance around a 2D shape, found by adding all side lengths.', category: 'Math' },

  // ELA
  { term: 'thesis', definition: 'The main claim or central idea of a piece of writing.', category: 'ELA' },
  { term: 'evidence', definition: 'Facts, examples, or quotes that support a claim.', category: 'ELA' },
  { term: 'inference', definition: 'A conclusion drawn from evidence and reasoning.', category: 'ELA' },
  { term: 'theme', definition: 'A central message or lesson in a story or text.', category: 'ELA' },
  { term: 'summary', definition: 'A brief statement of the main ideas in a text, without extra details.', category: 'ELA' },
  { term: 'paraphrase', definition: 'To restate a text in your own words while keeping the meaning.', category: 'ELA' },
  { term: 'context clue', definition: 'A word or phrase that helps explain the meaning of an unfamiliar word.', category: 'ELA' },
  { term: 'point of view', definition: 'The perspective from which a story is told (first, second, or third person).', category: 'ELA' },
  { term: 'figurative language', definition: 'Language that uses comparisons or non-literal meanings (metaphor, simile, etc.).', category: 'ELA' },
  { term: 'topic sentence', definition: 'The sentence that states the main idea of a paragraph.', category: 'ELA' },

  // Science
  { term: 'hypothesis', definition: 'A testable prediction that explains an observation.', category: 'Science' },
  { term: 'experiment', definition: 'A test or procedure used to investigate a hypothesis.', category: 'Science' },
  { term: 'variable', definition: 'A factor that can change in an experiment (independent, dependent, controlled).', category: 'Science' },
  { term: 'control group', definition: 'The group in an experiment that does not receive the variable being tested.', category: 'Science' },
  { term: 'ecosystem', definition: 'A community of living organisms interacting with their environment.', category: 'Science' },
  { term: 'photosynthesis', definition: 'The process plants use to make food using sunlight, water, and carbon dioxide.', category: 'Science' },
  { term: 'gravity', definition: 'The force that pulls objects toward each other, especially toward Earth.', category: 'Science' },
  { term: 'matter', definition: 'Anything that has mass and takes up space.', category: 'Science' },
  { term: 'energy', definition: 'The ability to do work or cause change (kinetic, potential, etc.).', category: 'Science' },
  { term: 'adaptation', definition: 'A trait that helps an organism survive in its environment.', category: 'Science' },

  // Social Studies
  { term: 'primary source', definition: 'An original document or artifact created at the time being studied.', category: 'Social Studies' },
  { term: 'secondary source', definition: 'A source created after the time being studied that interprets primary sources.', category: 'Social Studies' },
  { term: 'civilization', definition: 'An organized society with a government, culture, and economy.', category: 'Social Studies' },
  { term: 'economy', definition: 'The way goods and services are produced and used in a society.', category: 'Social Studies' },
  { term: 'government', definition: 'The system used to make rules and decisions for a community or country.', category: 'Social Studies' },
  { term: 'map scale', definition: 'A ratio showing how distances on a map relate to real distances.', category: 'Social Studies' },
  { term: 'culture', definition: 'The beliefs, customs, and ways of life of a group of people.', category: 'Social Studies' },
  { term: 'citizen', definition: 'A person who belongs to a country and has rights and responsibilities.', category: 'Social Studies' },

  // Study Skills
  { term: 'study map', definition: 'A visual outline of the key concepts, connections, and order to learn a topic.', category: 'Study Skills' },
  { term: 'spaced practice', definition: 'Reviewing material over multiple sessions instead of all at once.', category: 'Study Skills' },
  { term: 'retrieval practice', definition: 'Learning by actively recalling information rather than rereading it.', category: 'Study Skills' },
  { term: 'goal', definition: 'A specific target you want to achieve in a study session.', category: 'Study Skills' },
  { term: 'reflection', definition: 'A quick review of what you understood and what needs more work.', category: 'Study Skills' },
]

/**
 * Creates a case-insensitive map of terms for quick lookup
 */
export const VOCABULARY_TERMS_MAP: Map<string, VocabularyTerm> = new Map(
  VOCABULARY_TERMS.map(term => [term.term.toLowerCase(), term])
)

/**
 * Finds vocabulary terms in text and returns matches with their positions
 */
export function findVocabularyTerms(text: string): Array<{ term: string; definition: string; startIndex: number; endIndex: number }> {
  const matches: Array<{ term: string; definition: string; startIndex: number; endIndex: number }> = []
  const lowerText = text.toLowerCase()
  
  // Sort terms by length (longest first) to match longer phrases first
  const sortedTerms = [...VOCABULARY_TERMS].sort((a, b) => b.term.length - a.term.length)
  
  // Use a Set to track matched positions to avoid overlapping matches
  const matchedPositions = new Set<number>()
  
  for (const medicalTerm of sortedTerms) {
    const lowerTerm = medicalTerm.term.toLowerCase()
    let searchIndex = 0
    
    while (true) {
      const index = lowerText.indexOf(lowerTerm, searchIndex)
      if (index === -1) break
      
      // Check if this position overlaps with a previously matched term
      let overlaps = false
      for (let i = index; i < index + lowerTerm.length; i++) {
        if (matchedPositions.has(i)) {
          overlaps = true
          break
        }
      }
      
      if (!overlaps) {
        // Check word boundaries (start and end must be at word boundaries)
        const charBefore = index > 0 ? lowerText[index - 1] : ' '
        const charAfter = index + lowerTerm.length < lowerText.length ? lowerText[index + lowerTerm.length] : ' '
        const isWordBoundaryBefore = /[\s.,;:!?()[\]{}-]/.test(charBefore)
        const isWordBoundaryAfter = /[\s.,;:!?()[\]{}-]/.test(charAfter)
        
        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          matches.push({
            term: medicalTerm.term,
            definition: medicalTerm.definition,
            startIndex: index,
            endIndex: index + lowerTerm.length
          })
          
          // Mark these positions as matched
          for (let i = index; i < index + lowerTerm.length; i++) {
            matchedPositions.add(i)
          }
        }
      }
      
      searchIndex = index + 1
    }
  }
  
  // Sort matches by start index
  return matches.sort((a, b) => a.startIndex - b.startIndex)
}

