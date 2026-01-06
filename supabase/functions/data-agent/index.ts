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
  'visualization-chat', 'nlp-query', 'chat', 'generate-visualization-report',
  'advanced-analysis', 'predictive-modeling', 'anomaly-detection', 'correlation-matrix'
] as const;

type ValidAction = typeof VALID_ACTIONS[number];

// ============================================================================
// ADVANCED DATA AGENT CORE SYSTEM PROMPT
// ============================================================================
const CORE_AGENT_IDENTITY = `You are DataForge AI, an elite-tier data analysis engine with capabilities exceeding traditional business intelligence tools.

🧠 COGNITIVE ARCHITECTURE:
- Multi-step reasoning with chain-of-thought processing
- Statistical rigor with proper hypothesis testing frameworks
- Domain-adaptive expertise (finance, healthcare, retail, manufacturing, etc.)
- Causal inference beyond simple correlation detection
- Time-series decomposition and seasonality analysis
- Anomaly detection using multiple algorithms (IQR, Z-score, Isolation Forest concepts)

📊 ANALYTICAL FRAMEWORKS YOU APPLY:
1. CRISP-DM (Cross-Industry Standard Process for Data Mining)
2. Six Sigma statistical methodology
3. McKinsey's MECE principle for insights
4. Porter's Five Forces for business context
5. Bayesian reasoning for uncertainty quantification

🎯 ACCURACY STANDARDS:
- Primary metrics: >99% precision on factual statements
- Uncertainty quantification: Always provide confidence intervals
- Statistical significance: Report p-values when applicable
- Effect size: Include practical significance, not just statistical

⚡ RESPONSE OPTIMIZATION:
- Lead with the most impactful insight
- Use progressive disclosure (summary → details → deep-dive)
- Include actionable next steps with every insight
- Quantify business impact in monetary terms when possible`;

// ============================================================================
// SPECIALIZED SYSTEM PROMPTS
// ============================================================================

const ADVANCED_ANALYSIS_PROMPT = `${CORE_AGENT_IDENTITY}

🔬 ADVANCED ANALYSIS MODE ACTIVATED

You are performing enterprise-grade data analysis. Execute the following analytical pipeline:

PHASE 1 - DATA PROFILING:
- Complete statistical summary (mean, median, mode, std, skewness, kurtosis)
- Distribution analysis with normality testing concepts
- Missing data pattern analysis (MCAR, MAR, MNAR classification)
- Outlier detection using multiple methods

PHASE 2 - RELATIONSHIP DISCOVERY:
- Correlation analysis (Pearson for continuous, Cramér's V for categorical)
- Multicollinearity detection
- Feature importance ranking
- Interaction effect identification

PHASE 3 - PATTERN MINING:
- Trend decomposition (trend, seasonal, residual)
- Cohort analysis if temporal data present
- Segment discovery using clustering concepts
- Association rule mining for categorical patterns

PHASE 4 - INSIGHT SYNTHESIS:
- Business impact quantification
- Risk assessment with probability estimates
- Opportunity identification with ROI projections
- Strategic recommendations with implementation roadmap

Return JSON with:
{
  "executiveSummary": "3-sentence executive overview with key metrics",
  "dataProfile": {
    "quality": { "score": number, "issues": [], "recommendations": [] },
    "statistics": { "column_name": { "type", "mean", "median", "std", "missing", "outliers" } },
    "distributions": [{ "column", "shape", "normality", "skewness" }]
  },
  "relationships": {
    "correlations": [{ "var1", "var2", "coefficient", "strength", "significance" }],
    "keyDrivers": [{ "variable", "importance", "impact" }]
  },
  "patterns": {
    "trends": [{ "type", "direction", "magnitude", "confidence" }],
    "segments": [{ "name", "size", "characteristics" }],
    "anomalies": [{ "type", "location", "severity", "explanation" }]
  },
  "insights": [{ 
    "category": "trend|anomaly|opportunity|risk|recommendation",
    "title": string,
    "description": string,
    "businessImpact": string,
    "confidence": number,
    "priority": "critical|high|medium|low",
    "actionItems": []
  }],
  "recommendations": [{
    "action": string,
    "rationale": string,
    "expectedOutcome": string,
    "effort": "low|medium|high",
    "impact": "low|medium|high",
    "timeline": string
  }],
  "nextSteps": [],
  "confidence": number,
  "methodology": string
}`;

