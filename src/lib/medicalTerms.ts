/**
 * Medical Terms Dictionary
 * 
 * Common nursing and medical terms with definitions for the clickable terms feature.
 * Terms are case-insensitive and match whole words only.
 */

export interface MedicalTerm {
  term: string
  definition: string
  category?: string // Optional category (e.g., 'Cardiology', 'Pharmacology')
}

export const MEDICAL_TERMS: MedicalTerm[] = [
  // Cardiovascular Terms
  { term: 'peripheral edema', definition: 'Swelling in the extremities (arms, legs, hands, feet) caused by fluid accumulation in tissues. Common in heart failure, kidney disease, and liver disease.', category: 'Cardiovascular' },
  { term: 'edema', definition: 'Swelling caused by excess fluid trapped in body tissues. Can occur in localized areas or throughout the body.', category: 'Cardiovascular' },
  { term: 'heart failure', definition: 'A condition in which the heart cannot pump enough blood to meet the body\'s needs. Can be left-sided (pulmonary congestion) or right-sided (peripheral edema).', category: 'Cardiovascular' },
  { term: 'pulmonary congestion', definition: 'Fluid accumulation in the lungs, typically caused by left-sided heart failure. Results in difficulty breathing, crackles, and decreased oxygen saturation.', category: 'Cardiovascular' },
  { term: 'hypotension', definition: 'Abnormally low blood pressure. Generally defined as systolic BP < 90 mmHg. Can cause dizziness, fainting, and decreased perfusion to organs.', category: 'Cardiovascular' },
  { term: 'hypertension', definition: 'Abnormally high blood pressure. Generally defined as systolic BP ≥ 140 mmHg or diastolic BP ≥ 90 mmHg.', category: 'Cardiovascular' },
  { term: 'tachycardia', definition: 'Abnormally fast heart rate, typically > 100 beats per minute in adults. Can be caused by fever, dehydration, heart conditions, or medications.', category: 'Cardiovascular' },
  { term: 'bradycardia', definition: 'Abnormally slow heart rate, typically < 60 beats per minute in adults. Can be normal in athletes or caused by medications, heart conditions, or electrolyte imbalances.', category: 'Cardiovascular' },
  { term: 'arrhythmia', definition: 'An irregular heart rhythm. Can be harmless or life-threatening depending on the type and underlying cause.', category: 'Cardiovascular' },
  { term: 'myocardial infarction', definition: 'Heart attack. Occurs when blood flow to part of the heart muscle is blocked, causing tissue damage or death. Key symptoms include chest pain, shortness of breath, and diaphoresis.', category: 'Cardiovascular' },
  { term: 'perfusion', definition: 'The passage of fluid (blood) through vessels to deliver oxygen and nutrients to tissues. Adequate perfusion is essential for organ function.', category: 'Cardiovascular' },
  { term: 'jugular venous distention', definition: 'Abnormal bulging of the jugular veins in the neck, indicating increased central venous pressure. Common sign of right-sided heart failure, fluid overload, or cardiac tamponade.', category: 'Cardiovascular' },
  { term: 'jugular venous distension', definition: 'Abnormal bulging of the jugular veins in the neck, indicating increased central venous pressure. Common sign of right-sided heart failure, fluid overload, or cardiac tamponade.', category: 'Cardiovascular' },
  { term: 'JVD', definition: 'Jugular Venous Distention. Abnormal bulging of the jugular veins in the neck, indicating increased central venous pressure. Common sign of right-sided heart failure.', category: 'Cardiovascular' },
  { term: 'hepatomegaly', definition: 'Enlargement of the liver. Can be caused by heart failure (especially right-sided), liver disease, infections, or tumors. Often assessed through palpation and percussion.', category: 'Cardiovascular' },
  { term: 'ascites', definition: 'Accumulation of fluid in the peritoneal cavity (abdominal cavity). Common in right-sided heart failure, liver disease, and kidney failure. Manifests as abdominal distention and increased abdominal girth.', category: 'Cardiovascular' },
  
  // Respiratory Terms
  { term: 'oxygen saturation', definition: 'The percentage of hemoglobin binding sites in the bloodstream occupied by oxygen. Normal range is 95-100%. Measured via pulse oximetry (SpO2).', category: 'Respiratory' },
  { term: 'dyspnea', definition: 'Shortness of breath or difficulty breathing. Can be acute (sudden onset) or chronic (long-term).', category: 'Respiratory' },
  { term: 'crackles', definition: 'Abnormal lung sounds heard on auscultation, often described as popping or crackling. Common in conditions like heart failure, pneumonia, or pulmonary edema.', category: 'Respiratory' },
  { term: 'wheezing', definition: 'High-pitched whistling sound heard during breathing, typically on expiration. Caused by narrowed airways, common in asthma, COPD, or allergic reactions.', category: 'Respiratory' },
  { term: 'tachypnea', definition: 'Abnormally rapid breathing rate. In adults, typically > 20 breaths per minute. Can indicate respiratory distress or compensation for metabolic acidosis.', category: 'Respiratory' },
  { term: 'apnea', definition: 'Temporary cessation of breathing. Can be voluntary (holding breath) or pathological (sleep apnea, respiratory failure).', category: 'Respiratory' },
  
  // Pharmacology Terms
  { term: 'diuretics', definition: 'Medications that increase urine production and help remove excess fluid from the body. Common in treating heart failure, hypertension, and edema. Examples include furosemide (Lasix) and hydrochlorothiazide.', category: 'Pharmacology' },
  { term: 'anticoagulant', definition: 'Medication that prevents blood clot formation. Used to prevent stroke, DVT, and pulmonary embolism. Examples include warfarin, heparin, and direct oral anticoagulants (DOACs).', category: 'Pharmacology' },
  { term: 'beta-blocker', definition: 'Class of medications that block the effects of epinephrine (adrenaline), reducing heart rate and blood pressure. Used for hypertension, heart failure, and arrhythmias. Examples include metoprolol and atenolol.', category: 'Pharmacology' },
  { term: 'ACE inhibitor', definition: 'Angiotensin-converting enzyme inhibitor. Medication that relaxes blood vessels and reduces blood pressure. Used for hypertension, heart failure, and kidney protection. Examples include lisinopril and enalapril.', category: 'Pharmacology' },
  
  // Assessment Terms
  { term: 'auscultation', definition: 'The act of listening to sounds within the body, typically using a stethoscope. Used to assess heart, lung, and bowel sounds.', category: 'Assessment' },
  { term: 'palpation', definition: 'A physical examination technique using touch to assess body structures. Used to feel pulses, assess skin temperature, and detect abnormalities.', category: 'Assessment' },
  { term: 'percussion', definition: 'A physical examination technique involving tapping on body surfaces to produce sounds. Helps assess organ size, density, and the presence of fluid or air.', category: 'Assessment' },
  
  // Neurological Terms
  { term: 'orientation', definition: 'A person\'s awareness of time, place, and person. Assessed during neurological exams. Disorientation can indicate confusion, delirium, or neurological impairment.', category: 'Neurological' },
  { term: 'level of consciousness', definition: 'A measure of a person\'s wakefulness and awareness. Ranges from alert and oriented to comatose. Often assessed using the Glasgow Coma Scale.', category: 'Neurological' },
  
  // Fluid & Electrolyte Terms
  { term: 'fluid balance', definition: 'The equilibrium between fluid intake and fluid loss (output). Imbalance can lead to dehydration or fluid overload.', category: 'Fluid & Electrolytes' },
  { term: 'dehydration', definition: 'A condition resulting from excessive loss of body water. Symptoms include dry mouth, decreased urine output, poor skin turgor, and hypotension.', category: 'Fluid & Electrolytes' },
  { term: 'fluid overload', definition: 'Excess fluid in the body, often due to heart failure, kidney disease, or excessive IV fluid administration. Manifests as edema, weight gain, and crackles.', category: 'Fluid & Electrolytes' },
  
  // General Medical Terms
  { term: 'vital signs', definition: 'Key measurements that indicate the body\'s basic functions: temperature, pulse, respiration rate, blood pressure, and oxygen saturation. Often abbreviated as VS or vitals.', category: 'Assessment' },
  { term: 'acute', definition: 'Sudden onset, severe, or short-term condition. Opposite of chronic.', category: 'General' },
  { term: 'chronic', definition: 'Long-term or ongoing condition. Develops slowly and persists over time. Opposite of acute.', category: 'General' },
  { term: 'pathophysiology', definition: 'The study of how disease processes affect body function. Understanding pathophysiology helps explain why symptoms occur and guides treatment decisions.', category: 'General' },
  { term: 'sign', definition: 'An objective finding that can be observed or measured by others (e.g., fever, rash, elevated blood pressure).', category: 'General' },
  { term: 'symptom', definition: 'A subjective indication of disease reported by the patient (e.g., pain, nausea, fatigue).', category: 'General' },
  { term: 'diagnosis', definition: 'The identification of a disease or condition based on signs, symptoms, and diagnostic tests.', category: 'General' },
  { term: 'prognosis', definition: 'The predicted course and outcome of a disease or condition.', category: 'General' },
  
  // Common NCLEX Priority Terms
  { term: 'ABCs', definition: 'Airway, Breathing, Circulation. A fundamental priority framework in nursing. Always assess and intervene in this order: airway first, then breathing, then circulation.', category: 'NCLEX Priority' },
  { term: 'Maslow\'s hierarchy', definition: 'A framework prioritizing human needs from most basic (physiological) to highest (self-actualization). In nursing, physiological needs (air, water, food, elimination) take priority over safety, love, and esteem needs.', category: 'NCLEX Priority' },
  { term: 'safety', definition: 'The prevention of harm to patients. Safety is a top priority in nursing care and often takes precedence over comfort or convenience.', category: 'NCLEX Priority' },
]

/**
 * Creates a case-insensitive map of terms for quick lookup
 */
export const MEDICAL_TERMS_MAP: Map<string, MedicalTerm> = new Map(
  MEDICAL_TERMS.map(term => [term.term.toLowerCase(), term])
)

/**
 * Finds medical terms in text and returns matches with their positions
 */
export function findMedicalTerms(text: string): Array<{ term: string; definition: string; startIndex: number; endIndex: number }> {
  const matches: Array<{ term: string; definition: string; startIndex: number; endIndex: number }> = []
  const lowerText = text.toLowerCase()
  
  // Sort terms by length (longest first) to match longer phrases first
  const sortedTerms = [...MEDICAL_TERMS].sort((a, b) => b.term.length - a.term.length)
  
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

