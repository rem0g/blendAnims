// OpenRouter NGT Translation Service
import { availableSigns } from './availableSigns.js';

class OpenRouterNGTTranslator {
  constructor() {
    // OpenRouter configuration
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '<OPENROUTER_API_KEY>';
    this.siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    this.siteTitle = import.meta.env.VITE_SITE_TITLE || 'Sign Blending Interface';
    
    // NGT translation instructions
    this.ngtInstructions = `
Instructies voor NGT-vertalingen (voor mij, de AI):

Doel: Analyseer de gegeven Nederlandse zin en vertaal deze naar een grammaticaal correcte en natuurlijke NGT-structuur, rekening houdend met de visueel-ruimtelijke aard van gebarentaal.

Stappen voor Analyse en Vertaling:

Begrijp de Nederlandse Zin:
Lees de Nederlandse zin zorgvuldig.
Identificeer de kernbetekenis: Wat wil de gebruiker communiceren?

Identificeer Hoofdcomponenten (Checklist Fase 1):
Onderwerp: Wie/wat doet de actie? (bijv. "IK", "HIJ", "DE VROUW")
Actie/Werkwoord: Wat wordt er gedaan? (bijv. "GAAN", "WILLEN", "ETEN")
Object (indien aanwezig): Waar wordt de actie op uitgevoerd? (bijv. "BOEK", "APPEL")
Locatie (indien aanwezig): Waar vindt de actie plaats? (bijv. "THUIS", "WINKEL", "SCHOOL")
Tijd (indien aanwezig): Wanneer vindt de actie plaats? (bijv. "MORGEN", "NU", "VOLGENDE WEEK")

Kies de Grammatische Structuur (Checklist Fase 2):
Standaard NGT-volgorde: Vaak SOV (Subject-Object-Verb), maar pas aan indien nodig.
Tijd/Topic-Comment: Overweeg om Tijd of het primaire Onderwerp/Topic vooraan te plaatsen voor context of nadruk. Dit is vaak de meest natuurlijke keuze voor zinnen met duidelijke tijdsaanduidingen of wanneer een onderwerp specifiek benadrukt moet worden.
Prioriteit: Geef de voorkeur aan de meest natuurlijke en compacte NGT-structuur. Vermijd letterlijke vertaling van Nederlandse zinsbouw.

Converteer Nederlandse Functiewoorden (Checklist Fase 3):
Vervang Voorzetsels: Gebruik ruimtelijke positionering, bewegingsrichting van gebaren, of lichaamsoriëntatie in plaats van aparte gebaren voor Nederlandse voorzetsels ("naar", "op", "in", "van").
Klassificeerders: Denk na over het gebruik van classificators voor objecten of specifieke bewegingen (indien relevant voor de zin).
Werkwoorddirectie: Integreer de richting van de actie in het werkwoordgebaar zelf (bijv. "GEVEN" van mij naar jou).
Niet-Manuele Expresies (NMM's):
Gezichtsuitdrukking: Essentieel voor nuance (vraag, bevestiging, emotie, intentie, nadruk). Beschrijf welke gezichtsuitdrukking passend is.
Oogcontact/Oogrichting: Waar kijkt de gebaarder heen?
Hoofd- en Lichaamsbewegingen: Eventuele knikjes, schudden, of rompbewegingen die bijdragen aan de betekenis.
Mondbeelden: Specifieke mondstanden die een gebaar kunnen nuanceren of versterken.

Formuleer de NGT-Vertaling:
Geef de opeenvolging van de gebaren in hoofdletters weer (bijv. IK - WILLEN - NAAR HUIS - MORGEN).
Beschrijf kort het visuele aspect van elk gebaar.
Benadruk de rol van NMM's voor de specifieke zin.
Leg uit waarom deze volgorde en deze interpretatie van de functie woorden grammaticaal correct en natuurlijk zijn in NGT.

Antwoordformaat:

Toekomstige antwoorden moeten in JSON-formaat zijn.

Het JSON-object moet de volgende structuur hebben:

{
  "nederlandse_zin": "De originele Nederlandse zin",
  "ng_vertaling": {
    "gebaren_opeenvolging": ["GEBAAR_1", "GEBAAR_2", "GEBAAR_3", "..."],
    "uitleg_gebaren": [
      {"gebaar": "GEBAAR_1", "omschrijving": "Korte beschrijving van het gebaar en hoe het helpt de betekenis over te brengen."},
      {"gebaar": "GEBAAR_2", "omschrijving": "Korte beschrijving van het gebaar."}
    ],
    "grammatica_uitleg": "Gedetailleerde uitleg over de gekozen grammaticale structuur (bijv. Tijd-Commentaar), het vermijden van functiewoorden, en het belang van NMM's.",
    "nmm_essentieel": "Specifieke NMM's die essentieel zijn voor deze zin (bijv. 'Vastberaden gezichtsuitdrukking bij WILLEN')."
  }
}

Door deze stappen consistent te volgen, kan ik gedetailleerde, accurate en grammaticaal correcte NGT-vertalingen leveren die rekening houden met de complexiteit van gebarentalen.`;
  }

