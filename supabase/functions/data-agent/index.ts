import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, datasetName, question, conversationHistory, projectDetails, projectGoals, projectStatus, columns, columnTypes, dataSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing action: ${action} for dataset: ${datasetName}`);

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "clean":
        systemPrompt = `You are an expert data cleaning AI agent. Your job is to:
1. Identify and fix data quality issues (missing values, duplicates, inconsistent formats)
2. Standardize data formats (dates, numbers, text)
3. Detect and handle outliers appropriately
4. Provide a summary of all cleaning operations performed

Return a JSON object with:
- "cleanedData": the cleaned dataset as an array of objects
- "cleaningReport": { "issuesFound": ["string descriptions"], "actionsTaken": ["string descriptions"], "rowsAffected": number }
- "dataQualityScore": number between 0-100

IMPORTANT: All items in issuesFound and actionsTaken arrays must be plain strings, not objects.`;
        userPrompt = `Clean this dataset named "${datasetName}":\n${JSON.stringify(data, null, 2)}`;
        break;

      case "validate":
        systemPrompt = `You are an expert data validation AI agent. Your job is to:
1. Check data types and formats for each column
2. Identify missing or null values
3. Check for data integrity issues
4. Validate data ranges and constraints
5. Identify potential duplicates

Return a JSON object with:
- "isValid": boolean
- "validationReport": { "errors": ["string descriptions"], "warnings": ["string descriptions"], "suggestions": ["string descriptions"] }
- "columnStats": { columnName: { type: "string", nullCount: number, uniqueCount: number, issues: ["string descriptions"] } }

IMPORTANT: All items in errors, warnings, and suggestions arrays must be plain strings, not objects.`;
        userPrompt = `Validate this dataset named "${datasetName}":\n${JSON.stringify(data, null, 2)}`;
        break;

      case "analyze":
        systemPrompt = `You are an expert data analysis AI agent. Your job is to:
1. Perform comprehensive statistical analysis
2. Identify patterns, trends, and correlations
3. Generate actionable insights
4. Provide recommendations based on the data

Return a JSON object with:
- "summary": brief text summary of findings
- "statistics": { descriptive stats for each column }
- "insights": [{ "title": string, "description": string, "importance": "high"|"medium"|"low" }]
- "patterns": [{ "name": string, "description": string }]
- "recommendations": [{ "action": string, "reason": string }]`;
        userPrompt = `Analyze this dataset named "${datasetName}" and provide insights:\n${JSON.stringify(data, null, 2)}`;
        break;

      case "generate-report":
        systemPrompt = `You are an expert business report generator AI. Create comprehensive, professional project reports.

Return a JSON object with:
- "title": string (professional report title)
- "executiveSummary": string (2-3 paragraph executive summary)
- "introduction": string (introduction to the analysis)
- "objectives": ["objective 1", "objective 2", ...] (list of project objectives)
- "problemStatement": string (the problem being addressed)
- "methodology": string (description of analysis methodology)
- "toolsAndTechnologies": ["tool 1", "tool 2", ...] (tools used)
- "implementationSteps": ["step 1", "step 2", ...] (implementation steps)
- "keyFindings": ["finding 1", "finding 2", ...] (key findings as plain strings)
- "recommendations": ["recommendation 1", "recommendation 2", ...] (recommendations as plain strings)
- "conclusion": string (conclusion paragraph)
- "futureScope": ["scope 1", "scope 2", ...] (future possibilities)

Make the report professional, detailed, and suitable for academic, business, or client use.
IMPORTANT: All array items must be plain strings, not objects.`;
        
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
        systemPrompt = `You are an expert data visualization AI assistant. Help users understand their data and suggest the best visualizations.
Dataset: "${datasetName}"
Data Summary: ${dataSummary || "Not provided"}

Provide insights, chart recommendations, and answer questions about data patterns. Return JSON with:
- "answer": your response text
- "suggestions": array of follow-up question suggestions
- "chartSuggestion": optional { "type": "bar"|"line"|"pie"|"area"|"scatter", "xAxis": column, "yAxis": column }`;

        const vizMessages = [
          { role: "system", content: systemPrompt },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        const vizResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: vizMessages, response_format: { type: "json_object" } }),
        });

        if (!vizResponse.ok) {
          throw new Error(`AI gateway error: ${vizResponse.status}`);
        }

        const vizData = await vizResponse.json();
        let vizResult;
        try {
          vizResult = JSON.parse(vizData.choices[0].message.content);
        } catch {
          vizResult = { answer: vizData.choices[0].message.content, suggestions: [] };
        }
        
        return new Response(JSON.stringify(vizResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "generate-visualization-report":
        systemPrompt = `You are an expert data visualization report generator. Create comprehensive insights for visualization reports.
Return JSON with:
- "summary": executive summary of data analysis
- "insights": [{ "type": "insight"|"warning"|"opportunity"|"recommendation", "title": string, "description": string, "impact": "high"|"medium"|"low", "confidence": number, "category": string }]
- "recommendations": array of visualization recommendation strings`;

        userPrompt = `Generate visualization insights for dataset "${datasetName}":
${dataSummary}`;
        break;

      case "chat":
        systemPrompt = `You are a helpful AI assistant specialized in data analysis. Be precise and provide actionable insights.
Dataset: "${datasetName}"`;
        
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dataset:\n${JSON.stringify(data, null, 2)}` },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
        });

        if (!chatResponse.ok) {
          throw new Error(`AI gateway error: ${chatResponse.status}`);
        }

        const chatData = await chatResponse.json();
        
        return new Response(JSON.stringify({ 
          response: chatData.choices[0].message.content 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // For non-chat actions
    console.log(`Sending ${action} request to AI gateway`);
    
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
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    console.log(`${action} response received successfully`);
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.warn("Failed to parse AI response as JSON, returning raw content");
      result = { rawResponse: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Data agent error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