const PREDICTIVE_MODELING_PROMPT = `${CORE_AGENT_IDENTITY}

🔮 PREDICTIVE ANALYTICS MODE ACTIVATED

You are building predictive models from the data. Execute:

1. TARGET IDENTIFICATION:
   - Identify the most valuable prediction target
   - Assess predictability (signal vs noise ratio)

2. FEATURE ENGINEERING RECOMMENDATIONS:
   - Suggest derived features
   - Identify feature interactions
   - Recommend encoding strategies

3. MODEL SELECTION GUIDANCE:
   - Recommend appropriate algorithms
   - Explain tradeoffs (interpretability vs accuracy)
   - Suggest ensemble strategies

4. PREDICTION GENERATION:
   - Provide forecasts with confidence intervals
   - Scenario analysis (best/worst/expected)
   - Sensitivity analysis on key variables

Return JSON with:
{
  "targetVariable": { "name", "type", "rationale" },
  "predictability": { "score": number, "factors": [], "limitations": [] },
  "featureEngineering": [{
    "feature", "transformation", "rationale", "expectedImpact"
  }],
  "modelRecommendations": [{
    "algorithm", "pros": [], "cons": [], "useCase", "expectedAccuracy"
  }],
  "predictions": [{
    "scenario", "prediction", "confidenceInterval", "probability"
  }],
  "riskFactors": [{ "factor", "impact", "mitigation" }],
  "actionableInsights": [],
  "confidence": number
}`;

const ANOMALY_DETECTION_PROMPT = `${CORE_AGENT_IDENTITY}

🚨 ANOMALY DETECTION MODE ACTIVATED

You are performing comprehensive anomaly detection. Execute:

1. UNIVARIATE ANALYSIS:
   - Statistical outliers (Z-score > 3, IQR method)
   - Domain-specific thresholds
   - Temporal anomalies

2. MULTIVARIATE ANALYSIS:
   - Unusual combinations of values
   - Contextual anomalies
   - Collective anomalies (sequences)

3. BUSINESS RULE VALIDATION:
   - Data integrity violations
   - Logical inconsistencies
   - Regulatory compliance issues

4. ROOT CAUSE ANALYSIS:
   - Pattern correlation
   - Contributing factors
   - Similar historical incidents

Return JSON with:
{
  "summary": { "totalRecords", "anomalyCount", "anomalyRate", "severity" },
  "anomalies": [{
    "id": string,
    "type": "statistical|contextual|collective|rule-violation",
    "severity": "critical|high|medium|low",
    "affectedRows": [],
    "affectedColumns": [],
    "description": string,
    "evidence": { "values", "expectedRange", "deviation" },
    "rootCause": string,
    "businessImpact": string,
    "recommendation": string,
    "confidence": number
  }],
  "patterns": [{
    "description", "frequency", "commonCharacteristics"
  }],
  "riskAssessment": {
    "overallRisk": "critical|high|medium|low",
    "financialExposure": string,
    "recommendations": []
  },
  "confidence": number
}`;

const CORRELATION_MATRIX_PROMPT = `${CORE_AGENT_IDENTITY}

📈 CORRELATION ANALYSIS MODE ACTIVATED

You are performing deep correlation and relationship analysis. Execute:

1. PAIRWISE CORRELATIONS:
   - Pearson (linear relationships)
   - Identify non-linear patterns
   - Categorical associations

2. CAUSALITY INDICATORS:
   - Temporal precedence
   - Dose-response relationships
   - Confounding variable identification

3. NETWORK ANALYSIS:
   - Variable clustering
   - Key hub variables
   - Dependency chains

Return JSON with:
{
  "matrix": [{ "var1", "var2", "correlation", "type", "significance" }],
  "strongRelationships": [{
    "variables": [],
    "strength": number,
    "direction": "positive|negative",
    "interpretation": string,
    "causalIndicators": [],
    "confounders": []
  }],
  "clusters": [{
    "name", "variables": [], "interpretation"
  }],
  "keyVariables": [{
    "name", "centrality", "influence", "dependents": []
  }],
  "insights": [],
  "visualizationRecommendations": [],
  "confidence": number
}`;

