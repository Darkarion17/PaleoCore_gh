import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Core, Section, DataPoint, Microfossil, PartialMicrofossil, Taxonomy, EcologicalData, TiePoint, SectionFossilRecord, IdentifiedFossil, FeedbackCorrection, ReinforcementFeedback, Source } from '../types';
import type { GenerateContentResponse } from "@google/genai";


// ALWAYS use the pre-configured process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateReportCoverImage = async (core: Core): Promise<string | null> => {
    try {
        const prompt = `An abstract, artistic data visualization inspired by oceanic sediment cores from project "${core.project}". Use deep blues, sandy and earthy textures, and clearly defined layered patterns representing geological time. Evoke a sense of scientific discovery and deep-sea exploration. Style: minimal, elegant, high-resolution digital art, abstract background.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // "Nano Banana"
            contents: {
                parts: [{ text: prompt }],
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Nano Banana (Gemini) Cover Image Generation Error:", error);
        return null;
    }
};

export const identifyFossilsInImage = async (
    base64Image: string,
    mimeType: string,
    context: { geologicalAge?: string; location?: string; visibleFeatures?: string; },
    corrections?: FeedbackCorrection[],
    reinforcements?: ReinforcementFeedback[]
): Promise<IdentifiedFossil[]> => {
    const prompt = `
        Identify the microfossil(s) in this image.
        Context:
        - Geological Age: ${context.geologicalAge || 'Unknown'}
        - Location: ${context.location || 'Unknown'}
        - User Observations: ${context.visibleFeatures || 'None'}
        
        ${corrections && corrections.length > 0 ? `Corrections from previous attempts (learn from these): ${JSON.stringify(corrections)}` : ''}

        Return a JSON array of identified species. For each, provide:
        - speciesName: Genus and species (e.g., Globigerinoides ruber)
        - confidenceScore: 0-100
        - sourceImageUrl: A URL to a reference image from a reliable scientific source (or null if not found)
        - analysis: Object with 'matchingFeatures' (array of strings) and 'distinguishingFeatures' (array of strings) describing why it matches.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Image } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }], // Use Google Search to verify species and find reference images
        }
    });

    try {
        const text = response.text || "[]";
        // Clean markdown code blocks if present
        const jsonText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse fossil identification", e);
        return [];
    }
};

export const findFossilPublications = async (fossilName: string): Promise<{ summary: string; sources: Source[] }> => {
    const prompt = `Find recent and seminal scientific publications regarding the microfossil species "${fossilName}". Summarize key findings regarding its use as a paleoceanographic proxy.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    let sources: Source[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = response.candidates[0].groundingMetadata.groundingChunks
            .filter(c => c.web && c.web.uri && c.web.title)
            .map(c => ({ uri: c.web!.uri!, title: c.web!.title! }));
    }

    return {
        summary: response.text || "No summary available.",
        sources
    };
};

export const analyzeFossilAssemblage = async (section: Section, microfossils: Microfossil[]): Promise<string> => {
    const fossilData = section.microfossilRecords.map(r => {
        const fossil = microfossils.find(f => f.id === r.fossilId);
        return {
            species: r.fossilId,
            abundance: r.abundance,
            ecology: fossil?.ecology
        };
    });

    const prompt = `
        Analyze the following microfossil assemblage from a sediment core section (${section.epoch}, ${section.ageRange}).
        
        Assemblage Data:
        ${JSON.stringify(fossilData, null, 2)}
        
        Provide a concise paleoenvironmental interpretation. What does this assemblage suggest about:
        1. Sea Surface Temperature (SST)
        2. Productivity / Nutrient levels
        3. Water depth / Dissolution (if relevant)
        
        Keep it scientific but accessible.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    return response.text || "Analysis failed.";
};

export const suggestAgeFromFossils = async (
    records: SectionFossilRecord[],
    allFossils: Microfossil[]
): Promise<{ epoch: string; ageRange: string }> => {
    const speciesList = records.map(r => r.fossilId).join(', ');
    const prompt = `
        Given the following microfossil assemblage: ${speciesList}.
        Suggest the most likely geological Epoch and Age Range (in Ma).
        Return JSON: { "epoch": "string", "ageRange": "string" }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    try {
        const text = response.text || "{}";
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
        console.error("Age suggestion parse error", e);
        return { epoch: '', ageRange: '' };
    }
};

export const getAnalysisFromAIStream = async (section: Section, query: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `You are the PaleoAI Assistant, an expert in paleoceanography and micropaleontology. Your task is to answer questions about a specific sediment section, using the provided context. Use the search tool for up-to-date information or to find relevant scientific literature to support your answers. Always cite your sources if you use the search tool. The user is a scientific expert, so provide detailed, data-driven answers.`;

    const dataForPrompt = {
        coreId: section.core_id,
        sectionName: section.name,
        ageRange: section.ageRange,
        epoch: section.epoch,
        dataSummary: {
            pointCount: section.dataPoints.length,
            availableProxies: Object.keys(section.dataPoints[0] || {}),
        },
        microfossilSummary: section.microfossilRecords.map(r => r.fossilId).join(', '),
    };

    const prompt = `
        Context for section ${section.name}:
        ${JSON.stringify(dataForPrompt, null, 2)}

        User's question: ${query}
    `;
    
    const response = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }],
        },
    });

    return response;
};

// --- NEW FEATURES ---

export const analyzeSectionImage = async (
    base64Image: string,
    mimeType: string
): Promise<{
    lithology: string;
    munsellColor: string;
    grainSize: string;
    tephraLayers: string;
    observations: string;
}> => {
    const prompt = `
        Analyze this image of a sediment core section.
        Act as an expert sedimentologist.
        Identify the following characteristics based on visual inspection:
        1. Lithology (e.g., Nannofossil Ooze, Clay, Silty Sand)
        2. Munsell Color Code (estimate the closest standard code, e.g., 10YR 5/3)
        3. Grain Size (e.g., Fine, Coarse, Mud-sized)
        4. Tephra Layers (describe any visible dark bands or volcanic ash layers)
        5. General visual observations (bioturbation, mottling, laminations).

        Return JSON format:
        {
            "lithology": "string",
            "munsellColor": "string",
            "grainSize": "string",
            "tephraLayers": "string (or 'None')",
            "observations": "string"
        }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Image } },
                { text: prompt }
            ]
        },
        config: { responseMimeType: 'application/json' }
    });

    try {
        const text = response.text || "{}";
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
        console.error("Lithology analysis parse error", e);
        throw new Error("Failed to parse AI analysis results.");
    }
};

export const digitizeFieldNotes = async (
    base64Image: string,
    mimeType: string
): Promise<DataPoint[]> => {
    const prompt = `
        Transcribe this image of a handwritten or printed field note table into structured data.
        Look for columns representing 'Depth' (or mbsf) and other data like 'Description', 'Color', or proxy values.
        
        Return a JSON array of objects, where each object represents a row.
        Map the depth column to key 'depth' (number).
        Map any identifier to 'subsection' (string). If none, generate one like "Row_1".
        Map description to 'observations' (string).
        Include any other numeric columns found as keys (e.g., 'susceptibility', 'color_reflectance').
        
        Example Output:
        [
            { "subsection": "1-1", "depth": 0.5, "observations": "Silty clay" },
            ...
        ]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Image } },
                { text: prompt }
            ]
        },
        config: { responseMimeType: 'application/json' }
    });

    try {
        const text = response.text || "[]";
        const data = JSON.parse(text.replace(/```json|```/g, '').trim());
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Digitization parse error", e);
        throw new Error("Failed to digitize notes.");
    }
};
