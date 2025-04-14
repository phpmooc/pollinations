import debug from 'debug';
import { affiliateMarkdown, affiliatesData } from "./affiliate_prompt.js";
import { generateTextPortkey } from '../generateTextPortkey.js';
import { logAdInteraction } from './adLogger.js';

const log = debug('pollinations:adfilter');
const errorLog = debug('pollinations:adfilter:error');

/**
 * Find the most relevant affiliate for the given content using an LLM.
 *
 * @param {string} content - The output content to analyze.
 * @param {Array} messages - The input messages to analyze (optional).
 * @returns {Promise<object|null>} - The affiliate object, or null if none found/suitable.
 */
export async function findRelevantAffiliate(content, messages = []) {
    // Combine the last 3 messages with the current content for context
    const lastMessages = messages.slice(-3).map(m => m.content || "").filter(Boolean);
    const combinedContent = [...lastMessages, content].join("\n");
    
    if (!combinedContent || combinedContent.trim() === "") {
        log("No content to analyze for affiliate matching");
        return null;
    }

    // Check if we should exclude NSFW content
    const shouldExcludeNSFW = !combinedContent.toLowerCase().includes("nsfw") && 
                              !combinedContent.toLowerCase().includes("adult") &&
                              !combinedContent.toLowerCase().includes("sex");

    // Filter out NSFW affiliates if needed
    const eligibleAffiliates = shouldExcludeNSFW 
        ? affiliatesData.filter(affiliate => !affiliate.nsfw)
        : affiliatesData;
    
    // If no eligible affiliates, return null
    if (eligibleAffiliates.length === 0) {
        log("No eligible affiliates available");
        return null;
    }

    try {
        // Use the markdown format for the LLM prompt
        const promptForLLM = `
Based on the following conversation content, determine which affiliate program would be most relevant to suggest.
Return ONLY the ID of the most relevant affiliate from the list below, or "none" if none are relevant.

CONVERSATION CONTENT:
${combinedContent}

AVAILABLE AFFILIATES:
${affiliateMarkdown}

AFFILIATE ID:`;

        const completion = await generateTextPortkey([{ role: "user", content: promptForLLM }]);
        
        const response = completion.choices[0]?.message?.content?.trim();
        
        if (!response || response.toLowerCase() === "none") {
            // Define the percentage chance of showing Ko-fi when no other affiliate is found
            const kofiShowPercentage = 10; // 10% chance to show Ko-fi
            
            // Generate a random number between 0-100
            const randomValue = Math.floor(Math.random() * 100);
            
            // Only show Ko-fi ad if the random value is below our threshold
            if (randomValue < kofiShowPercentage) {
                log(`No relevant affiliate found by LLM, showing Ko-fi donation (${randomValue} < ${kofiShowPercentage}%)`);
                // Find the Ko-fi affiliate in our data
                return affiliatesData.find(a => a.id === "kofi") || null;
            } else {
                log(`No relevant affiliate found by LLM, skipping ad (${randomValue} >= ${kofiShowPercentage}%)`);
                return null;
            }
        }

        // Extract just the affiliate ID from the response
        const affiliateIdMatch = response.match(/\b([a-zA-Z0-9]+)\b/);
        const affiliateId = affiliateIdMatch ? affiliateIdMatch[1] : null;
        
        if (!affiliateId) {
            // Define the percentage chance of showing Ko-fi when no valid ID is extracted
            const kofiShowPercentage = 10; // 30% chance to show Ko-fi
            
            // Generate a random number between 0-100
            const randomValue = Math.floor(Math.random() * 100);
            
            // Only show Ko-fi ad if the random value is below our threshold
            if (randomValue < kofiShowPercentage) {
                log(`Could not extract affiliate ID from LLM response, showing Ko-fi (${randomValue} < ${kofiShowPercentage}%)`);
                // Find the Ko-fi affiliate in our data
                return affiliatesData.find(a => a.id === "kofi") || null;
            } else {
                log(`Could not extract affiliate ID from LLM response, skipping ad (${randomValue} >= ${kofiShowPercentage}%)`);
                return null;
            }
        }

        // Find the affiliate in our data
        const matchedAffiliate = affiliatesData.find(a => a.id === affiliateId);
        
        if (!matchedAffiliate) {
            // Define the percentage chance of showing Ko-fi when affiliate ID isn't found
            const kofiShowPercentage = 30; // 30% chance to show Ko-fi
            
            // Generate a random number between 0-100
            const randomValue = Math.floor(Math.random() * 100);
            
            // Only show Ko-fi ad if the random value is below our threshold
            if (randomValue < kofiShowPercentage) {
                log(`Affiliate ID ${affiliateId} not found in affiliate data, showing Ko-fi (${randomValue} < ${kofiShowPercentage}%)`);
                // Find the Ko-fi affiliate in our data
                return affiliatesData.find(a => a.id === "kofi") || null;
            } else {
                log(`Affiliate ID ${affiliateId} not found in affiliate data, skipping ad (${randomValue} >= ${kofiShowPercentage}%)`);
                return null;
            }
        }

        log(`Found relevant affiliate: ${matchedAffiliate.name} (${affiliateId})`);
        return matchedAffiliate;
    } catch (error) {
        errorLog(`Error finding relevant affiliate: ${error.message}`);
        
        // Define the percentage chance of showing Ko-fi when an error occurs
        const kofiShowPercentage = 30; // 30% chance to show Ko-fi
        
        // Generate a random number between 0-100
        const randomValue = Math.floor(Math.random() * 100);
        
        // Only show Ko-fi ad if the random value is below our threshold
        if (randomValue < kofiShowPercentage) {
            log(`Using Ko-fi donation as fallback due to error (${randomValue} < ${kofiShowPercentage}%)`);
            return affiliatesData.find(a => a.id === "kofi") || null;
        } else {
            log(`Skipping ad due to error (${randomValue} >= ${kofiShowPercentage}%)`);
            return null;
        }
    }
}