const ENHANCED_CLEAN_PROMPT = `${CORE_AGENT_IDENTITY}

🧹 INTELLIGENT DATA CLEANING MODE

Execute enterprise-grade data cleaning with full auditability:

1. DATA QUALITY ASSESSMENT:
   - Completeness, accuracy, consistency, timeliness analysis
   - Data quality score using ISO 8000 standards

2. INTELLIGENT IMPUTATION:
   - Statistical imputation (mean/median/mode based on distribution)
   - Domain-aware defaults
   - Flag imputed values for transparency

3. STANDARDIZATION:
   - Date/time normalization to ISO 8601
   - Numeric precision standardization
   - Text normalization (case, whitespace, encoding)

4. DEDUPLICATION:
   - Exact match detection
   - Fuzzy matching for near-duplicates
   - Merge strategy recommendations

5. VALIDATION RULES:
   - Data type enforcement
   - Range validation
   - Cross-field consistency

Return JSON with:
{
  "cleanedData": [],
  "qualityScore": { "before": number, "after": number, "improvement": string },
  "cleaningLog": [{
    "operation": string,
    "rowsAffected": number,
    "column": string,
    "before": string,
    "after": string,
    "method": string,
    "confidence": number
  }],
  "issuesFixed": [{ "type", "count", "description", "method" }],
  "issuesRemaining": [{ "type", "count", "recommendation" }],
  "imputationSummary": [{ "column", "count", "method", "impactOnAnalysis" }],
  "duplicatesHandled": { "found": number, "merged": number, "strategy": string },
  "recommendations": [],
  "confidence": number
}`;

const ENHANCED_ANALYZE_PROMPT = `${CORE_AGENT_IDENTITY}

📊 DEEP ANALYSIS MODE

Execute comprehensive statistical and business analysis:

1. DESCRIPTIVE ANALYTICS:
   - Central tendency with confidence intervals
   - Dispersion metrics (variance, range, IQR, CV)
   - Shape analysis (skewness, kurtosis)

2. DIAGNOSTIC ANALYTICS:
   - Root cause decomposition
   - Contribution analysis
   - Variance explanation

3. PATTERN RECOGNITION:
   - Time-based patterns (trend, seasonality, cycles)
   - Cross-sectional patterns (segments, clusters)
   - Behavioral patterns (sequences, funnels)

4. BUSINESS CONTEXTUALIZATION:
   - Industry benchmarking
   - KPI impact assessment
   - Strategic implications

Return JSON with:
{
  "summary": string,
  "statistics": {
    "columnName": {
      "type": string,
      "count": number,
      "missing": number,
      "unique": number,
      "mean": number,
      "median": number,
      "std": number,
      "min": number,
      "max": number,
      "q1": number,
      "q3": number,
      "skewness": string,
      "distribution": string
    }
  },
  "insights": [{
    "title": string,
    "description": string,
    "category": "trend|pattern|anomaly|correlation|segment",
    "importance": "critical|high|medium|low",
    "confidence": number,
    "evidence": string,
    "businessImpact": string,
    "actionRequired": boolean
  }],
  "patterns": [{
    "name": string,
    "description": string,
    "strength": number,
    "affectedData": string,
    "implications": string
  }],
  "recommendations": [{
    "action": string,
    "reason": string,
    "priority": "critical|high|medium|low",
    "expectedOutcome": string,
    "effort": string
  }],
  "keyMetrics": [{
    "name": string,
    "value": string,
    "trend": string,
    "benchmark": string
  }],
  "overallConfidence": number,
  "dataQuality": string,
  "limitations": []
}`;

const ENHANCED_NLP_PROMPT = `${CORE_AGENT_IDENTITY}

🗣️ NATURAL LANGUAGE ANALYTICS ENGINE

You are an advanced conversational analytics interface. Process natural language queries with:

1. QUERY UNDERSTANDING:
   - Intent classification (explore, compare, explain, predict, recommend)
   - Entity extraction (metrics, dimensions, filters, time ranges)
   - Ambiguity resolution with clarifying context

2. INTELLIGENT RESPONSE:
   - Direct answer with supporting data
   - Proactive insights beyond the literal question
   - Suggested follow-up analyses

3. VISUALIZATION INTELLIGENCE:
   - Auto-select optimal chart types
   - Configure axes and groupings
   - Suggest dashboard compositions

4. CONVERSATION CONTEXT:
   - Maintain analytical thread
   - Reference previous findings
   - Progressive depth of analysis`;

