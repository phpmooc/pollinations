import fetch from 'node-fetch';
import debug from 'debug';
import {
    validateAndNormalizeMessages, 
    cleanNullAndUndefined,
    ensureSystemMessage,
    generateRequestId,
    cleanUndefined,
    createErrorResponse,
    normalizeOptions
} from './textGenerationUtils.js';

/**
 * Creates a client function for OpenAI-compatible APIs
 * @param {Object} config - Configuration for the client
 * @param {string|Function} config.endpoint - API endpoint URL or function that returns the URL
 * @param {string} config.authHeaderName - Name of the auth header (default: 'Authorization')
 * @param {Function} config.authHeaderValue - Function that returns the auth header value
 * @param {Object} config.modelMapping - Mapping of internal model names to API model names
 * @param {Object} config.systemPrompts - Default system prompts for different models
 * @param {Object} config.defaultOptions - Default options for the client
 * @param {string} config.providerName - Name of the provider (for logging and errors)
 * @param {Function} config.formatResponse - Optional function to format the response
 * @param {Object} config.additionalHeaders - Optional additional headers to include in requests
 * @returns {Function} - Client function that handles API requests
 */
export function createOpenAICompatibleClient(config) {
    const {
        endpoint,
        authHeaderName = 'Authorization',
        authHeaderValue,
        modelMapping = {},
        systemPrompts = {},
        defaultOptions = {},
        providerName = 'unknown',
        formatResponse = null,
        additionalHeaders = {},
        transformRequest = null
    } = config;

    const log = debug(`pollinations:${providerName.toLowerCase()}`);
    const errorLog = debug(`pollinations:${providerName.toLowerCase()}:error`);

    // Return the client function
    return async function(messages, options = {}) {
        const startTime = Date.now();
        const requestId = generateRequestId();
        
        log(`[${requestId}] Starting ${providerName} generation request`, {
            timestamp: new Date().toISOString(),
            messageCount: messages?.length || 0,
            options
        });

        try {
            // Check if API key is available
            if (!authHeaderValue()) {
                throw new Error(`${providerName} API key is not set`);
            }

            // Normalize options with defaults
            const normalizedOptions = normalizeOptions(options, defaultOptions);
            
            // Determine which model to use
            const modelKey = normalizedOptions.model;
            const modelName = modelMapping[modelKey] || modelMapping[Object.keys(modelMapping)[0]];
            
            // Validate and normalize messages
            const validatedMessages = validateAndNormalizeMessages(messages);
            
            // Ensure system message is present
            const defaultSystemPrompt = systemPrompts[modelKey] || systemPrompts[Object.keys(systemPrompts)[0]];
            const messagesWithSystem = ensureSystemMessage(validatedMessages, normalizedOptions, defaultSystemPrompt);
            
            // Build request body
            const requestBody = {
                model: modelName,
                messages: messagesWithSystem,
                temperature: normalizedOptions.temperature,
                stream: normalizedOptions.stream,
                seed: normalizedOptions.seed,
                max_tokens: normalizedOptions.maxTokens,
                response_format: normalizedOptions.jsonMode ? { type: 'json_object' } : undefined,
                tools: normalizedOptions.tools,
                tool_choice: normalizedOptions.tool_choice
            };

            // Clean undefined and null values
            const cleanedRequestBody = cleanNullAndUndefined(requestBody);
            log(`[${requestId}] Cleaned request body (removed null and undefined values):`, 
                JSON.stringify(cleanedRequestBody, null, 2));

            // Apply custom request transformation if provided
            const finalRequestBody = transformRequest
                ? transformRequest(cleanedRequestBody)
                : cleanedRequestBody;
            
            // Double-check for any null values that might have been reintroduced
            if (providerName === 'Cloudflare') {
                // For Cloudflare, we need to be extra careful about null values
                log(`[${requestId}] Double-checking for null values in Cloudflare request`);
                
                // Remove any null values that might have been reintroduced
                Object.keys(finalRequestBody).forEach(key => {
                    if (finalRequestBody[key] === null) {
                        log(`[${requestId}] Removing null value for key ${key} in final Cloudflare request`);
                        delete finalRequestBody[key];
                    }
                });
                
                // Also check for null values in nested objects
                if (finalRequestBody.response_format && typeof finalRequestBody.response_format === 'object') {
                    Object.keys(finalRequestBody.response_format).forEach(key => {
                        if (finalRequestBody.response_format[key] === null) {
                            log(`[${requestId}] Removing null value for key ${key} in response_format`);
                            delete finalRequestBody.response_format[key];
                        }
                    });
                    
                    // If response_format is empty after cleaning, remove it
                    if (Object.keys(finalRequestBody.response_format).length === 0) {
                        log(`[${requestId}] Removing empty response_format object`);
                        delete finalRequestBody.response_format;
                    }
                }
            }

            log(`[${requestId}] Sending request to ${providerName} API`, {
                timestamp: new Date().toISOString(),
                model: cleanedRequestBody.model,
                maxTokens: cleanedRequestBody.max_tokens,
                temperature: cleanedRequestBody.temperature
            });
            
            log(`[${requestId}] Final request body:`, JSON.stringify(finalRequestBody, null, 2));

            // Determine the endpoint URL
            const endpointUrl = typeof endpoint === 'function' 
                ? endpoint(modelName) 
                : endpoint;

            // Prepare headers
            const headers = {
                [authHeaderName]: authHeaderValue(),
                "Content-Type": "application/json",
                ...additionalHeaders
            };

            log(`[${requestId}] Request headers:`, headers);

            // Make API request
            const response = await fetch(endpointUrl, {
                method: "POST",
                headers,
                body: JSON.stringify(finalRequestBody)
            });

            // Handle streaming response
            if (normalizedOptions.stream) {
                log(`[${requestId}] Streaming response from ${providerName} API, status: ${response.status}, statusText: ${response.statusText}`);
                const responseHeaders = Object.fromEntries([...response.headers.entries()]);
                
                // Check if the response is successful for streaming
                if (!response.ok) {
                    const errorText = await response.text();
                    errorLog(`[${requestId}] ${providerName} API error in streaming mode: ${response.status} ${response.statusText}, error: ${errorText}`);
                    
                    // Throw an error instead of returning a structured error object
                    // This ensures the error is handled properly by the error handling flow
                    throw new Error(`${providerName} API error: ${response.status} ${response.statusText}`);
                }
                
                log(`[${requestId}] Creating streaming response object for ${providerName}`);
                
                // Check if the response is SSE (text/event-stream)
                log(`[${requestId}] Streaming response headers:`, responseHeaders);
                const isSSE = responseHeaders['content-type']?.includes('text/event-stream');
                log(`[${requestId}] Response is SSE: ${isSSE}`);
                
                return {
                    id: `${providerName.toLowerCase()}-${requestId}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(startTime / 1000),
                    model: modelName,
                    stream: true,
                    responseStream: response.body, // This is the raw stream that will be proxied
                    providerName,
                    isSSE,
                    choices: [{ delta: { content: '' }, finish_reason: null, index: 0 }],
                    error: !response.ok ? { message: `${providerName} API error: ${response.status} ${response.statusText}` } : undefined
                };
            }

            log(`[${requestId}] Received response from ${providerName} API`, {
                timestamp: new Date().toISOString(),
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers.entries()])
            });

            // Handle error responses
            if (!response.ok) {
                const errorText = await response.text();
                errorLog(`[${requestId}] ${providerName} API error`, {
                    timestamp: new Date().toISOString(),
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                    
                });
                
                return createErrorResponse(
                    new Error(`${providerName} API error: ${response.status} ${response.statusText} - ${errorText}`),
                    providerName
                );
            }

            // Parse response
            const data = await response.json();
            log(`[${requestId}] Parsed JSON response:`, JSON.stringify(data).substring(0, 500) + '...');
            const completionTime = Date.now() - startTime;

            log(`[${requestId}] Successfully generated text`, {
                timestamp: new Date().toISOString(),
                completionTimeMs: completionTime,
                modelUsed: data.model || modelName,
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
                totalTokens: data.usage?.total_tokens
            });

            // Use custom response formatter if provided
            if (formatResponse) {
                return formatResponse(data, requestId, startTime, modelName);
            }

            // Default response formatting
            // Ensure the response has all expected fields
            if (!data.id) {
                log(`[${requestId}] Adding missing id field to response`);
                
                data.id = `${providerName.toLowerCase()}-${requestId}`;
            }
            
            if (!data.object) {
                data.object = 'chat.completion';
            }
            
            if (!data.usage) {
                data.usage = {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                };
            }

            log(`[${requestId}] Final response:`, JSON.stringify(data, null, 2));

            return data;
        } catch (error) {
            errorLog(`[${requestId}] Error in text generation`, {
                timestamp: new Date().toISOString(),
                error: error.message,
                name: error.name,
                stack: error.stack,
                completionTimeMs: Date.now() - startTime
            });
            
            return createErrorResponse(error, providerName);
        }
    };
}