  async translateToNGT(dutchText) {
    console.log('🌐 Making OpenRouter API call for:', dutchText);
    console.log('🔑 Using API key:', this.apiKey ? 'SET' : 'MISSING');
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteTitle,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-05-20',
          messages: [
            {
              role: 'system',
              content: this.ngtInstructions
            },
            {
              role: 'user',
              content: `Vertaal de volgende Nederlandse zin naar NGT: "${dutchText}"`
            }
          ],
          temperature: 0.1 // Lower temperature for more consistent translation
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      let ngtData;
      try {
        ngtData = JSON.parse(content);
      } catch (parseError) {
        // If the response is not valid JSON, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          ngtData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from OpenRouter');
        }
      }

      return ngtData;
    } catch (error) {
      console.error('Error translating to NGT:', error);
      throw error;
    }
  }

  findMatchingAnimations(gebaren) {
    const matchedAnimations = [];
    const unmatchedGebaren = [];

    gebaren.forEach(gebaar => {
      const matches = this.findAnimationMatches(gebaar);
      if (matches.length > 0) {
        matchedAnimations.push({
          gebaar: gebaar,
          matches: matches
        });
      } else {
        unmatchedGebaren.push(gebaar);
      }
    });

    return {
      matched: matchedAnimations,
      unmatched: unmatchedGebaren
    };
  }

  findAnimationMatches(gebaar) {
    const matches = [];
    const searchTerm = gebaar.toLowerCase();

    // First, check for exact matches (case-insensitive)
    availableSigns.forEach(sign => {
      const signName = sign.name.toLowerCase();
      
      // Exact match
      if (signName === searchTerm) {
        const matchData = {
          ...sign,
          similarity: 1.0,
          matchType: 'exact'
        };
        console.log(`NGT exact match found for "${searchTerm}":`, matchData);
        matches.push(matchData);
        return;
      }

      // Calculate similarity score
      const similarity = this.calculateSimilarity(searchTerm, signName);
      
      // Include matches with decent similarity
      if (similarity > 0.3) {
        const matchData = {
          ...sign,
          similarity: similarity,
          matchType: similarity > 0.8 ? 'high' : similarity > 0.6 ? 'medium' : 'low'
        };
        console.log(`NGT similarity match for "${searchTerm}" -> "${signName}" (${Math.round(similarity * 100)}%):`, matchData);
        matches.push(matchData);
      }
    });

    // Sort by similarity score (highest first)
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  calculateSimilarity(word1, word2) {
    // Exact match gets highest score
    if (word1 === word2) {
      return 1.0;
    }
    
    // Check if one word starts with the other
    if (word1.startsWith(word2) || word2.startsWith(word1)) {
      return 0.8;
    }
    
    // Check if one word contains the other
    if (word1.includes(word2) || word2.includes(word1)) {
      return 0.6;
    }
    
    // Check for common word variations
    const variations = this.getWordVariations(word1);
    if (variations.includes(word2)) {
      return 0.7;
    }
    
    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
  }

  getWordVariations(word) {
    const variations = [word];
    
    // Common Dutch word transformations and synonyms
    const wordMap = {
      'ik': ['i', 'mij', 'me'],
      'willen': ['wil', 'wilt', 'wilde', 'gewild'],
      'gaan': ['ga', 'gaat', 'ging', 'gegaan'],
      'naar': ['richting', 'toe'],
      'huis': ['thuis', 'home', 'woning'],
      'morgen': ['tomorrow', 'ochtend'],
      'school': ['scholing', 'onderwijs'],
      'auto': ['car', 'wagen', 'voertuig'],
      'fiets': ['fietsen', 'fietsje', 'bike'],
      'bus': ['autobus', 'openbaar vervoer'],
      'trein': ['spoorweg', 'rail'],
      'loop': ['lopen', 'wandelen', 'wandel'],
      'slik': ['slikken', 'innemen'],
      'pil': ['pillen', 'medicijn', 'medicatie'],
      'mag': ['mogen', 'toegestaan'],
      'niet': ['nee', 'geen', 'verboden']
    };
    
    if (wordMap[word]) {
      variations.push(...wordMap[word]);
    }
    
    return variations;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    // Create matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async translateAndMatch(dutchText) {
    try {
      // Get NGT translation from OpenRouter
      const ngtData = await this.translateToNGT(dutchText);
      
      // Find matching animations for the gebaren
      const animationMatches = this.findMatchingAnimations(ngtData.ng_vertaling.gebaren_opeenvolging);
      
      return {
        original_text: dutchText,
        ngt_translation: ngtData,
        animation_matches: animationMatches,
        success: true
      };
    } catch (error) {
      console.error('Error in translateAndMatch:', error);
      return {
        original_text: dutchText,
        error: error.message,
        success: false
      };
    }
  }

  // Helper method to prepare animations for the sequencer
  prepareAnimationsForSequencer(matchedAnimations, useTopMatch = true) {
    const sequencerAnimations = [];
    
    matchedAnimations.forEach(({ gebaar, matches }) => {
      if (matches.length > 0) {
        // Use the top match by default, or allow user selection
        const selectedMatch = useTopMatch ? matches[0] : matches;
        
        if (useTopMatch) {
          sequencerAnimations.push({
            name: selectedMatch.name,
            file: selectedMatch.file,
            start: selectedMatch.start || 0,
            end: selectedMatch.end || null,
            folder: selectedMatch.folder,
            originalGebaar: gebaar,
            similarity: selectedMatch.similarity,
            matchType: selectedMatch.matchType
          });
        }
      }
    });
    
    return sequencerAnimations;
  }
}

export default OpenRouterNGTTranslator;