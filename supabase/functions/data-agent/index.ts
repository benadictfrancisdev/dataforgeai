import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DATA_ROWS = 1000;
const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 100;
const MAX_CONVERSATION_HISTORY = 20;

const VALID_ACTIONS = [
  'clean', 'validate', 'analyze', 'generate-report', 
  'visualization-chat', 'nlp-query', 'chat', 'generate-visualization-report'
] as const;

type ValidAction = typeof VALID_ACTIONS[number];

// Sanitize string for use in prompts
const sanitizeForPrompt = (input: string | undefined | null, maxLength = 200): string => {
  if (!input) return '';
  return String(input)
    .replace(/[<>"`]/g, '')
    .substring(0, maxLength)
    .trim();
};

// Validate and sanitize input
const validateInput = (body: any): { valid: boolean; error?: string; sanitized?: any } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { action, data, datasetName, question, conversationHistory, projectDetails, 
          projectGoals, projectStatus, columns, columnTypes, dataSummary, query, dataContext } = body;

  // Validate action
  if (!action || !VALID_ACTIONS.includes(action)) {
    return { valid: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` };
  }

  // Validate data array if present
  if (data !== undefined) {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Data must be an array' };
    }
    if (data.length > MAX_DATA_ROWS) {
      return { valid: false, error: `Data exceeds maximum of ${MAX_DATA_ROWS} rows` };
    }
    // Validate each item is an object
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] !== 'object' || data[i] === null) {
        return { valid: false, error: `Data item at index ${i} must be an object` };
      }
    }
  }

  // Validate conversation history
  if (conversationHistory !== undefined) {
    if (!Array.isArray(conversationHistory)) {
      return { valid: false, error: 'Conversation history must be an array' };
    }
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
      return { valid: false, error: `Conversation history exceeds maximum of ${MAX_CONVERSATION_HISTORY} messages` };
    }
  }

  // Validate columns array
  if (columns !== undefined) {
    if (!Array.isArray(columns)) {
      return { valid: false, error: 'Columns must be an array' };
    }
    if (columns.length > MAX_ARRAY_LENGTH) {
      return { valid: false, error: `Columns exceeds maximum of ${MAX_ARRAY_LENGTH}` };
    }
  }

  // Return sanitized inputs
  return {
    valid: true,
    sanitized: {
      action: action as ValidAction,
      data: data || [],
      datasetName: sanitizeForPrompt(datasetName, 100),
      question: sanitizeForPrompt(question, 500),
      conversationHistory: (conversationHistory || []).slice(0, MAX_CONVERSATION_HISTORY),
      projectDetails: sanitizeForPrompt(projectDetails, 1000),
      projectGoals: sanitizeForPrompt(projectGoals, 1000),
      projectStatus: sanitizeForPrompt(projectStatus, 50),
      columns: (columns || []).slice(0, MAX_ARRAY_LENGTH).map((c: any) => sanitizeForPrompt(String(c), 100)),
      columnTypes: columnTypes || {},
      dataSummary: sanitizeForPrompt(dataSummary, MAX_STRING_LENGTH),
      query: sanitizeForPrompt(query, 500),
      dataContext: sanitizeForPrompt(dataContext, 50000),
    }
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check payload size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      console.error('[DataAgent] Payload too large:', contentLength);
      return new Response(
        JSON.stringify({ error: 'Payload too large. Maximum size is 5MB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[DataAgent] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[DataAgent] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('[DataAgent] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in to continue.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DataAgent] Authenticated user: ${user.id}`);

    // Parse and validate request body
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      console.error('[DataAgent] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data, datasetName, question, conversationHistory, projectDetails, 
            projectGoals, projectStatus, columns, columnTypes, dataSummary, query, dataContext } = validation.sanitized;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[DataAgent] Processing action: ${action} for dataset: ${datasetName} by user: ${user.id}`);
    console.log(`[DataAgent] Data rows: ${data?.length || 0}, Columns: ${columns?.length || 0}`);

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "clean":
        systemPrompt = `You are an expert data cleaning AI agent with 99% accuracy. Your job is to:
1. Identify and fix data quality issues (missing values, duplicates, inconsistent formats)
2. Standardize data formats (dates, numbers, text)
3. Detect and handle outliers appropriately
4. Provide a detailed summary of all cleaning operations performed

CRITICAL REQUIREMENTS:
- Preserve data integrity - never lose valid data
- Handle edge cases gracefully
- Provide confidence scores for each cleaning operation

Return a JSON object with:
- "cleanedData": the cleaned dataset as an array of objects
- "cleaningReport": { "issuesFound": ["string descriptions"], "actionsTaken": ["string descriptions"], "rowsAffected": number }
- "dataQualityScore": number between 0-100
- "confidence": number between 0-100

IMPORTANT: All items in issuesFound and actionsTaken arrays must be plain strings, not objects.`;
        userPrompt = `Clean this dataset named "${datasetName}" with ${data?.length || 0} rows:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "validate":
        systemPrompt = `You are an expert data validation AI agent with 99% accuracy. Your job is to:
1. Check data types and formats for each column
2. Identify missing or null values
3. Check for data integrity issues
4. Validate data ranges and constraints
5. Identify potential duplicates

ACCURACY TARGET: >99%

Return a JSON object with:
- "isValid": boolean
- "validationReport": { "errors": ["string descriptions"], "warnings": ["string descriptions"], "suggestions": ["string descriptions"] }
- "columnStats": { columnName: { type: "string", nullCount: number, uniqueCount: number, issues: ["string descriptions"] } }
- "confidence": number between 0-100

IMPORTANT: All items in errors, warnings, and suggestions arrays must be plain strings, not objects.`;
        userPrompt = `Validate this dataset named "${datasetName}":\n${JSON.stringify(data, null, 2)}`;
        break;

      case "analyze":
        systemPrompt = `You are an expert data analysis AI agent with advanced statistical capabilities. Your job is to:
1. Perform comprehensive statistical analysis
2. Identify patterns, trends, and correlations
3. Generate actionable insights with confidence scores
4. Provide specific, data-driven recommendations

ACCURACY TARGET: >98%

Return a JSON object with:
- "summary": brief text summary of findings (be specific with numbers)
- "statistics": { descriptive stats for each column with exact values }
- "insights": [{ "title": string, "description": string, "importance": "high"|"medium"|"low", "confidence": number }]
- "patterns": [{ "name": string, "description": string, "strength": number }]
- "recommendations": [{ "action": string, "reason": string, "priority": "high"|"medium"|"low" }]
- "overallConfidence": number between 0-100`;
        userPrompt = `Analyze this dataset named "${datasetName}" with ${data?.length || 0} rows and provide detailed insights:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "generate-report":
        systemPrompt = `You are an expert business report generator AI. Create comprehensive, professional project reports with high accuracy.

Return a JSON object with:
- "title": string (professional report title)
- "executiveSummary": string (2-3 paragraph executive summary with specific numbers)
- "introduction": string (introduction to the analysis)
- "objectives": ["objective 1", "objective 2", ...] (list of project objectives)
- "problemStatement": string (the problem being addressed)
- "methodology": string (description of analysis methodology)
- "toolsAndTechnologies": ["tool 1", "tool 2", ...] (tools used)
- "implementationSteps": ["step 1", "step 2", ...] (implementation steps)
- "keyFindings": ["finding 1", "finding 2", ...] (key findings with specific data)
- "recommendations": ["recommendation 1", "recommendation 2", ...] (actionable recommendations)
- "conclusion": string (conclusion paragraph)
- "futureScope": ["scope 1", "scope 2", ...] (future possibilities)

Make the report professional, detailed, and data-driven.
IMPORTANT: All array items must be plain strings, not objects. Include specific numbers from the data.`;
        
        userPrompt = `Generate a comprehensive project report for:
Dataset: ${datasetName}
Columns: ${columns?.join(", ") || "Not specified"}
Records: ${data?.length || 0}
Project Status: ${projectStatus || "In Progress"}
Project Details: ${projectDetails || "Data analysis project"}
Project Goals: ${projectGoals || "Analyze data and provide insights"}

Sample Data:
${JSON.stringify(data?.slice(0, 10), null, 2)}`;
        break;

      case "visualization-chat":
        systemPrompt = `You are an expert data visualization AI assistant with 99% accuracy. Help users understand their data and suggest the best visualizations.
Dataset: "${datasetName}"
Data Summary: ${dataSummary || "Not provided"}

Provide insights, chart recommendations, and answer questions about data patterns. Be specific with numbers from the data.

Return JSON with:
- "answer": your response text (use markdown, be specific with numbers)
- "suggestions": array of follow-up question suggestions
- "chartSuggestion": optional { "type": "bar"|"line"|"pie"|"area"|"scatter", "xAxis": column, "yAxis": column }
- "confidence": number between 0-100`;

        const vizMessages = [
          { role: "system", content: systemPrompt },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        console.log("[DataAgent] Sending visualization-chat request");
        
        const vizResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: vizMessages, response_format: { type: "json_object" } }),
        });

        if (!vizResponse.ok) {
          const errorText = await vizResponse.text();
          console.error("[DataAgent] Visualization chat error:", vizResponse.status, errorText);
          if (vizResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (vizResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${vizResponse.status}`);
        }

        const vizData = await vizResponse.json();
        let vizResult;
        try {
          vizResult = JSON.parse(vizData.choices[0].message.content);
        } catch {
          vizResult = { answer: vizData.choices[0].message.content, suggestions: [], confidence: 85 };
        }
        
        console.log("[DataAgent] Visualization chat response successful");
        
        return new Response(JSON.stringify(vizResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "generate-visualization-report":
        systemPrompt = `You are an expert data visualization report generator with 99% accuracy. Create comprehensive insights for visualization reports.

Be specific with actual numbers from the data provided.

Return JSON with:
- "summary": executive summary of data analysis (include specific numbers)
- "insights": [{ "type": "insight"|"warning"|"opportunity"|"recommendation", "title": string, "description": string, "impact": "high"|"medium"|"low", "confidence": number, "category": string }]
- "recommendations": array of visualization recommendation strings
- "overallConfidence": number between 0-100`;

        userPrompt = `Generate visualization insights for dataset "${datasetName}":
${dataSummary}`;
        break;

      case "nlp-query":
        console.log(`[DataAgent] Processing NLP query: ${query}`);
        console.log(`[DataAgent] Data context length: ${dataContext?.length || 0} chars`);
        
        const nlpSystemPrompt = `You are an expert Natural Language Processing engine for data analytics with >98% accuracy target.
Your job is to understand user questions about data and provide PRECISE, ACTIONABLE answers with SPECIFIC NUMBERS.

Dataset: "${datasetName}"
Data Context: ${dataContext || "Not provided"}
Available Columns: ${columns?.join(", ") || "Not specified"}
Column Types: ${JSON.stringify(columnTypes) || "Not specified"}

ACCURACY REQUIREMENTS:
1. ALWAYS use specific numbers from the data context
2. Never make up statistics - only use what's in the data
3. Clearly state confidence levels
4. Acknowledge when data is insufficient

CAPABILITIES:
1. Trend Analysis - Identify patterns and trends with specific metrics
2. Anomaly Detection - Find outliers with exact values
3. Correlation Analysis - Discover relationships with correlation coefficients
4. Summarization - Provide key metrics with precise numbers
5. Chart Recommendations - Suggest appropriate visualizations with rationale
6. Predictive Insights - Make predictions with confidence intervals

RESPONSE FORMAT - Return JSON with:
- "answer": string (detailed, accurate response - use markdown formatting, INCLUDE SPECIFIC NUMBERS)
- "confidence": number (85-99, your confidence level based on data quality)
- "charts": array of { "type": "bar"|"line"|"pie"|"area"|"scatter", "title": string, "xAxis": string, "yAxis": string, "description": string }
- "insights": array of strings (key insights with specific metrics)
- "actions": array of { "label": string, "action": string, "type": "chart"|"filter"|"export"|"analyze" }
- "queryType": string ("trend"|"anomaly"|"correlation"|"summary"|"prediction"|"dashboard"|"general")
- "dataQuality": string ("high"|"medium"|"low" - assessment of data quality for this query)

Be SPECIFIC with numbers. Format your answer with markdown for readability.`;

        const nlpMessages = [
          { role: "system", content: nlpSystemPrompt },
          ...(conversationHistory || []),
          { role: "user", content: query }
        ];

        console.log("[DataAgent] Sending NLP query to AI gateway");
        
        const nlpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${LOVABLE_API_KEY}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            model: "google/gemini-2.5-flash", 
            messages: nlpMessages, 
            response_format: { type: "json_object" } 
          }),
        });

        if (!nlpResponse.ok) {
          const errorText = await nlpResponse.text();
          console.error("[DataAgent] NLP AI gateway error:", nlpResponse.status, errorText);
          if (nlpResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (nlpResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${nlpResponse.status}`);
        }

        const nlpData = await nlpResponse.json();
        console.log("[DataAgent] NLP response received successfully");
        
        let nlpResult;
        try {
          nlpResult = JSON.parse(nlpData.choices[0].message.content);
        } catch {
          console.warn("[DataAgent] Failed to parse NLP response as JSON");
          nlpResult = { 
            answer: nlpData.choices[0].message.content, 
            confidence: 85,
            charts: [],
            insights: [],
            actions: [],
            queryType: "general",
            dataQuality: "medium"
          };
        }
        
        return new Response(JSON.stringify(nlpResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "chat":
        systemPrompt = `You are a helpful AI assistant specialized in data analysis with high accuracy. 
Be precise, use specific numbers from the data, and provide actionable insights.
Dataset: "${datasetName}"

ACCURACY REQUIREMENTS:
- Always reference specific data points
- Provide confidence levels for insights
- Acknowledge limitations when data is insufficient`;
        
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dataset with ${data?.length || 0} rows:\n${JSON.stringify(data?.slice(0, 50), null, 2)}` },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        console.log("[DataAgent] Sending chat request");
        
        const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
        });

        if (!chatResponse.ok) {
          const errorText = await chatResponse.text();
          console.error("[DataAgent] Chat error:", chatResponse.status, errorText);
          if (chatResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (chatResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${chatResponse.status}`);
        }

        const chatData = await chatResponse.json();
        console.log("[DataAgent] Chat response successful");
        
        return new Response(JSON.stringify({ 
          response: chatData.choices[0].message.content 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        console.error(`[DataAgent] Unknown action: ${action}`);
        throw new Error(`Unknown action: ${action}`);
    }

    // For non-chat actions
    console.log(`[DataAgent] Sending ${action} request to AI gateway`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DataAgent] AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    console.log(`[DataAgent] ${action} response received successfully`);
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.warn("[DataAgent] Failed to parse AI response as JSON, returning raw content");
      result = { rawResponse: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[DataAgent] Error:", error);
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