/**
 * Generate an ad string for the given affiliate ID
 * @param {string} affiliateId - The ID of the affiliate to generate an ad for
 * @param {string} content - The original content to match language with
 * @param {Array} messages - The original messages for context
 * @returns {Promise<string|null>} - The ad string or null if generation failed
 */
export async function generateAffiliateAd(affiliateId, content = '', messages = []) {
    if (!affiliateId) {
        log('No affiliate ID provided for ad generation');
        return null;
    }
    
    try {
        // Find the affiliate in our data
        const affiliate = affiliatesData.find(a => a.id === affiliateId);
        
        if (!affiliate) {
            log(`Affiliate ID ${affiliateId} not found in affiliate data`);
            return null;
        }
        
        // Create the referral link
        const referralLink = `https://pollinations.ai/redirect/${affiliateId}`;
        
        // Get base ad text - simplified approach for all types
        let adTextSource = '';
        
        // Use the ad_text field if available
        if (affiliate.ad_text) {
            adTextSource = affiliate.ad_text.replace('{url}', referralLink);
        } 
        // Use description if available
        else if (affiliate.description) {
            adTextSource = `${affiliate.description} [Learn more](${referralLink})`;
        }
        // Use product name if available
        else if (affiliate.product) {
            adTextSource = `Learn more about ${affiliate.product} [Learn more](${referralLink})`;
        }
        // Fallback to generic text
        else {
            adTextSource = `Learn more about ${affiliate.name} [Learn more](${referralLink})`;
            log(`No specific text for ${affiliateId}, using generic ad text.`);
        }
        
        // Detect language and translate ad text if content is provided
        if (content && content.trim().length > 0) {
            // Use the entire content for language detection instead of just a snippet
            const sampleText = content;
            
            // Use LLM to detect language and translate
            const translationPrompt = `
You are a professional translator. First, detect the language of the provided text sample.

IMPORTANT INSTRUCTIONS:
1. If the detected language is English, respond with "ENGLISH" followed by the original advertisement text unchanged.
2. If the detected language is NOT English, translate the advertisement to match that language and respond with the language name followed by the translated text.
3. Return your response in this exact format: "LANGUAGE_NAME: translated_text"
4. Preserve any markdown links in the format [text](url)
5. Do not add any explanations or additional text

TEXT FOR LANGUAGE DETECTION:
${sampleText}

ADVERTISEMENT TO TRANSLATE:
${adTextSource}

RESPONSE:`;

            try {
                const completion = await generateTextPortkey([{ role: "user", content: translationPrompt }]);
                const response = completion.choices[0]?.message?.content?.trim();
                
                if (response && response.length > 0) {
                    // Check if the response indicates English
                    if (response.toUpperCase().startsWith('ENGLISH:')) {
                        // Keep original text, strip the "ENGLISH:" prefix
                        adTextSource = response.substring(8).trim();
                        log(`Content detected as English, keeping original ad text for ${affiliate.name} (${affiliateId})`);
                    } else {
                        // Extract language and translated text
                        const colonIndex = response.indexOf(':');
                        if (colonIndex > 0) {
                            const detectedLanguage = response.substring(0, colonIndex).trim();
                            adTextSource = response.substring(colonIndex + 1).trim();
                            log(`Translated ad for ${affiliate.name} (${affiliateId}) to ${detectedLanguage}`);
                        } else {
                            // If format is unexpected, use the response as is
                            adTextSource = response;
                            log(`Received unformatted translation for ${affiliate.name} (${affiliateId})`);
                        }
                    }
                }
            } catch (translationError) {
                errorLog(`Error translating ad: ${translationError.message}`);
                // Continue with original text if translation fails
            }
        }
        
        // Format the final ad - single approach for all types
        const adText = `\n\n---\n${adTextSource}`;
        
        log(`Generated ad for ${affiliate.name} (${affiliateId})`);
        return adText;
    } catch (error) {
        errorLog(`Error generating affiliate ad: ${error.message}`);
        return null;
    }
}

/**
 * Extracts information about referral links in the content.
 * @param {string} content - The content to analyze for referral links.
 * @returns {Object} - Information about the referral links found.
 */
export function extractReferralLinkInfo(content) {
    // Initialize result object
    const result = {
        linkCount: 0,
        linkTexts: [],
        linkTextsString: '',
        topicsOrIds: [],
        topicsOrIdsString: '',
        affiliateIds: []
    };
    
    if (!content) return result;
    
    // Regular expression to find referral links in the content
    // Updated to match the new format: https://pollinations.ai/referral/[id]
    const referralLinkRegex = /\[([^\]]+)\]\((https:\/\/pollinations\.ai\/referral\/([a-zA-Z0-9]+))[^\)]*\)/g;
    
    let match;
    while ((match = referralLinkRegex.exec(content)) !== null) {
        // Increment link count
        result.linkCount++;
        
        // Extract link text
        const linkText = match[1];
        result.linkTexts.push(linkText);
        
        // Extract affiliate ID from the URL
        const affiliateId = match[3];
        
        result.topicsOrIds.push(affiliateId);
        
        // Add affiliate ID to the list if it exists
        if (affiliateId) {
            result.affiliateIds.push(affiliateId);
        }
    }
    
    // Join arrays into strings for analytics
    result.linkTextsString = result.linkTexts.join(',');
    result.topicsOrIdsString = result.topicsOrIds.join(',');
    
    return result;
}
