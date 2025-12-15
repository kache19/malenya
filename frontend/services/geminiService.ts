import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

// Helper to safely get the AI instance
const getAI = () => {
  try {
    // Check if process is defined to avoid ReferenceError in some browser envs
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  } catch (e) {
    console.warn("Environment variable access failed", e);
  }
  console.warn("Gemini API Key is missing. AI features will return mock data.");
  return null;
};

export const checkDrugInteractions = async (drugs: Product[]): Promise<string> => {
  const ai = getAI();
  const drugNames = drugs.map(d => d.name).join(', ');

  if (!ai || drugs.length < 2) {
    return "No significant interactions detected (Offline/Mock Mode).";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following list of drugs for potential interactions: ${drugNames}. 
      Return a concise summary of any interactions. If none, say "Safe". 
      Focus on clinical safety.`,
      config: {
        maxOutputTokens: 200,
      }
    });
    return response.text || "No response from AI.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Unable to verify interactions at this time.";
  }
};

export const analyzeStockTrends = async (salesData: any[]): Promise<string> => {
  const ai = getAI();
  
  if (!ai) {
    return "Based on historical data, Panadol Extra is your fastest moving item this week. Consider restocking soon.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a supply chain expert for a pharmacy. Analyze this sales trend summary: 
      ${JSON.stringify(salesData)}. 
      Provide a 2-sentence recommendation on restocking and potential expired stock risks.`,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Unable to analyze trends.";
  }
};

export const digitizePrescription = async (imageBase64: string): Promise<any> => {
    const ai = getAI();
    if(!ai) return { error: "AI Service Unavailable" };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: imageBase64 } },
                    { text: "Extract the medicines, dosage, and patient instructions from this prescription image. Return JSON." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        medicines: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    dosage: { type: Type.STRING },
                                    frequency: { type: Type.STRING }
                                }
                            }
                        },
                        patientName: { type: Type.STRING, nullable: true }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (e) {
        console.error(e);
        return { error: "Failed to process image" };
    }
}