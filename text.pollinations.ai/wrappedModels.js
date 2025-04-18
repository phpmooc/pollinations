// Import wrapper functions
import wrapModelWithContext from "./wrapModelWithContext.js";
import { generateTextPortkey } from "./generateTextPortkey.js";
import generateTextMistral from "./generateTextMistral.js";

// Import persona prompts
import surSystemPrompt from "./personas/sur.js";
import unityPrompt from "./personas/unity.js";
import midijourneyPrompt from "./personas/midijourney.js";
import rtistPrompt from "./personas/rtist.js";
import evilPrompt from "./personas/evil.js";
import hypnosisTracyPrompt from "./personas/hypnosisTracy.js";



export const surMistral = wrapModelWithContext(
  surSystemPrompt,
  generateTextMistral,
  "mistral"
);

export const hypnosisTracy = wrapModelWithContext(
  hypnosisTracyPrompt,
  generateTextPortkey,
  "openai-audio"
);

export const unityMistralLarge = wrapModelWithContext(
  unityPrompt,
  generateTextMistral,
  "mistral"
);

export const midijourney = wrapModelWithContext(
  midijourneyPrompt,
  generateTextPortkey,
  "openai-large"
);

export const rtist = wrapModelWithContext(
  rtistPrompt,
  generateTextPortkey,
  "openai-large"
);

export const evilCommandR = wrapModelWithContext(
  evilPrompt,
  generateTextMistral,
  "mistral"
); 