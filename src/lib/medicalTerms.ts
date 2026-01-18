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
  gradeBands?: Array<'elementary' | 'middle' | 'high'>
}

export const VOCABULARY_TERMS: VocabularyTerm[] = [
  // Math
  { term: 'fraction', definition: 'A number that represents part of a whole, written as a/b where a is the numerator and b is the denominator.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'numerator', definition: 'The top number in a fraction that tells how many parts are being considered.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'denominator', definition: 'The bottom number in a fraction that tells how many equal parts the whole is divided into.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'equation', definition: 'A statement that two expressions are equal, often containing an unknown value to solve for.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'variable', definition: 'A symbol (like x or y) that represents an unknown value.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'ratio', definition: 'A comparison between two quantities using division.', category: 'Math', gradeBands: ['middle', 'high'] },
  { term: 'proportion', definition: 'An equation stating that two ratios are equal.', category: 'Math', gradeBands: ['middle', 'high'] },
  { term: 'mean', definition: 'The average of a set of numbers, found by adding them and dividing by the count.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'area', definition: 'The amount of space inside a 2D shape, measured in square units.', category: 'Math', gradeBands: ['elementary', 'middle'] },
  { term: 'perimeter', definition: 'The distance around a 2D shape, found by adding all side lengths.', category: 'Math', gradeBands: ['elementary', 'middle'] },

  // ELA
  { term: 'thesis', definition: 'The main claim or central idea of a piece of writing.', category: 'ELA', gradeBands: ['middle', 'high'] },
  { term: 'evidence', definition: 'Facts, examples, or quotes that support a claim.', category: 'ELA', gradeBands: ['middle', 'high'] },
  { term: 'inference', definition: 'A conclusion drawn from evidence and reasoning.', category: 'ELA', gradeBands: ['elementary', 'middle'] },
  { term: 'theme', definition: 'A central message or lesson in a story or text.', category: 'ELA', gradeBands: ['elementary', 'middle'] },
  { term: 'summary', definition: 'A brief statement of the main ideas in a text, without extra details.', category: 'ELA', gradeBands: ['elementary', 'middle'] },
  { term: 'paraphrase', definition: 'To restate a text in your own words while keeping the meaning.', category: 'ELA', gradeBands: ['middle', 'high'] },
  { term: 'context clue', definition: 'A word or phrase that helps explain the meaning of an unfamiliar word.', category: 'ELA', gradeBands: ['elementary', 'middle'] },
  { term: 'point of view', definition: 'The perspective from which a story is told (first, second, or third person).', category: 'ELA', gradeBands: ['elementary', 'middle'] },
  { term: 'figurative language', definition: 'Language that uses comparisons or non-literal meanings (metaphor, simile, etc.).', category: 'ELA', gradeBands: ['middle', 'high'] },
  { term: 'topic sentence', definition: 'The sentence that states the main idea of a paragraph.', category: 'ELA', gradeBands: ['elementary', 'middle'] },

  // Science
  { term: 'hypothesis', definition: 'A testable prediction that explains an observation.', category: 'Science', gradeBands: ['elementary', 'middle', 'high'] },
  { term: 'experiment', definition: 'A test or procedure used to investigate a hypothesis.', category: 'Science', gradeBands: ['elementary', 'middle', 'high'] },
  { term: 'variable', definition: 'A factor that can change in an experiment (independent, dependent, controlled).', category: 'Science', gradeBands: ['middle', 'high'] },
  { term: 'control group', definition: 'The group in an experiment that does not receive the variable being tested.', category: 'Science', gradeBands: ['middle', 'high'] },
  { term: 'ecosystem', definition: 'A community of living organisms interacting with their environment.', category: 'Science', gradeBands: ['elementary', 'middle'] },
  { term: 'photosynthesis', definition: 'The process plants use to make food using sunlight, water, and carbon dioxide.', category: 'Science', gradeBands: ['elementary', 'middle'] },
  { term: 'gravity', definition: 'The force that pulls objects toward each other, especially toward Earth.', category: 'Science', gradeBands: ['elementary', 'middle'] },
  { term: 'matter', definition: 'Anything that has mass and takes up space.', category: 'Science', gradeBands: ['elementary', 'middle'] },
  { term: 'energy', definition: 'The ability to do work or cause change (kinetic, potential, etc.).', category: 'Science', gradeBands: ['elementary', 'middle', 'high'] },
  { term: 'adaptation', definition: 'A trait that helps an organism survive in its environment.', category: 'Science', gradeBands: ['middle', 'high'] },

  // Social Studies
  { term: 'primary source', definition: 'An original document or artifact created at the time being studied.', category: 'Social Studies', gradeBands: ['middle', 'high'] },
  { term: 'secondary source', definition: 'A source created after the time being studied that interprets primary sources.', category: 'Social Studies', gradeBands: ['middle', 'high'] },
  { term: 'civilization', definition: 'An organized society with a government, culture, and economy.', category: 'Social Studies', gradeBands: ['elementary', 'middle'] },
  { term: 'economy', definition: 'The way goods and services are produced and used in a society.', category: 'Social Studies', gradeBands: ['elementary', 'middle'] },
  { term: 'government', definition: 'The system used to make rules and decisions for a community or country.', category: 'Social Studies', gradeBands: ['elementary', 'middle'] },
  { term: 'map scale', definition: 'A ratio showing how distances on a map relate to real distances.', category: 'Social Studies', gradeBands: ['elementary', 'middle'] },
  { term: 'culture', definition: 'The beliefs, customs, and ways of life of a group of people.', category: 'Social Studies', gradeBands: ['elementary', 'middle'] },
  { term: 'citizen', definition: 'A person who belongs to a country and has rights and responsibilities.', category: 'Social Studies', gradeBands: ['elementary', 'middle'] },

  // Study Skills
  { term: 'study map', definition: 'A visual outline of the key concepts, connections, and order to learn a topic.', category: 'Study Skills', gradeBands: ['elementary', 'middle', 'high'] },
  { term: 'spaced practice', definition: 'Reviewing material over multiple sessions instead of all at once.', category: 'Study Skills', gradeBands: ['middle', 'high'] },
  { term: 'retrieval practice', definition: 'Learning by actively recalling information rather than rereading it.', category: 'Study Skills', gradeBands: ['middle', 'high'] },
  { term: 'goal', definition: 'A specific target you want to achieve in a study session.', category: 'Study Skills', gradeBands: ['elementary', 'middle', 'high'] },
  { term: 'reflection', definition: 'A quick review of what you understood and what needs more work.', category: 'Study Skills', gradeBands: ['elementary', 'middle', 'high'] },
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

