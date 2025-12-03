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
    const { action, data, datasetName, question, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
- "cleaningReport": { "issuesFound": [], "actionsToken": [], "rowsAffected": number }
- "dataQualityScore": number between 0-100`;
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
- "validationReport": { "errors": [], "warnings": [], "suggestions": [] }
- "columnStats": { columnName: { type, nullCount, uniqueCount, issues: [] } }`;
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

      case "chat":
        systemPrompt = `You are a helpful AI assistant specialized in data analysis. You have access to a dataset and can answer questions about it. Be precise, use specific numbers from the data, and provide actionable insights.

The dataset you're analyzing is called "${datasetName}".`;
        
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here's the dataset:\n${JSON.stringify(data, null, 2)}` },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
          }),
        });

        if (!chatResponse.ok) {
          const errorText = await chatResponse.text();
          console.error("AI gateway error:", chatResponse.status, errorText);
          if (chatResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (chatResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
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
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
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
