# Question bank editorial notes

Version 1.1 includes exactly 500 unique prompts: 150 funny/unusual facts, 150 tricky questions, 100 general-knowledge questions, and 100 riddles/word puzzles. Questions are authored in the `content/*.txt` files and compiled into `questions.json`; `questions.mjs` loads that JSON on the server. Do not serve the JSON or source content as public assets: that would reveal every answer.

Each entry has a stable ID, category, correct answer, accepted aliases, and four distinct decoys. Prompts specify the relevant convention when needed (standard pressure, Gregorian calendar, flat-plane geometry, inclusive mathematical definitions). Wordplay is English-language. Some riddles are intentionally easy; their purpose is to create a lively mixed match rather than an examination.

Editorial references used for scientific wording include:

- NASA planet facts: https://science.nasa.gov/solar-system/planets/
- NASA Venus: https://science.nasa.gov/venus/venus-facts/
- NASA Uranus: https://science.nasa.gov/uranus/facts/
- NASA Neptune: https://science.nasa.gov/neptune/neptune-facts/
- Smithsonian cephalopods: https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives
- Smithsonian flamingos: https://nationalzoo.si.edu/animals/news/why-are-flamingos-pink-and-other-flamingo-facts
- San Diego Zoo animal reference collection: https://animals.sandiegozoo.org/animals
- San Diego Zoo platypus: https://animals.sandiegozoo.org/animals/platypus
- Library of Congress Everyday Mysteries: https://www.loc.gov/everyday-mysteries/
- Library of Congress camel/season explanations: https://blogs.loc.gov/loc/2020/04/everyday-mysteries-solved/
- NSW National Parks wombat droppings: https://www.nationalparks.nsw.gov.au/get-inspired/stories/peek-a-poo-whats-in-animals-number-twos
- Cambridge dictionary, borborygmus: https://dictionary.cambridge.org/dictionary/english/borborygmus
- Champagne industry service guide, muselet terminology: https://www.champagne.fr/system/files/2025-09/FICHE%20SERVICE%20DU%20CHAMPAGNE%20EN%202025.pdf

These are editorial reference points, not a claim that every question has a separate independently verified source. Arithmetic, sequence rules, and anagrams are directly checkable; tests verify that anagram answers use exactly the given letters. Structural checks reject duplicate IDs/prompts, duplicate decoys, and decoys matching accepted correct answers. Human play-testing remains useful for alternate valid wording, difficulty, and humour.

Correct-answer detection is deterministic, not AI-based. Case, punctuation, and common listed variants are accepted. Numeric signs, decimal points, and fraction separators remain meaningful. Unlisted paraphrases can still be missed. Never add a decoy that is another valid answer to the question.