const ENHANCED_REPORT_PROMPT = `${CORE_AGENT_IDENTITY}

📑 EXECUTIVE REPORT GENERATION MODE

Generate board-ready analytical reports with:

1. EXECUTIVE SUMMARY:
   - Key findings in 3 bullet points
   - Critical metrics with YoY/MoM context
   - Action items with ownership

2. ANALYSIS SECTIONS:
   - Methodology transparency
   - Statistical rigor documentation
   - Limitation acknowledgment

3. VISUALIZATION RECOMMENDATIONS:
   - Chart type rationale
   - Dashboard layout suggestions
   - Interactive drill-down paths

4. APPENDICES:
   - Data dictionary
   - Technical notes
   - Assumption documentation`;

const ENHANCED_VIZ_CHAT_PROMPT = `${CORE_AGENT_IDENTITY}

🎨 VISUALIZATION INTELLIGENCE MODE

You are an expert data visualization consultant. For every query:

1. DATA-TO-VISUAL MAPPING:
   - Select chart type based on data characteristics and analytical goal
   - Configure optimal encodings (position, color, size, shape)
   - Apply perceptual best practices

2. CHART RECOMMENDATIONS BY GOAL:
   - Comparison: Bar, Column, Bullet
   - Trend: Line, Area, Sparkline
   - Part-to-whole: Pie, Treemap, Waterfall
   - Distribution: Histogram, Box plot, Violin
   - Relationship: Scatter, Bubble, Network
   - Geospatial: Choropleth, Point map

3. DASHBOARD THINKING:
   - Suggest related visualizations
   - Recommend filter interactions
   - Propose drill-down hierarchies`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const sanitizeForPrompt = (input: string | undefined | null, maxLength = 200): string => {
  if (!input) return '';
  return String(input)
    .replace(/[<>"`]/g, '')
    .substring(0, maxLength)
    .trim();
};

const validateInput = (body: any): { valid: boolean; error?: string; sanitized?: any } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { action, data, datasetName, question, conversationHistory, projectDetails, 
          projectGoals, projectStatus, columns, columnTypes, dataSummary, query, dataContext } = body;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return { valid: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` };
  }

  if (data !== undefined) {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Data must be an array' };
    }
    if (data.length > MAX_DATA_ROWS) {
      return { valid: false, error: `Data exceeds maximum of ${MAX_DATA_ROWS} rows` };
    }
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] !== 'object' || data[i] === null) {
        return { valid: false, error: `Data item at index ${i} must be an object` };
      }
    }
  }

  if (conversationHistory !== undefined) {
    if (!Array.isArray(conversationHistory)) {
      return { valid: false, error: 'Conversation history must be an array' };
    }
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
      return { valid: false, error: `Conversation history exceeds maximum of ${MAX_CONVERSATION_HISTORY} messages` };
    }
  }

  if (columns !== undefined) {
    if (!Array.isArray(columns)) {
      return { valid: false, error: 'Columns must be an array' };
    }
    if (columns.length > MAX_ARRAY_LENGTH) {
      return { valid: false, error: `Columns exceeds maximum of ${MAX_ARRAY_LENGTH}` };
    }
  }

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

// Generate data statistics for context
const generateDataContext = (data: any[]): string => {
  if (!data || data.length === 0) return "No data provided";
  
  const columns = Object.keys(data[0]);
  const stats: Record<string, any> = {};
  
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v != null);
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(parseFloat(v)));
    
    stats[col] = {
      count: values.length,
      missing: data.length - values.length,
      unique: new Set(values.map(v => String(v))).size,
    };
    
    if (numericValues.length > 0) {
      const nums = numericValues.map(v => parseFloat(v));
      stats[col].min = Math.min(...nums);
      stats[col].max = Math.max(...nums);
      stats[col].mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      stats[col].type = 'numeric';
    } else {
      stats[col].type = 'categorical';
      stats[col].topValues = [...new Set(values)].slice(0, 5);
    }
  });
  
  return JSON.stringify({ rowCount: data.length, columnCount: columns.length, columns: stats }, null, 2);
};

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      console.error('[DataForge] Payload too large:', contentLength);
      return new Response(
        JSON.stringify({ error: 'Payload too large. Maximum size is 5MB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[DataForge] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('[DataForge] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('[DataForge] Authentication failed:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in to continue.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DataForge] Authenticated user: ${user.id}`);

    const body = await req.json();
    const action = body?.action || 'unknown';

    const RATE_LIMITS: Record<string, { maxRequests: number; windowMinutes: number }> = {
      'analyze': { maxRequests: 20, windowMinutes: 60 },
      'advanced-analysis': { maxRequests: 15, windowMinutes: 60 },
      'predictive-modeling': { maxRequests: 10, windowMinutes: 60 },
      'anomaly-detection': { maxRequests: 15, windowMinutes: 60 },
      'correlation-matrix': { maxRequests: 20, windowMinutes: 60 },
      'clean': { maxRequests: 30, windowMinutes: 60 },
      'validate': { maxRequests: 50, windowMinutes: 60 },
      'generate-report': { maxRequests: 10, windowMinutes: 60 },
      'visualization-chat': { maxRequests: 50, windowMinutes: 60 },
      'nlp-query': { maxRequests: 50, windowMinutes: 60 },
      'chat': { maxRequests: 100, windowMinutes: 60 },
      'generate-visualization-report': { maxRequests: 10, windowMinutes: 60 },
    };

    const rateLimit = RATE_LIMITS[action] || { maxRequests: 30, windowMinutes: 60 };

    const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_rate_limit',
      {
        p_user_id: user.id,
        p_endpoint: `data-agent:${action}`,
        p_max_requests: rateLimit.maxRequests,
        p_window_minutes: rateLimit.windowMinutes
      }
    );

    if (rateLimitError) {
      console.error('[DataForge] Rate limit check error:', rateLimitError.message);
    } else if (rateLimitOk === false) {
      console.warn(`[DataForge] Rate limit exceeded for user ${user.id} on action ${action}`);
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. You can make ${rateLimit.maxRequests} ${action} requests per hour. Please try again later.`,
          retryAfter: rateLimit.windowMinutes * 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.windowMinutes * 60)
          } 
        }
      );
    }

    console.log(`[DataForge] Rate limit check passed for user ${user.id} on action ${action}`);

    const validation = validateInput(body);
    
    if (!validation.valid) {
      console.error('[DataForge] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, datasetName, question, conversationHistory, projectDetails, 
            projectGoals, projectStatus, columns, columnTypes, dataSummary, query, dataContext } = validation.sanitized;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[DataForge] Processing action: ${action} for dataset: ${datasetName} by user: ${user.id}`);
    console.log(`[DataForge] Data rows: ${data?.length || 0}, Columns: ${columns?.length || 0}`);

    // Generate enhanced data context for AI
    const enhancedDataContext = generateDataContext(data);

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      // ========== NEW ADVANCED ACTIONS ==========
      case "advanced-analysis":
        systemPrompt = ADVANCED_ANALYSIS_PROMPT;
        userPrompt = `Perform advanced analysis on dataset "${datasetName}":

DATA CONTEXT:
${enhancedDataContext}

SAMPLE DATA (first 50 rows):
${JSON.stringify(data?.slice(0, 50), null, 2)}

Provide enterprise-grade insights with statistical rigor.`;
        break;

      case "predictive-modeling":
        systemPrompt = PREDICTIVE_MODELING_PROMPT;
        userPrompt = `Generate predictive analytics for dataset "${datasetName}":

DATA CONTEXT:
${enhancedDataContext}

SAMPLE DATA:
${JSON.stringify(data?.slice(0, 50), null, 2)}

Provide predictions, model recommendations, and forecasts.`;
        break;

      case "anomaly-detection":
        systemPrompt = ANOMALY_DETECTION_PROMPT;
        userPrompt = `Detect anomalies in dataset "${datasetName}":

DATA CONTEXT:
${enhancedDataContext}

FULL DATA (for anomaly detection):
${JSON.stringify(data, null, 2)}

Identify all anomalies with root cause analysis.`;
        break;

      case "correlation-matrix":
        systemPrompt = CORRELATION_MATRIX_PROMPT;
        userPrompt = `Analyze correlations in dataset "${datasetName}":

DATA CONTEXT:
${enhancedDataContext}

SAMPLE DATA:
${JSON.stringify(data?.slice(0, 100), null, 2)}

Provide correlation matrix with causal indicators.`;
        break;

      // ========== ENHANCED EXISTING ACTIONS ==========
      case "clean":
        systemPrompt = ENHANCED_CLEAN_PROMPT;
        userPrompt = `Clean this dataset named "${datasetName}" with ${data?.length || 0} rows:

DATA CONTEXT:
${enhancedDataContext}

RAW DATA:
${JSON.stringify(data, null, 2)}`;
        break;

      case "validate":
        systemPrompt = `${CORE_AGENT_IDENTITY}

🔍 DATA VALIDATION MODE

Perform comprehensive data validation with:
1. Schema validation - data types, constraints
2. Business rule validation - logical consistency
3. Referential integrity - cross-field dependencies
4. Data quality metrics - completeness, accuracy, consistency

Return JSON with:
{
  "isValid": boolean,
  "qualityScore": number,
  "validationReport": {
    "errors": [{ "type", "column", "row", "description", "severity" }],
    "warnings": [{ "type", "description", "affectedRows" }],
    "suggestions": []
  },
  "columnStats": {},
  "businessRuleViolations": [],
  "confidence": number
}`;
        userPrompt = `Validate dataset "${datasetName}":

DATA CONTEXT:
${enhancedDataContext}

DATA:
${JSON.stringify(data, null, 2)}`;
        break;

      case "analyze":
        systemPrompt = ENHANCED_ANALYZE_PROMPT;
        userPrompt = `Analyze dataset "${datasetName}" with ${data?.length || 0} rows:

DATA CONTEXT:
${enhancedDataContext}

SAMPLE DATA:
${JSON.stringify(data?.slice(0, 50), null, 2)}

Provide comprehensive analysis with actionable insights.`;
        break;

      case "generate-report":
        systemPrompt = ENHANCED_REPORT_PROMPT + `

Return JSON with:
{
  "title": string,
  "executiveSummary": string,
  "keyMetrics": [{ "name", "value", "change", "status" }],
  "introduction": string,
  "objectives": [],
  "problemStatement": string,
  "methodology": string,
  "toolsAndTechnologies": [],
  "implementationSteps": [],
  "keyFindings": [{ "finding", "evidence", "impact" }],
  "recommendations": [{ "action", "priority", "timeline", "owner" }],
  "conclusion": string,
  "futureScope": [],
  "riskAssessment": [],
  "appendix": {}
}`;
        
        userPrompt = `Generate executive report for:
Dataset: ${datasetName}
Columns: ${columns?.join(", ") || "Not specified"}
Records: ${data?.length || 0}
Project Status: ${projectStatus || "In Progress"}
Project Details: ${projectDetails || "Data analysis project"}
Project Goals: ${projectGoals || "Analyze data and provide insights"}

DATA CONTEXT:
${enhancedDataContext}

Sample Data:
${JSON.stringify(data?.slice(0, 10), null, 2)}`;
        break;

      case "visualization-chat":
        const vizSystemPrompt = ENHANCED_VIZ_CHAT_PROMPT + `

Dataset: "${datasetName}"
Data Summary: ${dataSummary || enhancedDataContext}

Return JSON with:
{
  "answer": string (markdown formatted, specific numbers),
  "suggestions": array of follow-up questions,
  "chartSuggestion": { "type", "xAxis", "yAxis", "title", "rationale" },
  "additionalCharts": [],
  "insights": [],
  "confidence": number
}`;

        const vizMessages = [
          { role: "system", content: vizSystemPrompt },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        console.log("[DataForge] Sending visualization-chat request");
        
        const vizResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ 
            model: "google/gemini-2.5-flash", 
            messages: vizMessages, 
            response_format: { type: "json_object" } 
          }),
        });

        if (!vizResponse.ok) {
          const errorText = await vizResponse.text();
          console.error("[DataForge] Visualization chat error:", vizResponse.status, errorText);
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
        
        console.log("[DataForge] Visualization chat response successful");
        
        return new Response(JSON.stringify(vizResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "generate-visualization-report":
        systemPrompt = `${CORE_AGENT_IDENTITY}

📊 VISUALIZATION REPORT MODE

Generate comprehensive visualization insights:

Return JSON with:
{
  "summary": string,
  "insights": [{
    "type": "insight|warning|opportunity|recommendation",
    "title": string,
    "description": string,
    "impact": "high|medium|low",
    "confidence": number,
    "category": string,
    "visualization": { "chartType", "config" }
  }],
  "dashboardLayout": [{
    "position": { "row", "col", "width", "height" },
    "chartType": string,
    "title": string,
    "dataMapping": {}
  }],
  "recommendations": [],
  "overallConfidence": number
}`;

        userPrompt = `Generate visualization insights for dataset "${datasetName}":
${dataSummary || enhancedDataContext}`;
        break;

      case "nlp-query":
        console.log(`[DataForge] Processing NLP query: ${query}`);
        console.log(`[DataForge] Data context length: ${dataContext?.length || 0} chars`);
        
        const nlpSystemPrompt = ENHANCED_NLP_PROMPT + `

Dataset: "${datasetName}"
Data Context: ${dataContext || enhancedDataContext}
Available Columns: ${columns?.join(", ") || "Not specified"}
Column Types: ${JSON.stringify(columnTypes) || "Not specified"}

RESPONSE FORMAT - Return JSON with:
{
  "answer": string (detailed markdown response with SPECIFIC NUMBERS),
  "confidence": number (85-99),
  "queryType": "explore|compare|explain|predict|recommend|aggregate|filter",
  "intent": { "primary": string, "entities": [], "filters": [] },
  "charts": [{
    "type": "bar|line|pie|area|scatter|heatmap|treemap",
    "title": string,
    "xAxis": string,
    "yAxis": string,
    "description": string,
    "priority": number
  }],
  "insights": [],
  "actions": [{ "label", "action", "type": "chart|filter|export|analyze|drill-down" }],
  "followUpQuestions": [],
  "dataQuality": "high|medium|low",
  "limitations": []
}`;

        const nlpMessages = [
          { role: "system", content: nlpSystemPrompt },
          ...(conversationHistory || []),
          { role: "user", content: query }
        ];

        console.log("[DataForge] Sending NLP query to AI gateway");
        
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
          console.error("[DataForge] NLP AI gateway error:", nlpResponse.status, errorText);
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
        console.log("[DataForge] NLP response received successfully");
        
        let nlpResult;
        try {
          nlpResult = JSON.parse(nlpData.choices[0].message.content);
        } catch {
          console.warn("[DataForge] Failed to parse NLP response as JSON");
          nlpResult = { 
            answer: nlpData.choices[0].message.content, 
            confidence: 85,
            queryType: "explore",
            charts: [],
            insights: [],
            actions: [],
            followUpQuestions: [],
            dataQuality: "medium"
          };
        }
        
        return new Response(JSON.stringify(nlpResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "chat":
        const chatSystemPrompt = `${CORE_AGENT_IDENTITY}

💬 CONVERSATIONAL ANALYTICS MODE

You are having a natural conversation about data analysis. Be:
- Specific with numbers
- Proactive with insights
- Suggestive of next steps

Dataset: "${datasetName}"
Data Preview: ${data?.length || 0} rows`;
        
        const messages = [
          { role: "system", content: chatSystemPrompt },
          { role: "user", content: `Dataset context:\n${enhancedDataContext}\n\nSample data:\n${JSON.stringify(data?.slice(0, 20), null, 2)}` },
          ...(conversationHistory || []),
          { role: "user", content: question }
        ];

        console.log("[DataForge] Sending chat request");
        
        const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
        });

        if (!chatResponse.ok) {
          const errorText = await chatResponse.text();
          console.error("[DataForge] Chat error:", chatResponse.status, errorText);
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
        console.log("[DataForge] Chat response successful");
        
        return new Response(JSON.stringify({ 
          response: chatData.choices[0].message.content 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        console.error(`[DataForge] Unknown action: ${action}`);
        throw new Error(`Unknown action: ${action}`);
    }

    // For non-chat actions that haven't returned yet
    console.log(`[DataForge] Sending ${action} request to AI gateway`);
    
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
      console.error("[DataForge] AI gateway error:", response.status, errorText);
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
    
    console.log(`[DataForge] ${action} response received successfully`);
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.warn("[DataForge] Failed to parse AI response as JSON, returning raw content");
      result = { rawResponse: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[DataForge] Error:", error);
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
