import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof import('web-push');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface VehicleContext {
  vehicleType?: 'car' | 'motorcycle';
  make: string;
  model: string;
  year: number;
  powertrain: string;
  engineDisplacementCc?: number;
  odometerKm: number;
}

interface HistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface MediaPayload {
  mimeType: string;
  data: string; // base64 without data: prefix
}

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'Portuguese (Português)',
  en: 'English',
  es: 'Spanish (Español)',
  de: 'German (Deutsch)',
  fr: 'French (Français)',
};

function safeHttpUrl(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

const RATE_LIMIT_MESSAGES: Record<string, string> = {
  pt: 'Limite temporário de uso gratuito da IA atingido. Aguarde cerca de 1 minuto e tente novamente.',
  en: 'Temporary free-tier AI quota limit reached. Please wait about 1 minute and try again.',
  es: 'Límite temporal de uso gratuito de la IA alcanzado. Espera 1 minuto e inténtalo de nuevo.',
  de: 'Temporäres kostenloses KI-Kontingent erreicht. Bitte warte etwa 1 Minute und versuche es erneut.',
  fr: 'Limite temporaire du quota gratuit IA atteinte. Patientez environ 1 minute et réessayez.',
};

const HIGH_DEMAND_MESSAGES: Record<string, string> = {
  pt: 'Os servidores gratuitos da IA estão com pico momentâneo de acessos. Aguarde alguns segundos e tente novamente.',
  en: 'The free AI servers are experiencing a temporary traffic spike. Please wait a few seconds and try again.',
  es: 'Los servidores gratuitos de IA tienen un pico temporal de demanda. Espera unos segundos e inténtalo de nuevo.',
  de: 'Die kostenlosen KI-Server verzeichnen gerade hohe Auslastung. Bitte warte ein paar Sekunden und versuche es erneut.',
  fr: 'Les serveurs IA gratuits connaissent un pic temporaire de trafic. Veuillez patienter quelques secondes et réessayer.',
};

function isTransientUnavailableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.toLowerCase().includes('high demand') ||
    msg.toLowerCase().includes('overloaded')
  );
}

async function generateWithResilience(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      ...params,
    });
  } catch (firstErr) {
    if (!isTransientUnavailableError(firstErr)) throw firstErr;
    await new Promise((resolve) => setTimeout(resolve, 900));
    try {
      return await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        ...params,
      });
    } catch (secondErr) {
      if (!isTransientUnavailableError(secondErr)) throw secondErr;
      const fallbackConfig = params.config
        ? {
            ...params.config,
            ...(params.config.thinkingConfig
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
              : {}),
          }
        : undefined;
      return await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: params.contents,
        ...(fallbackConfig ? { config: fallbackConfig } : {}),
      });
    }
  }
}

function sendGeminiError(
  res: Response,
  error: unknown,
  langCode: string,
  fallbackMessage: string
): void {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  if (
    rawMessage.includes('429') ||
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMessage.toLowerCase().includes('quota')
  ) {
    res.status(429).json({
      error: RATE_LIMIT_MESSAGES[langCode] ?? RATE_LIMIT_MESSAGES.pt,
    });
    return;
  }
  if (isTransientUnavailableError(error)) {
    res.status(503).json({
      error: HIGH_DEMAND_MESSAGES[langCode] ?? HIGH_DEMAND_MESSAGES.pt,
    });
    return;
  }
  res.status(500).json({ error: rawMessage || fallbackMessage });
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'AutoLife World API' });
  });

  // Multimodal AI Mechanic (Text + optional Image or Audio clip)
  app.post('/api/mechanic/diagnose', async (req: Request, res: Response) => {
    const { message, history, vehicle, language, media } = req.body as {
      message?: string;
      history?: HistoryTurn[];
      vehicle?: VehicleContext;
      language?: string;
      media?: MediaPayload;
    };

    const hasMedia = Boolean(media && media.mimeType && media.data);
    if ((!message || typeof message !== 'string' || !message.trim()) && !hasMedia) {
      res.status(400).json({ error: 'Symptom text, photo, or audio clip is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];

    const isMoto = vehicle?.vehicleType === 'motorcycle';
    const ccLabel = vehicle?.engineDisplacementCc ? `, ${vehicle.engineDisplacementCc}cc` : '';
    const vehicleDescription = vehicle
      ? `${isMoto ? 'Motorcycle' : 'Passenger Car'}: ${vehicle.make} ${vehicle.model} (${vehicle.year}${ccLabel}), Powertrain: ${vehicle.powertrain}, Current Odometer: ${vehicle.odometerKm} km`
      : 'General passenger car or motorcycle';

    const priorConversation = Array.isArray(history)
      ? history
          .slice(-6)
          .map((turn) => `${turn.role === 'user' ? 'Driver' : 'AI Mechanic'}: ${turn.text}`)
          .join('\n')
      : '';

    const systemInstruction = `You are the AutoLife World Master Automotive, Motorcycle & EV Engineer and Preventive Care Advisor.
You possess deep global OEM engineering mastery across passenger cars, commercial vans, electric/hybrid vehicles, and motorcycles worldwide (Japanese, European, American, Chinese, Indian, and Brazilian markets).
Respond strictly in ${targetLanguage}.
Active vehicle context: ${vehicleDescription}.

Core safety & engineering principles you MUST always obey:
1. Be clear, calm, practical, and accessible to everyday drivers/riders regardless of mechanical experience, while backing your reasoning with real OEM engineering insight (known platform quirks, factory TSB/recall patterns, cooling/lubrication/electrical tolerances).
2. If an image (e.g. dashboard warning light, tire tread, drive chain/sprocket, brake caliper, fluid tank, battery display) or an audio clip (e.g. brake squeal, chain rattle, valve tick, belt chirp, engine knock, inverter whine) is provided, analyze it directly and reference what you observe or hear.
3. NEVER advise opening a hot coolant reservoir or radiator cap. Always instruct checking coolant visually on the translucent reservoir markings only when the engine is completely cold.
4. For motorcycles: emphasize JASO MA/MA2 wet-clutch oil rules (never car friction-modified oil), checking oil upright on flat ground (or sight glass procedure), drive chain slack (20–30 mm) and NEVER lubing/cleaning a chain with the engine running or in gear, independent front/rear cold tire PSI, fork seal leaks, steering head bearings, and Euro5 6-pin diagnostic adapters when applicable.
5. For electric cars/motorcycles and hybrids: warn against touching high-voltage orange components, explain LFP vs NMC charging/thermal behavior and 12V auxiliary battery impact on EVs, and note that deep battery SoH / OBD2 fault telemetry requires certified diagnostic tools or OEM integration.
6. Always remind drivers/riders to consult their vehicle manufacturer's owner manual for exact fluid specs, tire pressures, and torque/service intervals.
7. Differentiate clearly between normal preventive checks and urgent safety hazards (brakes, steering, chain tension, overheating, high-voltage faults).`;

    const driverText = message?.trim() || 'Please inspect the attached vehicle photo or audio clip.';
    const promptContent = priorConversation
      ? `Previous conversation:\n${priorConversation}\n\nDriver's current question: ${driverText}`
      : `Driver's question: ${driverText}`;

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (hasMedia && media) {
        parts.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data,
          },
        });
      }
      parts.push({ text: promptContent });

      const response = await generateWithResilience(ai, {
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Clear 2-3 sentence diagnostic explanation in the requested language.',
              },
              urgency: {
                type: Type.STRING,
                description: "Must be one of: 'safe', 'attention', or 'urgent'.",
              },
              urgencyLabel: {
                type: Type.STRING,
                description: 'Short human-readable urgency label in the requested language.',
              },
              possibleCauses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 realistic mechanical or electrical causes.',
              },
              safeChecks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  '2 to 4 safe visual checks the driver can perform without risk.',
              },
              whenToVisitWorkshop: {
                type: Type.STRING,
                description:
                  'Concrete threshold indicating when to stop driving or visit a certified workshop.',
              },
            },
            required: [
              'summary',
              'urgency',
              'urgencyLabel',
              'possibleCauses',
              'safeChecks',
              'whenToVisitWorkshop',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response received from Gemini API.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      const normalizedUrgency =
        parsed.urgency === 'urgent' || parsed.urgency === 'attention' || parsed.urgency === 'safe'
          ? parsed.urgency
          : 'attention';

      res.json({
        summary: String(parsed.summary ?? ''),
        urgency: normalizedUrgency,
        urgencyLabel: String(parsed.urgencyLabel ?? ''),
        possibleCauses: Array.isArray(parsed.possibleCauses)
          ? parsed.possibleCauses.map(String)
          : [],
        safeChecks: Array.isArray(parsed.safeChecks) ? parsed.safeChecks.map(String) : [],
        whenToVisitWorkshop: String(parsed.whenToVisitWorkshop ?? ''),
      });
    } catch (error) {
      console.error('Gemini Mechanic API error:', error);
      sendGeminiError(res, error, langCode, 'Unexpected error calling Gemini API.');
    }
  });

  // Zero-Friction Photo Scanner (Service Receipt OR Dashboard Odometer/Warning Light)
  app.post('/api/vision/scan', async (req: Request, res: Response) => {
    const { image, mode, language } = req.body as {
      image?: MediaPayload;
      mode?: 'receipt' | 'dashboard';
      language?: string;
    };

    if (!image || !image.mimeType || !image.data) {
      res.status(400).json({ error: 'Image payload is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];
    const scanMode = mode === 'dashboard' ? 'dashboard' : 'receipt';

    const promptText =
      scanMode === 'dashboard'
        ? `Analyze this car or motorcycle dashboard photo. Extract the exact odometer mileage in km (convert from miles if needed, or return 0 if unreadable), identify any illuminated warning lights (ABS, MIL/FI, oil, temp), and summarize recommended action in ${targetLanguage}.`
        : `Analyze this car or motorcycle workshop service receipt, invoice, or maintenance slip. Extract the workshop/station name, total cost (numeric), odometer reading if printed (0 if not visible), matching maintenance category ('oil', 'coolant', 'tires', 'battery', 'brakes', 'documentation', 'revision', 'timing_belt', 'chain_drive', or 'suspension'), and concise service notes in ${targetLanguage}.`;

    try {
      const response = await generateWithResilience(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              odometerKm: {
                type: Type.NUMBER,
                description: 'Extracted odometer value in km, or 0 if not visible.',
              },
              cost: {
                type: Type.NUMBER,
                description: 'Extracted total monetary amount, or 0 if not applicable.',
              },
              workshopName: {
                type: Type.STRING,
                description: 'Workshop, dealership, or station name if visible.',
              },
              category: {
                type: Type.STRING,
                description:
                  "Closest maintenance category: 'oil', 'coolant', 'tires', 'battery', 'brakes', 'documentation', 'revision', 'timing_belt', 'chain_drive', or 'suspension'.",
              },
              summaryNotes: {
                type: Type.STRING,
                description: `Concise extracted details or warning light explanation in ${targetLanguage}.`,
              },
            },
            required: ['odometerKm', 'cost', 'workshopName', 'category', 'summaryNotes'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini Vision.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({
        odometerKm: Number(parsed.odometerKm) || 0,
        cost: Number(parsed.cost) || 0,
        workshopName: String(parsed.workshopName ?? ''),
        category: String(parsed.category ?? 'revision'),
        summaryNotes: String(parsed.summaryNotes ?? ''),
      });
    } catch (error) {
      console.error('Gemini Vision scan error:', error);
      sendGeminiError(res, error, langCode, 'Failed to scan image with Gemini API.');
    }
  });

  // Workshop Quote Auditor (compares quote against vehicle mileage & service history)
  app.post('/api/mechanic/audit-quote', async (req: Request, res: Response) => {
    const { quoteText, image, vehicle, recentLogs, language } = req.body as {
      quoteText?: string;
      image?: MediaPayload;
      vehicle?: VehicleContext;
      recentLogs?: Array<{ date: string; odometerKm: number; title: string; cost: number }>;
      language?: string;
    };

    const hasImage = Boolean(image && image.mimeType && image.data);
    if ((!quoteText || !quoteText.trim()) && !hasImage) {
      res.status(400).json({ error: 'Quote text or quote photo is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];
    const vehicleDesc = vehicle
      ? `${vehicle.vehicleType === 'motorcycle' ? 'Motorcycle' : 'Car'}: ${vehicle.make} ${vehicle.model} (${vehicle.year}${vehicle.engineDisplacementCc ? `, ${vehicle.engineDisplacementCc}cc` : ''}), ${vehicle.powertrain}, ${vehicle.odometerKm} km`
      : 'Passenger car or motorcycle';
    const logsSummary =
      Array.isArray(recentLogs) && recentLogs.length > 0
        ? recentLogs
            .slice(0, 10)
            .map((l) => `- ${l.date} @ ${l.odometerKm} km: ${l.title} (${l.cost})`)
            .join('\n')
        : 'No prior service logs recorded.';

    const prompt = `Audit this workshop quote for a ${vehicle?.vehicleType === 'motorcycle' ? 'motorcycle rider / fleet manager' : 'car driver / fleet manager'} in ${targetLanguage}.
Vehicle: ${vehicleDesc}
Recorded Maintenance History:
${logsSummary}

Workshop Quote Details:
${quoteText?.trim() || 'See attached quote photo.'}

Cross-check every line item against the vehicle's odometer and recent service history. Flag any unnecessary upsells, vague flush packages, or items serviced recently. Provide 3 sharp technical questions the owner should ask the mechanic before approving.`;

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (hasImage && image) {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
      }
      parts.push({ text: prompt });

      const response = await generateWithResilience(ai, {
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallVerdict: {
                type: Type.STRING,
                description: "Must be 'fair', 'review_items', or 'overpriced_or_duplicate'.",
              },
              verdictLabel: {
                type: Type.STRING,
                description: `Short verdict label in ${targetLanguage}.`,
              },
              summary: {
                type: Type.STRING,
                description: `2-3 sentence overall engineering review in ${targetLanguage}.`,
              },
              itemizedAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemName: { type: Type.STRING },
                    assessment: {
                      type: Type.STRING,
                      description: "Must be 'necessary', 'questionable', or 'recently_serviced'.",
                    },
                    reason: { type: Type.STRING },
                  },
                },
              },
              questionsForMechanic: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'overallVerdict',
              'verdictLabel',
              'summary',
              'itemizedAnalysis',
              'questionsForMechanic',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini API.' });
        return;
      }
      res.json(JSON.parse(rawText));
    } catch (error) {
      console.error('Quote audit error:', error);
      sendGeminiError(res, error, langCode, 'Failed to audit workshop quote.');
    }
  });

  // OBD2 / DTC Fault Code Decoder
  app.post('/api/mechanic/decode-dtc', async (req: Request, res: Response) => {
    const { code, vehicle, language } = req.body as {
      code?: string;
      vehicle?: VehicleContext;
      language?: string;
    };

    if (!code || !code.trim()) {
      res.status(400).json({ error: 'OBD2 DTC code is required (e.g. P0420).' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];
    const vehicleDesc = vehicle
      ? `${vehicle.vehicleType === 'motorcycle' ? 'Motorcycle (OBD2 / Euro5)' : 'Car'}: ${vehicle.make} ${vehicle.model} (${vehicle.year}${vehicle.engineDisplacementCc ? `, ${vehicle.engineDisplacementCc}cc` : ''}), ${vehicle.powertrain}, ${vehicle.odometerKm} km`
      : 'Passenger car or motorcycle';

    try {
      const response = await generateWithResilience(ai, {
        contents: `Decode OBD2 / Euro5 fault code(s) "${code.trim().toUpperCase()}" for vehicle: ${vehicleDesc}. Respond strictly in ${targetLanguage} in plain, beginner-friendly engineering language.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              system: { type: Type.STRING },
              severity: {
                type: Type.STRING,
                description: "Must be 'low', 'medium', or 'high'.",
              },
              severityLabel: { type: Type.STRING },
              plainExplanation: { type: Type.STRING },
              commonCauses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              safeToDrive: { type: Type.STRING },
              firstSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'code',
              'system',
              'severity',
              'severityLabel',
              'plainExplanation',
              'commonCauses',
              'safeToDrive',
              'firstSteps',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini API.' });
        return;
      }
      res.json(JSON.parse(rawText));
    } catch (error) {
      console.error('DTC decode error:', error);
      sendGeminiError(res, error, langCode, 'Failed to decode OBD2 DTC code.');
    }
  });

  // Official Owner's Manual & OEM Spec Lookup via Google Search Grounding
  app.post('/api/vehicle/manual-lookup', async (req: Request, res: Response) => {
    const {
      vehicleType,
      make,
      model,
      year,
      powertrain,
      engineDisplacementCc,
      language,
    } = req.body as {
      vehicleType?: 'car' | 'motorcycle';
      make?: string;
      model?: string;
      year?: number;
      powertrain?: string;
      engineDisplacementCc?: number;
      language?: string;
    };

    if (!make || !make.trim() || !model || !model.trim()) {
      res.status(400).json({ error: 'Vehicle make and model are required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];
    const isMoto = vehicleType === 'motorcycle';
    const vehicleLabel = `${isMoto ? 'Motorcycle' : 'Car'}: ${make.trim()} ${model.trim()} (${year || 2024}${engineDisplacementCc ? `, ${engineDisplacementCc}cc` : ''}, ${powertrain || 'gasoline'})`;

    try {
      const prompt = `Search the web for the official owner's manual ("manual do proprietário" / "owner's manual") and OEM technical specifications for this vehicle:
${vehicleLabel}.

Prioritize official manufacturer portals (e.g., honda.com.br, vw.com.br, toyota.com.br, volvocars.com, yamaha-motor.com.br, fiat.com.br, byd.com, etc.) and trusted OEM owner manual repositories.
Respond strictly in ${targetLanguage} and output ONLY a single valid JSON object (no markdown fences or commentary outside the JSON) with these exact keys:
{
  "vehicleSummary": "concise 1-2 sentence overview of the model and generation",
  "officialPortalName": "manufacturer or official manual portal name",
  "oilSpec": "exact OEM oil viscosity and standard (e.g. 10W-30 JASO MA2 for motorcycle wet clutch, 5W-40 VW 508.88, or N/A for 100% EV)",
  "oilCapacityLiters": "e.g. 2.7 L (with filter) or N/A for EV",
  "oilIntervalKm": 10000,
  "oilIntervalDays": 365,
  "frontTirePsi": 33,
  "rearTirePsi": 33,
  "tirePressureNote": "cold pressure note including laden/pillion/cargo PSI difference",
  "coolantSpec": "coolant specification or air-cooled note",
  "brakeFluidSpec": "e.g. DOT 4",
  "batterySpec": "12V battery code/Ah or EV high-voltage kWh spec",
  "chainOrBeltSpec": "for motorcycles: drive chain slack mm spec; for cars: timing belt/chain interval",
  "revisionIntervalKm": 10000,
  "fuelOrChargingSpec": "fuel octane / ethanol or AC/DC kW charging spec",
  "safetyReminder": "reminder to verify exact label on vehicle door jamb / motorcycle swingarm",
  "suggestedManualUrls": [
    { "title": "Official portal or PDF title", "url": "https://..." }
  ]
}
Use numeric integers for oilIntervalKm, oilIntervalDays, frontTirePsi, rearTirePsi, and revisionIntervalKm (or null if not applicable).`;

      const response = await generateWithResilience(ai, {
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini API.' });
        return;
      }

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as Record<string, unknown>;

      // Extract grounded web sources from Google Search metadata first
      const seenUrls = new Set<string>();
      const sources: { title: string; url: string }[] = [];

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          const web = (chunk as { web?: { uri?: string; title?: string } }).web;
          const validUrl = safeHttpUrl(web?.uri);
          if (validUrl && !seenUrls.has(validUrl)) {
            seenUrls.add(validUrl);
            sources.push({
              title: (web?.title && String(web.title).trim()) || 'Fonte Oficial na Web',
              url: validUrl,
            });
          }
        }
      }

      if (Array.isArray(parsed.suggestedManualUrls)) {
        for (const entry of parsed.suggestedManualUrls) {
          if (entry && typeof entry === 'object') {
            const item = entry as { title?: unknown; url?: unknown };
            const validUrl = safeHttpUrl(typeof item.url === 'string' ? item.url : undefined);
            if (validUrl && !seenUrls.has(validUrl)) {
              seenUrls.add(validUrl);
              sources.push({
                title:
                  typeof item.title === 'string' && item.title.trim()
                    ? item.title.trim()
                    : 'Manual / Portal da Montadora',
                url: validUrl,
              });
            }
          }
        }
      }

      const toPositiveInt = (val: unknown): number | undefined => {
        const num = Number(val);
        return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
      };

      res.json({
        vehicleSummary: String(parsed.vehicleSummary || `${make.trim()} ${model.trim()}`),
        officialPortalName: String(parsed.officialPortalName || `${make.trim()} Official`),
        oilSpec: String(parsed.oilSpec || 'Consultar etiqueta do fabricante'),
        oilCapacityLiters: parsed.oilCapacityLiters ? String(parsed.oilCapacityLiters) : undefined,
        oilIntervalKm: toPositiveInt(parsed.oilIntervalKm),
        oilIntervalDays: toPositiveInt(parsed.oilIntervalDays),
        frontTirePsi: toPositiveInt(parsed.frontTirePsi),
        rearTirePsi: toPositiveInt(parsed.rearTirePsi),
        tirePressureNote: parsed.tirePressureNote ? String(parsed.tirePressureNote) : undefined,
        coolantSpec: parsed.coolantSpec ? String(parsed.coolantSpec) : undefined,
        brakeFluidSpec: parsed.brakeFluidSpec ? String(parsed.brakeFluidSpec) : undefined,
        batterySpec: parsed.batterySpec ? String(parsed.batterySpec) : undefined,
        chainOrBeltSpec: parsed.chainOrBeltSpec ? String(parsed.chainOrBeltSpec) : undefined,
        revisionIntervalKm: toPositiveInt(parsed.revisionIntervalKm),
        fuelOrChargingSpec: parsed.fuelOrChargingSpec ? String(parsed.fuelOrChargingSpec) : undefined,
        safetyReminder: String(
          parsed.safetyReminder ||
            'Confira a etiqueta da coluna da porta (carros) ou balança traseira (motos) antes de ajustes finais.'
        ),
        sources: sources.slice(0, 6),
        fetchedAt: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Manual lookup error:', error);
      sendGeminiError(res, error, langCode, 'Failed to look up vehicle manual.');
    }
  });

  // Optional EV Photo Scanner (EV Car/Moto Dashboard SoC+Range OR Charger Screen/Receipt)
  app.post('/api/ev/scan', async (req: Request, res: Response) => {
    const { image, mode, language, vehicle } = req.body as {
      image?: MediaPayload;
      mode?: 'ev_dashboard' | 'ev_charger';
      language?: string;
      vehicle?: VehicleContext;
    };

    if (!image || !image.mimeType || !image.data) {
      res.status(400).json({ error: 'Image payload is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];
    const scanMode = mode === 'ev_charger' ? 'ev_charger' : 'ev_dashboard';
    const vehicleDesc = vehicle
      ? `${vehicle.vehicleType === 'motorcycle' ? 'Electric Motorcycle / Scooter' : 'Electric / Hybrid Car'}: ${vehicle.make} ${vehicle.model} (${vehicle.year})`
      : 'Electric or hybrid car/motorcycle';

    const promptText =
      scanMode === 'ev_dashboard'
        ? `Analyze this ${vehicleDesc} instrument cluster / dashboard photo or companion EV app screenshot.
Extract:
- startSoc: current battery percentage (0-100 integer; 0 if unreadable).
- remainingRangeKm: estimated remaining range in km (convert miles to km by multiplying by 1.60934 if displayed in miles; 0 if unreadable).
- odometerKm: total odometer reading in km (convert miles if needed; 0 if unreadable).
- summaryNotes: concise diagnostic & telemetry summary in ${targetLanguage} mentioning any visible battery temperature, regen icon, turtle/power-limit warning, or readiness indicator.`
        : `Analyze this EV charging station screen, wallbox display, mobile charging app screenshot, or charging receipt for ${vehicleDesc}.
Extract:
- stationName: charging network/station/wallbox name (empty string if unreadable).
- powerType: strictly 'DC' for fast DC chargers (CCS/CHAdeMO/GB-T/NACS DC) or 'AC' for slow/Type 2/Wallbox/home outlet.
- powerKw: charging power in kW (e.g. 150, 50, 350, 22, 7.4; 0 if unreadable).
- energyKwh: energy delivered in kWh (numeric; 0 if unreadable).
- cost: total session monetary cost (numeric; 0 if free or unreadable).
- startSoc: starting battery % if shown (0-100; 0 if unreadable).
- socEnd: ending/current battery % if shown (0-100; 0 if unreadable).
- summaryNotes: concise summary of the charging session in ${targetLanguage}.`;

    try {
      const response = await generateWithResilience(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              startSoc: { type: Type.NUMBER },
              socEnd: { type: Type.NUMBER },
              remainingRangeKm: { type: Type.NUMBER },
              odometerKm: { type: Type.NUMBER },
              stationName: { type: Type.STRING },
              powerType: {
                type: Type.STRING,
                description: "Must be 'DC' or 'AC'.",
              },
              powerKw: { type: Type.NUMBER },
              energyKwh: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              summaryNotes: { type: Type.STRING },
            },
            required: [
              'startSoc',
              'socEnd',
              'remainingRangeKm',
              'odometerKm',
              'stationName',
              'powerType',
              'powerKw',
              'energyKwh',
              'cost',
              'summaryNotes',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini Vision.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      const clampSoc = (val: unknown): number => {
        const n = Number(val);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return Math.min(100, Math.max(1, Math.round(n)));
      };

      res.json({
        startSoc: clampSoc(parsed.startSoc),
        socEnd: clampSoc(parsed.socEnd),
        remainingRangeKm: Math.max(0, Math.round(Number(parsed.remainingRangeKm) || 0)),
        odometerKm: Math.max(0, Math.round(Number(parsed.odometerKm) || 0)),
        stationName: String(parsed.stationName ?? '').trim(),
        powerType: parsed.powerType === 'AC' ? 'AC' : 'DC',
        powerKw: Math.max(0, Number(parsed.powerKw) || 0),
        energyKwh: Math.max(0, Number(parsed.energyKwh) || 0),
        cost: Math.max(0, Number(parsed.cost) || 0),
        summaryNotes: String(parsed.summaryNotes ?? '').trim(),
      });
    } catch (error) {
      console.error('EV photo scan error:', error);
      sendGeminiError(res, error, langCode, 'Failed to scan EV photo with Gemini API.');
    }
  });

  // Search-Grounded EV Route & Charging Curve Advisor (Car & Electric Motorcycle)
  app.post('/api/ev/route-assist', async (req: Request, res: Response) => {
    const {
      vehicle,
      tripKm,
      startSoc,
      chargerPowerKw,
      stopsNeeded,
      chargeMinutes,
      arrivalSoc,
      language,
    } = req.body as {
      vehicle?: VehicleContext & {
        batteryCapacityKwh?: number;
        consumptionKwhPer100Km?: number;
        estimatedRangeKm?: number;
      };
      tripKm?: number;
      startSoc?: number;
      chargerPowerKw?: number;
      stopsNeeded?: number;
      chargeMinutes?: number;
      arrivalSoc?: number;
      language?: string;
    };

    const distance = Number(tripKm);
    if (!Number.isFinite(distance) || distance <= 0) {
      res.status(400).json({ error: 'A positive trip distance (tripKm) is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const langCode = language && LANGUAGE_NAMES[language] ? language : 'pt';
    const targetLanguage = LANGUAGE_NAMES[langCode];
    const isMoto = vehicle?.vehicleType === 'motorcycle';
    const vehicleLabel = vehicle
      ? `${isMoto ? 'Electric Motorcycle' : 'Passenger Car'}: ${vehicle.make} ${vehicle.model} (${vehicle.year}, ${vehicle.powertrain}, battery ${vehicle.batteryCapacityKwh ?? 'unknown'} kWh, consumption ${vehicle.consumptionKwhPer100Km ?? 'unknown'} kWh/100km)`
      : 'Generic electric vehicle';

    const prompt = `You are a global EV Automotive & Electric Motorcycle Route & Charging Engineer.
Use Google Search to check real-world highway range, peak AC/DC charging curve, connector standard (CCS2/NACS/Type 2/GB-T), and thermal/battery chemistry behavior (LFP vs NMC) for:
${vehicleLabel}.

Trip simulation inputs:
- Planned distance: ${distance} km
- Initial battery SoC: ${Number(startSoc ?? 85)}%
- Selected charger power: ${Number(chargerPowerKw ?? 150)} kW DC
- Baseline app estimate: ${Number(stopsNeeded ?? 0)} stop(s), ~${Number(chargeMinutes ?? 0)} min charging, ~${Number(arrivalSoc ?? 20)}% arrival SoC.

Respond strictly in ${targetLanguage} and output ONLY a single valid JSON object (no markdown fences) with these exact keys:
{
  "strategySummary": "2-3 sentences evaluating whether this trip plan is realistic for this exact car/motorcycle at highway speeds and recommending the best pacing.",
  "chargingCurveNote": "Real-world peak charging power (kW) and 10-80% taper behavior of this specific model (or note if it only supports AC or slower DC).",
  "recommendedStopsDetail": "Concrete stop window guidance (e.g., charge 15%->75% instead of 100%, or verify Type 2 adapters for electric motorcycles).",
  "efficiencyTips": ["3 to 4 practical, vehicle-specific efficiency tips (speed sweet spot, tire PSI, regen mode, LFP 100% calibration or battery preconditioning)"],
  "safetyNote": "Practical reserve buffer / elevation / rain / backup charger advice.",
  "suggestedSources": [
    { "title": "Source title", "url": "https://..." }
  ]
}`;

    try {
      const response = await generateWithResilience(ai, {
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini API.' });
        return;
      }

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as Record<string, unknown>;

      const seenUrls = new Set<string>();
      const sources: { title: string; url: string }[] = [];

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          const web = (chunk as { web?: { uri?: string; title?: string } }).web;
          const validUrl = safeHttpUrl(web?.uri);
          if (validUrl && !seenUrls.has(validUrl)) {
            seenUrls.add(validUrl);
            sources.push({
              title: (web?.title && String(web.title).trim()) || 'Fonte Web EV',
              url: validUrl,
            });
          }
        }
      }

      if (Array.isArray(parsed.suggestedSources)) {
        for (const entry of parsed.suggestedSources) {
          if (entry && typeof entry === 'object') {
            const item = entry as { title?: unknown; url?: unknown };
            const validUrl = safeHttpUrl(typeof item.url === 'string' ? item.url : undefined);
            if (validUrl && !seenUrls.has(validUrl)) {
              seenUrls.add(validUrl);
              sources.push({
                title:
                  typeof item.title === 'string' && item.title.trim()
                    ? item.title.trim()
                    : 'Especificação EV na Web',
                url: validUrl,
              });
            }
          }
        }
      }

      res.json({
        strategySummary: String(parsed.strategySummary ?? ''),
        chargingCurveNote: String(parsed.chargingCurveNote ?? ''),
        recommendedStopsDetail: String(parsed.recommendedStopsDetail ?? ''),
        efficiencyTips: Array.isArray(parsed.efficiencyTips)
          ? parsed.efficiencyTips.map(String).slice(0, 5)
          : [],
        safetyNote: String(parsed.safetyNote ?? ''),
        sources: sources.slice(0, 5),
      });
    } catch (error) {
      console.error('EV route assist error:', error);
      sendGeminiError(res, error, langCode, 'Failed to generate EV route advice.');
    }
  });

  // ============================================================================
  // International DB-Driven Billing Catalog, Subscriptions & Digital Passport
  // ============================================================================
  type ServerPlanId =
    | 'personal'
    | 'fleet_10'
    | 'fleet_25'
    | 'fleet_50'
    | 'fleet_100'
    | 'enterprise';

  const CURRENCY_META_SERVER: Record<string, { symbol: string; decimals: number }> = {
    BRL: { symbol: 'R$', decimals: 2 },
    USD: { symbol: '$', decimals: 2 },
    EUR: { symbol: '€', decimals: 2 },
    GBP: { symbol: '£', decimals: 2 },
    CAD: { symbol: 'CA$', decimals: 2 },
    CHF: { symbol: 'CHF', decimals: 2 },
    MXN: { symbol: 'MX$', decimals: 2 },
    JPY: { symbol: '¥', decimals: 0 },
  };

  const COUNTRY_FALLBACK_REGION: Record<string, string> = {
    BR: 'BR',
    PT: 'EU',
    ES: 'EU',
    DE: 'EU',
    FR: 'EU',
    EU: 'EU',
    US: 'GLOBAL',
    GB: 'GLOBAL',
    CA: 'GLOBAL',
    CH: 'GLOBAL',
    MX: 'GLOBAL',
    JP: 'GLOBAL',
    GLOBAL: 'GLOBAL',
  };

  const FALLBACK_PLANS_SERVER: Array<{
    id: ServerPlanId;
    slug: string;
    accountScope: 'personal' | 'business';
    name: string;
    description: string;
    vehicleLimit: number | null;
    allowFleetPanel: boolean;
    allowTeamMembers: boolean;
    maxTeamMembers: number | null;
    features: string[];
    sortOrder: number;
  }> = [
    {
      id: 'personal',
      slug: 'personal',
      accountScope: 'personal',
      name: 'Plano Particular',
      description: 'Para proprietários individuais com 1 veículo e Passaporte Digital verificado.',
      vehicleLimit: 1,
      allowFleetPanel: false,
      allowTeamMembers: false,
      maxTeamMembers: 1,
      features: [
        '1 veículo cadastrado',
        'Passaporte Digital do Veículo',
        'Histórico imutável de quilometragem',
        'Histórico de manutenção e despesas',
        'Documentos e notas fiscais privados',
        'Alertas preventivos por data e km',
        'QR Code para consulta e compartilhamento autorizado',
      ],
      sortOrder: 1,
    },
    {
      id: 'fleet_10',
      slug: 'fleet-10',
      accountScope: 'business',
      name: 'Plano Frotas 10',
      description: 'Painel central empresarial para até 10 carros e motocicletas com gestão de equipe.',
      vehicleLimit: 10,
      allowFleetPanel: true,
      allowTeamMembers: true,
      maxTeamMembers: 10,
      features: [
        'Até 10 veículos (carros e motos)',
        'Painel central de gestão empresarial',
        'Histórico individual, despesas e documentação',
        'Controle de quilometragem e manutenção',
        'Alertas de revisões e vencimentos',
        'Relatórios gerais e individuais em PDF e CSV',
        'Gestão de responsáveis e permissões por empresa',
        'Passaporte Digital + QR Code de cada veículo',
      ],
      sortOrder: 2,
    },
    {
      id: 'fleet_25',
      slug: 'fleet-25',
      accountScope: 'business',
      name: 'Plano Frotas 25',
      description: 'Expansão operacional para empresas com até 25 veículos ativos.',
      vehicleLimit: 25,
      allowFleetPanel: true,
      allowTeamMembers: true,
      maxTeamMembers: 25,
      features: [
        'Até 25 veículos na frota unificada',
        'Todos os recursos do Plano Frotas 10',
        'Convites de motoristas e gestores com permissões',
        'Relatórios executivos consolidados',
      ],
      sortOrder: 3,
    },
    {
      id: 'fleet_50',
      slug: 'fleet-50',
      accountScope: 'business',
      name: 'Plano Frotas 50',
      description: 'Escala corporativa para operações regionais com até 50 veículos.',
      vehicleLimit: 50,
      allowFleetPanel: true,
      allowTeamMembers: true,
      maxTeamMembers: 50,
      features: [
        'Até 50 veículos na frota unificada',
        'Isolamento multiempresa dedicado',
        'Permissões granulares por responsável',
        'Auditoria de quilometragem e custos',
      ],
      sortOrder: 4,
    },
    {
      id: 'fleet_100',
      slug: 'fleet-100',
      accountScope: 'business',
      name: 'Plano Frotas 100',
      description: 'Alta capacidade para grandes frotas, locadoras e entregas até 100 veículos.',
      vehicleLimit: 100,
      allowFleetPanel: true,
      allowTeamMembers: true,
      maxTeamMembers: 100,
      features: [
        'Até 100 veículos ativos',
        'Gestão multi-equipe avançada',
        'Exportação gerencial completa em PDF e CSV',
        'Passaporte Digital verificável para toda a frota',
      ],
      sortOrder: 5,
    },
    {
      id: 'enterprise',
      slug: 'enterprise',
      accountScope: 'business',
      name: 'Empresarial Personalizado',
      description: 'Acima de 100 veículos, SLA dedicado e limites configuráveis no banco.',
      vehicleLimit: null,
      allowFleetPanel: true,
      allowTeamMembers: true,
      maxTeamMembers: null,
      features: [
        'Acima de 100 veículos e equipes sob medida',
        'Faturamento corporativo B2B',
        'Impostos e contrato regional dedicados',
        'Implantação prioritária',
      ],
      sortOrder: 6,
    },
  ];

  const FALLBACK_CURRENCY_PRICES: Record<
    string,
    Record<
      ServerPlanId,
      {
        monthlyPriceMinor: number;
        annualPriceMinor: number;
        taxRatePercent: number;
        taxLabel: string;
        processingFeePercent: number;
        processingFeeFixedMinor: number;
      }
    >
  > = {
    BRL: {
      personal: { monthlyPriceMinor: 499, annualPriceMinor: 4790, taxRatePercent: 0, taxLabel: 'Impostos inclusos', processingFeePercent: 3.99, processingFeeFixedMinor: 39 },
      fleet_10: { monthlyPriceMinor: 3990, annualPriceMinor: 38300, taxRatePercent: 0, taxLabel: 'Impostos inclusos', processingFeePercent: 3.99, processingFeeFixedMinor: 39 },
      fleet_25: { monthlyPriceMinor: 8990, annualPriceMinor: 86300, taxRatePercent: 0, taxLabel: 'Impostos inclusos', processingFeePercent: 3.99, processingFeeFixedMinor: 39 },
      fleet_50: { monthlyPriceMinor: 15990, annualPriceMinor: 153500, taxRatePercent: 0, taxLabel: 'Impostos inclusos', processingFeePercent: 3.99, processingFeeFixedMinor: 39 },
      fleet_100: { monthlyPriceMinor: 27990, annualPriceMinor: 268700, taxRatePercent: 0, taxLabel: 'Impostos inclusos', processingFeePercent: 3.99, processingFeeFixedMinor: 39 },
      enterprise: { monthlyPriceMinor: 49900, annualPriceMinor: 479000, taxRatePercent: 0, taxLabel: 'Sob consulta B2B', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    USD: {
      personal: { monthlyPriceMinor: 299, annualPriceMinor: 2870, taxRatePercent: 0, taxLabel: 'Local taxes may apply', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_10: { monthlyPriceMinor: 1490, annualPriceMinor: 14300, taxRatePercent: 0, taxLabel: 'Local taxes may apply', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_25: { monthlyPriceMinor: 2990, annualPriceMinor: 28700, taxRatePercent: 0, taxLabel: 'Local taxes may apply', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_50: { monthlyPriceMinor: 5490, annualPriceMinor: 52700, taxRatePercent: 0, taxLabel: 'Local taxes may apply', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_100: { monthlyPriceMinor: 9990, annualPriceMinor: 95900, taxRatePercent: 0, taxLabel: 'Local taxes may apply', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      enterprise: { monthlyPriceMinor: 19900, annualPriceMinor: 191000, taxRatePercent: 0, taxLabel: 'Custom Enterprise', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    EUR: {
      personal: { monthlyPriceMinor: 299, annualPriceMinor: 2870, taxRatePercent: 21, taxLabel: 'VAT / IVA estimada', processingFeePercent: 2.5, processingFeeFixedMinor: 25 },
      fleet_10: { monthlyPriceMinor: 1390, annualPriceMinor: 13340, taxRatePercent: 21, taxLabel: 'VAT / IVA estimada', processingFeePercent: 2.5, processingFeeFixedMinor: 25 },
      fleet_25: { monthlyPriceMinor: 2790, annualPriceMinor: 26780, taxRatePercent: 21, taxLabel: 'VAT / IVA estimada', processingFeePercent: 2.5, processingFeeFixedMinor: 25 },
      fleet_50: { monthlyPriceMinor: 4990, annualPriceMinor: 47900, taxRatePercent: 21, taxLabel: 'VAT / IVA estimada', processingFeePercent: 2.5, processingFeeFixedMinor: 25 },
      fleet_100: { monthlyPriceMinor: 8990, annualPriceMinor: 86300, taxRatePercent: 21, taxLabel: 'VAT / IVA estimada', processingFeePercent: 2.5, processingFeeFixedMinor: 25 },
      enterprise: { monthlyPriceMinor: 17900, annualPriceMinor: 171800, taxRatePercent: 21, taxLabel: 'VAT / IVA B2B', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    GBP: {
      personal: { monthlyPriceMinor: 249, annualPriceMinor: 2390, taxRatePercent: 20, taxLabel: 'UK VAT (20%)', processingFeePercent: 2.5, processingFeeFixedMinor: 20 },
      fleet_10: { monthlyPriceMinor: 1190, annualPriceMinor: 11420, taxRatePercent: 20, taxLabel: 'UK VAT (20%)', processingFeePercent: 2.5, processingFeeFixedMinor: 20 },
      fleet_25: { monthlyPriceMinor: 2390, annualPriceMinor: 22940, taxRatePercent: 20, taxLabel: 'UK VAT (20%)', processingFeePercent: 2.5, processingFeeFixedMinor: 20 },
      fleet_50: { monthlyPriceMinor: 4290, annualPriceMinor: 41180, taxRatePercent: 20, taxLabel: 'UK VAT (20%)', processingFeePercent: 2.5, processingFeeFixedMinor: 20 },
      fleet_100: { monthlyPriceMinor: 7990, annualPriceMinor: 76700, taxRatePercent: 20, taxLabel: 'UK VAT (20%)', processingFeePercent: 2.5, processingFeeFixedMinor: 20 },
      enterprise: { monthlyPriceMinor: 15900, annualPriceMinor: 152600, taxRatePercent: 20, taxLabel: 'UK VAT (20%)', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    CAD: {
      personal: { monthlyPriceMinor: 399, annualPriceMinor: 3830, taxRatePercent: 5, taxLabel: 'GST (5%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_10: { monthlyPriceMinor: 1990, annualPriceMinor: 19100, taxRatePercent: 5, taxLabel: 'GST (5%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_25: { monthlyPriceMinor: 3990, annualPriceMinor: 38300, taxRatePercent: 5, taxLabel: 'GST (5%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_50: { monthlyPriceMinor: 7290, annualPriceMinor: 69980, taxRatePercent: 5, taxLabel: 'GST (5%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_100: { monthlyPriceMinor: 12990, annualPriceMinor: 124700, taxRatePercent: 5, taxLabel: 'GST (5%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      enterprise: { monthlyPriceMinor: 24900, annualPriceMinor: 239000, taxRatePercent: 5, taxLabel: 'GST (5%)', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    CHF: {
      personal: { monthlyPriceMinor: 290, annualPriceMinor: 2780, taxRatePercent: 8.1, taxLabel: 'MWST (8.1%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_10: { monthlyPriceMinor: 1390, annualPriceMinor: 13340, taxRatePercent: 8.1, taxLabel: 'MWST (8.1%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_25: { monthlyPriceMinor: 2790, annualPriceMinor: 26780, taxRatePercent: 8.1, taxLabel: 'MWST (8.1%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_50: { monthlyPriceMinor: 4990, annualPriceMinor: 47900, taxRatePercent: 8.1, taxLabel: 'MWST (8.1%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      fleet_100: { monthlyPriceMinor: 8990, annualPriceMinor: 86300, taxRatePercent: 8.1, taxLabel: 'MWST (8.1%)', processingFeePercent: 2.9, processingFeeFixedMinor: 30 },
      enterprise: { monthlyPriceMinor: 17900, annualPriceMinor: 171800, taxRatePercent: 8.1, taxLabel: 'MWST (8.1%)', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    MXN: {
      personal: { monthlyPriceMinor: 4900, annualPriceMinor: 47000, taxRatePercent: 16, taxLabel: 'IVA (16%)', processingFeePercent: 3.6, processingFeeFixedMinor: 300 },
      fleet_10: { monthlyPriceMinor: 29900, annualPriceMinor: 287000, taxRatePercent: 16, taxLabel: 'IVA (16%)', processingFeePercent: 3.6, processingFeeFixedMinor: 300 },
      fleet_25: { monthlyPriceMinor: 59900, annualPriceMinor: 575000, taxRatePercent: 16, taxLabel: 'IVA (16%)', processingFeePercent: 3.6, processingFeeFixedMinor: 300 },
      fleet_50: { monthlyPriceMinor: 109900, annualPriceMinor: 1055000, taxRatePercent: 16, taxLabel: 'IVA (16%)', processingFeePercent: 3.6, processingFeeFixedMinor: 300 },
      fleet_100: { monthlyPriceMinor: 199900, annualPriceMinor: 1919000, taxRatePercent: 16, taxLabel: 'IVA (16%)', processingFeePercent: 3.6, processingFeeFixedMinor: 300 },
      enterprise: { monthlyPriceMinor: 349900, annualPriceMinor: 3359000, taxRatePercent: 16, taxLabel: 'IVA (16%)', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
    JPY: {
      personal: { monthlyPriceMinor: 390, annualPriceMinor: 3740, taxRatePercent: 10, taxLabel: 'Consumption Tax (10%)', processingFeePercent: 3.6, processingFeeFixedMinor: 0 },
      fleet_10: { monthlyPriceMinor: 1980, annualPriceMinor: 19000, taxRatePercent: 10, taxLabel: 'Consumption Tax (10%)', processingFeePercent: 3.6, processingFeeFixedMinor: 0 },
      fleet_25: { monthlyPriceMinor: 3980, annualPriceMinor: 38200, taxRatePercent: 10, taxLabel: 'Consumption Tax (10%)', processingFeePercent: 3.6, processingFeeFixedMinor: 0 },
      fleet_50: { monthlyPriceMinor: 7480, annualPriceMinor: 71800, taxRatePercent: 10, taxLabel: 'Consumption Tax (10%)', processingFeePercent: 3.6, processingFeeFixedMinor: 0 },
      fleet_100: { monthlyPriceMinor: 13800, annualPriceMinor: 132480, taxRatePercent: 10, taxLabel: 'Consumption Tax (10%)', processingFeePercent: 3.6, processingFeeFixedMinor: 0 },
      enterprise: { monthlyPriceMinor: 24800, annualPriceMinor: 238080, taxRatePercent: 10, taxLabel: 'Consumption Tax (10%)', processingFeePercent: 0, processingFeeFixedMinor: 0 },
    },
  };

  function normalizeServerPlanId(raw?: string | null): ServerPlanId | null {
    switch (raw) {
      case 'personal':
      case 'free':
      case 'plus':
        return 'personal';
      case 'fleet':
      case 'fleet_10':
        return 'fleet_10';
      case 'fleet_25':
        return 'fleet_25';
      case 'fleet_50':
        return 'fleet_50';
      case 'fleet_100':
        return 'fleet_100';
      case 'enterprise':
        return 'enterprise';
      default:
        return null;
    }
  }

  function normalizeServerSupabaseUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Fallback below
    }
    return trimmed.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
  }

  function getSupabaseServerConfig() {
    const url = normalizeServerSupabaseUrl(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
    );
    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    return {
      url,
      anonKey,
      serviceRoleKey,
      configured: Boolean(url && (serviceRoleKey || anonKey)),
    };
  }

  async function supabaseRestFetch<T>(
    restPath: string,
    options: {
      method?: string;
      userToken?: string;
      body?: unknown;
      prefer?: string;
    } = {}
  ): Promise<{ ok: boolean; status: number; data: T | null }> {
    const cfg = getSupabaseServerConfig();
    if (!cfg.configured) return { ok: false, status: 503, data: null };

    const authKey = options.userToken || cfg.serviceRoleKey || cfg.anonKey;
    const apiKey =
      cfg.serviceRoleKey && !options.userToken
        ? cfg.serviceRoleKey
        : cfg.anonKey || cfg.serviceRoleKey;

    const headers: Record<string, string> = {
      apikey: apiKey,
      'Content-Type': 'application/json',
    };
    const isJwt = authKey.split('.').length === 3;
    if (options.userToken || isJwt) {
      headers.Authorization = `Bearer ${authKey}`;
    }
    if (options.prefer) {
      headers.Prefer = options.prefer;
    }

    const resp = await fetch(`${cfg.url}/rest/v1/${restPath}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await resp.text();
    let parsed: T | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as T;
      } catch {
        parsed = null;
      }
    }
    return { ok: resp.ok, status: resp.status, data: parsed };
  }

  async function verifySupabaseUser(
    req: Request
  ): Promise<{ id: string; email?: string; token: string } | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const cfg = getSupabaseServerConfig();
    if (!cfg.url || !(cfg.anonKey || cfg.serviceRoleKey)) return null;

    try {
      const resp = await fetch(`${cfg.url}/auth/v1/user`, {
        headers: {
          apikey: cfg.anonKey || cfg.serviceRoleKey,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) return null;
      const user = (await resp.json()) as { id?: string; email?: string };
      if (!user?.id) return null;
      return { id: user.id, email: user.email, token };
    } catch {
      return null;
    }
  }

  async function loadServerPlanCatalog(countryInput: string, currencyInput: string) {
    const currencyCode = currencyInput in CURRENCY_META_SERVER ? currencyInput : 'BRL';
    const countryCode = countryInput in COUNTRY_FALLBACK_REGION ? countryInput : 'BR';
    const fallbackRegion = COUNTRY_FALLBACK_REGION[countryCode] || 'GLOBAL';
    const currSet = FALLBACK_CURRENCY_PRICES[currencyCode] || FALLBACK_CURRENCY_PRICES.USD;

    const fallbackCatalog = FALLBACK_PLANS_SERVER.map((plan) => ({
      ...plan,
      price: {
        planId: plan.id,
        countryCode,
        currencyCode,
        ...currSet[plan.id],
      },
    }));

    const cfg = getSupabaseServerConfig();
    if (!cfg.configured) {
      return { plans: fallbackCatalog, source: 'fallback' as const };
    }

    try {
      const [plansRes, pricesRes] = await Promise.all([
        supabaseRestFetch<Array<Record<string, unknown>>>(
          'subscription_plans?is_active=eq.true&order=sort_order.asc'
        ),
        supabaseRestFetch<Array<Record<string, unknown>>>(
          `plan_country_prices?is_active=eq.true&currency_code=eq.${encodeURIComponent(currencyCode)}`
        ),
      ]);

      if (!plansRes.ok || !Array.isArray(plansRes.data) || plansRes.data.length === 0) {
        return { plans: fallbackCatalog, source: 'fallback' as const };
      }

      const dbPrices = Array.isArray(pricesRes.data) ? pricesRes.data : [];
      const plans = plansRes.data.map((row) => {
        const planId = normalizeServerPlanId(String(row.id)) || 'personal';
        const exact =
          dbPrices.find((p) => p.plan_id === planId && p.country_code === countryCode) ||
          dbPrices.find((p) => p.plan_id === planId && p.country_code === fallbackRegion) ||
          dbPrices.find((p) => p.plan_id === planId);

        const fb = currSet[planId];
        return {
          id: planId,
          slug: String(row.slug || planId),
          accountScope: (row.account_scope === 'business' ? 'business' : 'personal') as
            | 'personal'
            | 'business',
          name: String(row.name || planId),
          description: String(row.description || ''),
          vehicleLimit: row.vehicle_limit === null ? null : Number(row.vehicle_limit ?? 1),
          allowFleetPanel: Boolean(row.allow_fleet_panel),
          allowTeamMembers: Boolean(row.allow_team_members),
          maxTeamMembers:
            row.max_team_members === null ? null : Number(row.max_team_members ?? 1),
          features: Array.isArray(row.features) ? row.features.map(String) : [],
          sortOrder: Number(row.sort_order ?? 0),
          price: exact
            ? {
                planId,
                countryCode: String(exact.country_code || countryCode),
                currencyCode: String(exact.currency_code || currencyCode),
                monthlyPriceMinor: Number(exact.monthly_price_minor ?? fb.monthlyPriceMinor),
                annualPriceMinor: Number(exact.annual_price_minor ?? fb.annualPriceMinor),
                taxRatePercent: Number(exact.tax_rate_percent ?? fb.taxRatePercent),
                taxLabel: String(exact.tax_label ?? fb.taxLabel),
                processingFeePercent: Number(
                  exact.processing_fee_percent ?? fb.processingFeePercent
                ),
                processingFeeFixedMinor: Number(
                  exact.processing_fee_fixed_minor ?? fb.processingFeeFixedMinor
                ),
              }
            : {
                planId,
                countryCode,
                currencyCode,
                ...fb,
              },
        };
      });

      return { plans, source: 'database' as const };
    } catch {
      return { plans: fallbackCatalog, source: 'fallback' as const };
    }
  }

  function computeServerBreakdown(
    price: {
      monthlyPriceMinor: number;
      annualPriceMinor: number;
      taxRatePercent: number;
      processingFeePercent: number;
      processingFeeFixedMinor: number;
    },
    cycle: 'monthly' | 'annual'
  ) {
    const subtotalMinor = cycle === 'annual' ? price.annualPriceMinor : price.monthlyPriceMinor;
    const taxMinor = Math.round((subtotalMinor * (price.taxRatePercent || 0)) / 100);
    const processingFeeMinor =
      subtotalMinor > 0
        ? Math.round((subtotalMinor * (price.processingFeePercent || 0)) / 100) +
          (price.processingFeeFixedMinor || 0)
        : 0;
    const totalMinor = subtotalMinor + taxMinor + processingFeeMinor;
    return { subtotalMinor, taxMinor, processingFeeMinor, totalMinor };
  }

  async function persistVerifiedSubscriptionPayment(params: {
    userId: string;
    userToken: string;
    planId: ServerPlanId;
    countryCode: string;
    currencyCode: string;
    billingCycle: 'monthly' | 'annual';
    amountMinor: number;
    taxMinor: number;
    processingFeeMinor: number;
    paymentMethod: string;
    provider: string;
    providerPaymentId: string;
  }) {
    const cfg = getSupabaseServerConfig();
    if (!cfg.configured) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const periodDays = params.billingCycle === 'annual' ? 365 : 30;
    const periodEndIso = new Date(now + periodDays * 86_400_000).toISOString();

    try {
      const subUpsert = await supabaseRestFetch<Array<Record<string, unknown>>>(
        'user_subscriptions?on_conflict=user_id',
        {
          method: 'POST',
          userToken: params.userToken,
          prefer: 'resolution=merge-duplicates,return=representation',
          body: {
            user_id: params.userId,
            plan_id: params.planId,
            country_code: params.countryCode,
            currency_code: params.currencyCode,
            billing_cycle: params.billingCycle,
            status: 'active',
            auto_renew: true,
            current_period_start: nowIso,
            current_period_end: periodEndIso,
            grace_period_end: null,
            canceled_at: null,
            provider: params.provider,
            provider_subscription_id: params.providerPaymentId,
            updated_at: nowIso,
          },
        }
      );

      const subId = Array.isArray(subUpsert.data) && subUpsert.data[0]?.id ? subUpsert.data[0].id : null;

      // Avoid duplicate payment records on refresh
      const existingPay = await supabaseRestFetch<Array<{ id: string }>>(
        `subscription_payments?user_id=eq.${encodeURIComponent(
          params.userId
        )}&provider_payment_id=eq.${encodeURIComponent(params.providerPaymentId)}&limit=1`,
        { userToken: params.userToken }
      );
      if (!Array.isArray(existingPay.data) || existingPay.data.length === 0) {
        await supabaseRestFetch('subscription_payments', {
          method: 'POST',
          userToken: params.userToken,
          body: {
            user_id: params.userId,
            subscription_id: subId,
            plan_id: params.planId,
            amount_minor: params.amountMinor,
            tax_minor: params.taxMinor,
            processing_fee_minor: params.processingFeeMinor,
            currency_code: params.currencyCode,
            country_code: params.countryCode,
            payment_method: params.paymentMethod,
            provider: params.provider,
            provider_payment_id: params.providerPaymentId,
            status: 'paid',
            paid_at: nowIso,
          },
        });
      }

      await supabaseRestFetch(`user_preferences?user_id=eq.${encodeURIComponent(params.userId)}`, {
        method: 'PATCH',
        userToken: params.userToken,
        body: {
          active_plan: params.planId,
          country_code: params.countryCode,
          currency: params.currencyCode,
          updated_at: nowIso,
        },
      });
    } catch {
      // Non-fatal DB audit failure
    }
  }

  function getBillingGatewayConfig() {
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
    const stripeConfigured = Boolean(
      stripeKey &&
        !stripeKey.includes('YOUR_') &&
        (stripeKey.startsWith('sk_') || stripeKey.startsWith('rk_'))
    );
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || '';
    const mercadoPagoConfigured = Boolean(
      mpToken && !mpToken.includes('YOUR_') && mpToken.length >= 20
    );
    return {
      stripeKey,
      stripeConfigured,
      mpToken,
      mercadoPagoConfigured,
    };
  }

  function resolveSafeBaseUrl(req: Request): string {
    const envUrl = process.env.APP_URL;
    if (envUrl && envUrl !== 'MY_APP_URL') {
      try {
        const parsed = new URL(envUrl);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          return parsed.origin;
        }
      } catch {
        // Fallback to request host
      }
    }
    const host = req.get('host');
    if (host && /^[a-zA-Z0-9.:-]+$/.test(host)) {
      const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : req.protocol;
      return `${proto}://${host}`;
    }
    return `http://localhost:${PORT}`;
  }

  app.get('/api/region/detect', (req: Request, res: Response) => {
    const rawHeaderCountry =
      req.headers['cf-ipcountry'] ||
      req.headers['x-vercel-ip-country'] ||
      req.headers['x-country-code'] ||
      req.headers['x-geo-country'] ||
      req.headers['x-appengine-country'];

    const headerIso =
      typeof rawHeaderCountry === 'string' ? rawHeaderCountry.trim().toUpperCase() : '';
    const validIso =
      /^[A-Z]{2}$/.test(headerIso) && headerIso !== 'XX' && headerIso !== 'T1'
        ? headerIso
        : '';

    const acceptLang =
      typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : '';
    const firstLangTag = acceptLang.split(',')[0]?.split(';')[0]?.trim() || '';
    const langBase = firstLangTag.toLowerCase().split(/[-_]/)[0];
    const detectedLanguage =
      langBase === 'pt' || langBase === 'en' || langBase === 'es' || langBase === 'de' || langBase === 'fr'
        ? langBase
        : null;

    if (!validIso) {
      res.json({
        detected: false,
        countryCode: null,
        currency: null,
        language: detectedLanguage,
        units: null,
      });
      return;
    }

    const euSet = new Set([
      'IT', 'NL', 'BE', 'AT', 'IE', 'FI', 'GR', 'LU',
      'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR',
    ]);

    let countryCode = 'GLOBAL';
    let currency = 'USD';
    let language = detectedLanguage || 'en';
    let units: 'metric' | 'imperial' = 'metric';

    switch (validIso) {
      case 'BR':
        countryCode = 'BR';
        currency = 'BRL';
        language = 'pt';
        break;
      case 'PT':
        countryCode = 'PT';
        currency = 'EUR';
        language = 'pt';
        break;
      case 'US':
        countryCode = 'US';
        currency = 'USD';
        language = detectedLanguage === 'es' ? 'es' : 'en';
        units = 'imperial';
        break;
      case 'GB':
        countryCode = 'GB';
        currency = 'GBP';
        language = 'en';
        units = 'imperial';
        break;
      case 'ES':
        countryCode = 'ES';
        currency = 'EUR';
        language = 'es';
        break;
      case 'DE':
        countryCode = 'DE';
        currency = 'EUR';
        language = 'de';
        break;
      case 'FR':
        countryCode = 'FR';
        currency = 'EUR';
        language = 'fr';
        break;
      case 'CH':
        countryCode = 'CH';
        currency = 'CHF';
        language = detectedLanguage === 'fr' ? 'fr' : 'de';
        break;
      case 'CA':
        countryCode = 'CA';
        currency = 'CAD';
        language = detectedLanguage === 'fr' ? 'fr' : 'en';
        break;
      case 'MX':
        countryCode = 'MX';
        currency = 'MXN';
        language = 'es';
        break;
      case 'JP':
        countryCode = 'JP';
        currency = 'JPY';
        language = 'en';
        break;
      default:
        if (euSet.has(validIso)) {
          countryCode = 'EU';
          currency = 'EUR';
        }
        break;
    }

    res.json({
      detected: true,
      countryCode,
      currency,
      language,
      units,
    });
  });

  app.get('/api/billing/status', (_req: Request, res: Response) => {
    const { stripeConfigured, mercadoPagoConfigured } = getBillingGatewayConfig();
    res.json({
      stripeConfigured,
      mercadoPagoConfigured,
      configured: stripeConfigured || mercadoPagoConfigured,
      supportedCurrencies: Object.keys(CURRENCY_META_SERVER),
    });
  });

  app.get('/api/billing/catalog', async (req: Request, res: Response) => {
    const rawCountry = typeof req.query.country === 'string' ? req.query.country.toUpperCase() : 'BR';
    const rawCurrency = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : 'BRL';
    const country = rawCountry in COUNTRY_FALLBACK_REGION ? rawCountry : 'BR';
    const currency = rawCurrency in CURRENCY_META_SERVER ? rawCurrency : 'BRL';

    const catalog = await loadServerPlanCatalog(country, currency);
    res.json({
      countryCode: country,
      currencyCode: currency,
      source: catalog.source,
      plans: catalog.plans,
    });
  });

  app.get('/api/billing/subscription', async (req: Request, res: Response) => {
    const user = await verifySupabaseUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const [subRes, payRes] = await Promise.all([
      supabaseRestFetch<Array<Record<string, unknown>>>(
        `user_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        { userToken: user.token }
      ),
      supabaseRestFetch<Array<Record<string, unknown>>>(
        `subscription_payments?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=30`,
        { userToken: user.token }
      ),
    ]);

    const rawSub = Array.isArray(subRes.data) && subRes.data[0] ? subRes.data[0] : null;
    if (rawSub) {
      const periodEndMs = Date.parse(String(rawSub.current_period_end || ''));
      const nowMs = Date.now();
      const sevenDaysMs = 7 * 86_400_000;
      let status = String(rawSub.status || 'active');

      // Evaluate expiration & 7-day grace period WITHOUT ever deleting vehicles or history
      if (Number.isFinite(periodEndMs) && nowMs > periodEndMs) {
        if ((status === 'active' || status === 'past_due') && nowMs <= periodEndMs + sevenDaysMs) {
          status = 'grace_period';
          const graceIso = new Date(periodEndMs + sevenDaysMs).toISOString();
          rawSub.status = status;
          rawSub.grace_period_end = graceIso;
          void supabaseRestFetch(`user_subscriptions?id=eq.${encodeURIComponent(String(rawSub.id))}`, {
            method: 'PATCH',
            userToken: user.token,
            body: { status, grace_period_end: graceIso, updated_at: new Date().toISOString() },
          });
        } else if (
          (status === 'active' || status === 'past_due' || status === 'grace_period') &&
          nowMs > periodEndMs + sevenDaysMs
        ) {
          status = 'expired';
          rawSub.status = status;
          void supabaseRestFetch(`user_subscriptions?id=eq.${encodeURIComponent(String(rawSub.id))}`, {
            method: 'PATCH',
            userToken: user.token,
            body: { status, updated_at: new Date().toISOString() },
          });
        }
      }
    }

    const subscription = rawSub
      ? {
          id: String(rawSub.id),
          userId: String(rawSub.user_id),
          planId: normalizeServerPlanId(String(rawSub.plan_id)) || 'personal',
          countryCode: String(rawSub.country_code || 'BR'),
          currencyCode: String(rawSub.currency_code || 'BRL'),
          billingCycle: rawSub.billing_cycle === 'annual' ? 'annual' : 'monthly',
          status: String(rawSub.status || 'active'),
          autoRenew: Boolean(rawSub.auto_renew ?? true),
          currentPeriodStart: String(rawSub.current_period_start || ''),
          currentPeriodEnd: String(rawSub.current_period_end || ''),
          gracePeriodEnd: rawSub.grace_period_end ? String(rawSub.grace_period_end) : null,
          canceledAt: rawSub.canceled_at ? String(rawSub.canceled_at) : null,
          provider: String(rawSub.provider || 'manual'),
          updatedAt: String(rawSub.updated_at || ''),
        }
      : null;

    const payments = Array.isArray(payRes.data)
      ? payRes.data.map((row) => ({
          id: String(row.id),
          planId: normalizeServerPlanId(String(row.plan_id)) || 'personal',
          amountMinor: Number(row.amount_minor ?? 0),
          taxMinor: Number(row.tax_minor ?? 0),
          processingFeeMinor: Number(row.processing_fee_minor ?? 0),
          currencyCode: String(row.currency_code || 'BRL'),
          countryCode: String(row.country_code || 'BR'),
          paymentMethod: String(row.payment_method || 'card'),
          provider: String(row.provider || 'stripe'),
          providerPaymentId: row.provider_payment_id ? String(row.provider_payment_id) : undefined,
          status: String(row.status || 'paid'),
          paidAt: String(row.paid_at || row.created_at || ''),
        }))
      : [];

    res.json({ subscription, payments });
  });

  app.post('/api/billing/subscription/manage', async (req: Request, res: Response) => {
    const user = await verifySupabaseUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { action, autoRenew, planId, countryCode, currencyCode, billingCycle } = req.body as {
      action?: string;
      autoRenew?: boolean;
      planId?: string;
      countryCode?: string;
      currencyCode?: string;
      billingCycle?: string;
    };

    const nowIso = new Date().toISOString();

    if (action === 'cancel') {
      const resp = await supabaseRestFetch<Array<Record<string, unknown>>>(
        `user_subscriptions?user_id=eq.${encodeURIComponent(user.id)}`,
        {
          method: 'PATCH',
          userToken: user.token,
          prefer: 'return=representation',
          body: {
            status: 'canceled',
            auto_renew: false,
            canceled_at: nowIso,
            updated_at: nowIso,
          },
        }
      );
      const row = Array.isArray(resp.data) ? resp.data[0] : null;
      res.json({
        subscription: row
          ? {
              id: String(row.id),
              userId: String(row.user_id),
              planId: normalizeServerPlanId(String(row.plan_id)) || 'personal',
              countryCode: String(row.country_code || 'BR'),
              currencyCode: String(row.currency_code || 'BRL'),
              billingCycle: row.billing_cycle === 'annual' ? 'annual' : 'monthly',
              status: String(row.status || 'canceled'),
              autoRenew: Boolean(row.auto_renew ?? false),
              currentPeriodStart: String(row.current_period_start || nowIso),
              currentPeriodEnd: String(row.current_period_end || nowIso),
              gracePeriodEnd: row.grace_period_end ? String(row.grace_period_end) : null,
              canceledAt: row.canceled_at ? String(row.canceled_at) : nowIso,
              provider: String(row.provider || 'manual'),
              updatedAt: nowIso,
            }
          : null,
      });
      return;
    }

    if (action === 'toggle_auto_renew') {
      const resp = await supabaseRestFetch<Array<Record<string, unknown>>>(
        `user_subscriptions?user_id=eq.${encodeURIComponent(user.id)}`,
        {
          method: 'PATCH',
          userToken: user.token,
          prefer: 'return=representation',
          body: {
            auto_renew: Boolean(autoRenew),
            updated_at: nowIso,
          },
        }
      );
      const row = Array.isArray(resp.data) ? resp.data[0] : null;
      res.json({
        subscription: row
          ? {
              id: String(row.id),
              userId: String(row.user_id),
              planId: normalizeServerPlanId(String(row.plan_id)) || 'personal',
              countryCode: String(row.country_code || 'BR'),
              currencyCode: String(row.currency_code || 'BRL'),
              billingCycle: row.billing_cycle === 'annual' ? 'annual' : 'monthly',
              status: String(row.status || 'active'),
              autoRenew: Boolean(row.auto_renew ?? true),
              currentPeriodStart: String(row.current_period_start || nowIso),
              currentPeriodEnd: String(row.current_period_end || nowIso),
              gracePeriodEnd: row.grace_period_end ? String(row.grace_period_end) : null,
              canceledAt: row.canceled_at ? String(row.canceled_at) : null,
              provider: String(row.provider || 'manual'),
              updatedAt: nowIso,
            }
          : null,
      });
      return;
    }

    if (action === 'change_plan') {
      const normalized = normalizeServerPlanId(planId);
      if (!normalized) {
        res.status(400).json({ error: 'Invalid planId.' });
        return;
      }
      const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
      const periodEndIso = new Date(
        Date.now() + (cycle === 'annual' ? 365 : 30) * 86_400_000
      ).toISOString();
      const safeCountry =
        countryCode && countryCode.toUpperCase() in COUNTRY_FALLBACK_REGION
          ? countryCode.toUpperCase()
          : 'BR';
      const safeCurr =
        currencyCode && currencyCode.toUpperCase() in CURRENCY_META_SERVER
          ? currencyCode.toUpperCase()
          : 'BRL';

      const resp = await supabaseRestFetch<Array<Record<string, unknown>>>(
        'user_subscriptions?on_conflict=user_id',
        {
          method: 'POST',
          userToken: user.token,
          prefer: 'resolution=merge-duplicates,return=representation',
          body: {
            user_id: user.id,
            plan_id: normalized,
            country_code: safeCountry,
            currency_code: safeCurr,
            billing_cycle: cycle,
            status: 'active',
            auto_renew: true,
            current_period_start: nowIso,
            current_period_end: periodEndIso,
            canceled_at: null,
            provider: 'manual',
            updated_at: nowIso,
          },
        }
      );

      await supabaseRestFetch(`user_preferences?user_id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        userToken: user.token,
        body: { active_plan: normalized, country_code: safeCountry, currency: safeCurr },
      });

      const row = Array.isArray(resp.data) ? resp.data[0] : null;
      res.json({
        subscription: row
          ? {
              id: String(row.id),
              userId: String(row.user_id),
              planId: normalized,
              countryCode: safeCountry,
              currencyCode: safeCurr,
              billingCycle: cycle,
              status: 'active',
              autoRenew: true,
              currentPeriodStart: String(row.current_period_start || nowIso),
              currentPeriodEnd: String(row.current_period_end || periodEndIso),
              gracePeriodEnd: null,
              canceledAt: null,
              provider: String(row.provider || 'manual'),
              updatedAt: nowIso,
            }
          : null,
      });
      return;
    }

    res.status(400).json({ error: 'Unsupported subscription management action.' });
  });

  app.post('/api/billing/checkout-session', async (req: Request, res: Response) => {
    const { planId, countryCode, currency, billingCycle, paymentMethod, payerEmail } = req.body as {
      planId?: string;
      countryCode?: string;
      currency?: string;
      billingCycle?: string;
      paymentMethod?: string;
      payerEmail?: string;
    };

    const canonicalPlanId = normalizeServerPlanId(planId);
    if (!canonicalPlanId) {
      res.status(400).json({ error: 'Plano selecionado inválido.' });
      return;
    }
    if (canonicalPlanId === 'enterprise') {
      res.status(400).json({
        error:
          'O Plano Empresarial Personalizado possui faturamento corporativo sob contrato. Entre em contato comercial para ativação.',
      });
      return;
    }

    const requestedCurr = typeof currency === 'string' ? currency.toUpperCase() : 'BRL';
    const currMeta = CURRENCY_META_SERVER[requestedCurr];
    if (!currMeta) {
      res.status(400).json({ error: 'Unsupported currency code.' });
      return;
    }
    const safeCountry =
      typeof countryCode === 'string' && countryCode.toUpperCase() in COUNTRY_FALLBACK_REGION
        ? countryCode.toUpperCase()
        : 'BR';

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const method =
      paymentMethod === 'pix' ||
      paymentMethod === 'sepa_debit' ||
      paymentMethod === 'apple_google_pay'
        ? paymentMethod
        : 'card';

    if (method === 'sepa_debit' && requestedCurr !== 'EUR') {
      res.status(400).json({ error: 'SEPA Direct Debit is only supported for EUR transactions.' });
      return;
    }

    // Stripe requires BRL currency for Pix transactions
    const curr = method === 'pix' ? 'BRL' : requestedCurr;
    const effectiveCountry = method === 'pix' ? 'BR' : safeCountry;
    const effectiveCurrMeta = CURRENCY_META_SERVER[curr];

    const catalog = await loadServerPlanCatalog(effectiveCountry, curr);
    const planItem = catalog.plans.find((p) => p.id === canonicalPlanId);
    if (!planItem) {
      res.status(404).json({ error: 'Plano não encontrado no catálogo.' });
      return;
    }

    const breakdown = computeServerBreakdown(planItem.price, cycle);
    const unitAmount = breakdown.totalMinor;
    const isZeroDec = effectiveCurrMeta.decimals === 0;
    const displayAmount = isZeroDec ? unitAmount : unitAmount / 100;
    const formattedAmount = `${effectiveCurrMeta.symbol} ${displayAmount.toFixed(isZeroDec ? 0 : 2)}`;
    const cleanEmail =
      typeof payerEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.trim())
        ? payerEmail.trim()
        : 'pagamento@autolife.world';

    const { stripeKey, stripeConfigured, mpToken, mercadoPagoConfigured } =
      getBillingGatewayConfig();

    if (!stripeConfigured && !mercadoPagoConfigured) {
      res.status(503).json({
        error:
          'Gateway de pagamento online ainda não configurado no servidor. Adicione STRIPE_SECRET_KEY ou MERCADOPAGO_ACCESS_TOKEN no .env do servidor e reinicie a aplicação.',
      });
      return;
    }

    try {
      const baseUrl = resolveSafeBaseUrl(req);

      // 1. Direct Pix via Mercado Pago (instant QR Code + Copia e Cola)
      if (method === 'pix' && mercadoPagoConfigured) {
        const amountBrl = Number((unitAmount / 100).toFixed(2));
        const mpResp = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `autolife-${canonicalPlanId}-${cycle}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          },
          body: JSON.stringify({
            transaction_amount: amountBrl,
            description: `${planItem.name} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`,
            payment_method_id: 'pix',
            payer: { email: cleanEmail },
            external_reference: JSON.stringify({
              planId: canonicalPlanId,
              countryCode: effectiveCountry,
              cycle,
              curr: 'BRL',
              totalMinor: unitAmount,
              taxMinor: breakdown.taxMinor,
              processingFeeMinor: breakdown.processingFeeMinor,
            }),
          }),
        });

        const mpJson = (await mpResp.json()) as {
          id?: number | string;
          status?: string;
          message?: string;
          point_of_interaction?: {
            transaction_data?: {
              qr_code?: string;
              qr_code_base64?: string;
              ticket_url?: string;
            };
          };
        };

        const txData = mpJson.point_of_interaction?.transaction_data;
        if (!mpResp.ok || !mpJson.id || !txData?.qr_code) {
          res.status(502).json({
            error: mpJson.message || 'Não foi possível gerar o QR Code Pix no Mercado Pago.',
          });
          return;
        }

        res.json({
          mode: 'mercadopago_pix',
          paymentId: String(mpJson.id),
          status: mpJson.status || 'pending',
          qrCode: txData.qr_code,
          qrCodeBase64: txData.qr_code_base64 || '',
          ticketUrl: txData.ticket_url || '',
          formattedAmount,
        });
        return;
      }

      // 2. Stripe Checkout (Card, Apple/Google Pay, SEPA, or Stripe Pix in BRL)
      if (stripeConfigured) {
        const params = new URLSearchParams();
        const isOneTimePix = method === 'pix';
        params.set('mode', isOneTimePix ? 'payment' : 'subscription');
        params.set(
          'success_url',
          `${baseUrl}/?checkout=success&plan=${encodeURIComponent(
            canonicalPlanId
          )}&session_id={CHECKOUT_SESSION_ID}`
        );
        params.set('cancel_url', `${baseUrl}/?checkout=cancelled`);
        if (cleanEmail !== 'pagamento@autolife.world') {
          params.set('customer_email', cleanEmail);
        }

        if (method === 'pix') {
          // Stripe requires BRL currency and payment mode for Pix; include card alongside pix
          params.append('payment_method_types[]', 'pix');
          params.append('payment_method_types[]', 'card');
          params.set('payment_method_options[pix][expires_after_seconds]', '3600');
        } else if (method === 'sepa_debit') {
          params.append('payment_method_types[]', 'sepa_debit');
        } else {
          params.append('payment_method_types[]', 'card');
        }

        params.set('line_items[0][quantity]', '1');
        params.set('line_items[0][price_data][currency]', curr.toLowerCase());
        params.set('line_items[0][price_data][unit_amount]', String(unitAmount));
        params.set(
          'line_items[0][price_data][product_data][name]',
          `${planItem.name} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`
        );
        if (!isOneTimePix) {
          params.set(
            'line_items[0][price_data][recurring][interval]',
            cycle === 'annual' ? 'year' : 'month'
          );
        }
        params.set('metadata[planId]', canonicalPlanId);
        params.set('metadata[countryCode]', effectiveCountry);
        params.set('metadata[currency]', curr);
        params.set('metadata[billingCycle]', cycle);
        params.set('metadata[taxMinor]', String(breakdown.taxMinor));
        params.set('metadata[processingFeeMinor]', String(breakdown.processingFeeMinor));
        params.set('metadata[totalMinor]', String(breakdown.totalMinor));
        params.set('metadata[paymentMethod]', method);

        const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const stripeJson = (await stripeResp.json()) as {
          id?: string;
          url?: string;
          error?: { message?: string };
        };

        if (!stripeResp.ok || !stripeJson.url) {
          const rawErr = stripeJson.error?.message || '';
          const friendlyError =
            method === 'pix' && rawErr.toLowerCase().includes('pix is invalid')
              ? 'O Pix ainda não está ativado na sua conta Stripe. Ative o Pix em dashboard.stripe.com/account/payments/settings ou selecione Cartão de Crédito/Débito.'
              : rawErr || 'Falha ao criar sessão de pagamento no Stripe.';
          res.status(502).json({ error: friendlyError });
          return;
        }

        res.json({
          mode: 'stripe_live',
          stripeConfigured: true,
          checkoutUrl: stripeJson.url,
          sessionId: stripeJson.id,
        });
        return;
      }

      // 3. Mercado Pago Checkout Pro fallback for Card payments when Stripe is not configured
      if (mercadoPagoConfigured && (method === 'card' || method === 'apple_google_pay')) {
        const mpCurr = curr === 'BRL' || curr === 'MXN' ? curr : 'BRL';
        const mpCatalog = await loadServerPlanCatalog(mpCurr === 'MXN' ? 'MX' : 'BR', mpCurr);
        const mpPlan = mpCatalog.plans.find((p) => p.id === canonicalPlanId) || planItem;
        const mpBreak = computeServerBreakdown(mpPlan.price, cycle);
        const mpUnitPrice = Number((mpBreak.totalMinor / 100).toFixed(2));

        const prefResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                title: `${planItem.name} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`,
                quantity: 1,
                currency_id: mpCurr,
                unit_price: mpUnitPrice,
              },
            ],
            payer: { email: cleanEmail },
            external_reference: JSON.stringify({
              planId: canonicalPlanId,
              countryCode: safeCountry,
              cycle,
              curr: mpCurr,
              totalMinor: mpBreak.totalMinor,
              taxMinor: mpBreak.taxMinor,
              processingFeeMinor: mpBreak.processingFeeMinor,
            }),
            back_urls: {
              success: `${baseUrl}/?checkout=mp_success&plan=${encodeURIComponent(canonicalPlanId)}`,
              failure: `${baseUrl}/?checkout=cancelled`,
              pending: `${baseUrl}/?checkout=mp_pending&plan=${encodeURIComponent(canonicalPlanId)}`,
            },
            auto_return: 'approved',
          }),
        });

        const prefJson = (await prefResp.json()) as {
          id?: string;
          init_point?: string;
          message?: string;
        };

        if (!prefResp.ok || !prefJson.init_point) {
          res.status(502).json({
            error: prefJson.message || 'Não foi possível iniciar o checkout com cartão.',
          });
          return;
        }

        res.json({
          mode: 'mercadopago_checkout',
          checkoutUrl: prefJson.init_point,
          preferenceId: prefJson.id,
        });
        return;
      }

      res.status(400).json({
        error: 'Método de pagamento incompatível com o gateway configurado.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected billing gateway error.';
      console.error('Billing checkout error:', error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get('/api/billing/verify-session', async (req: Request, res: Response) => {
    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      res.status(400).json({ error: 'Invalid Stripe session_id format.' });
      return;
    }

    const { stripeKey, stripeConfigured } = getBillingGatewayConfig();
    if (!stripeConfigured) {
      res.status(503).json({ error: 'Stripe gateway not configured on server.' });
      return;
    }

    try {
      const stripeResp = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${stripeKey}` },
        }
      );
      const data = (await stripeResp.json()) as {
        payment_status?: string;
        amount_total?: number;
        currency?: string;
        metadata?: Record<string, string>;
      };
      if (!stripeResp.ok) {
        res.status(502).json({ error: 'Unable to verify checkout session.' });
        return;
      }

      const verified = data.payment_status === 'paid';
      const planId = normalizeServerPlanId(data.metadata?.planId);
      const countryCode = data.metadata?.countryCode || 'BR';
      const currencyCode = (data.metadata?.currency || data.currency || 'BRL').toUpperCase();
      const billingCycle = data.metadata?.billingCycle === 'annual' ? 'annual' : 'monthly';

      if (verified && planId) {
        const user = await verifySupabaseUser(req);
        if (user) {
          await persistVerifiedSubscriptionPayment({
            userId: user.id,
            userToken: user.token,
            planId,
            countryCode,
            currencyCode,
            billingCycle,
            amountMinor: Number(data.amount_total ?? data.metadata?.totalMinor ?? 0),
            taxMinor: Number(data.metadata?.taxMinor ?? 0),
            processingFeeMinor: Number(data.metadata?.processingFeeMinor ?? 0),
            paymentMethod: data.metadata?.paymentMethod || 'card',
            provider: 'stripe',
            providerPaymentId: sessionId,
          });
        }
      }

      res.json({
        verified,
        planId,
        countryCode,
        currencyCode,
      });
    } catch {
      res.status(500).json({ error: 'Failed to verify Stripe session.' });
    }
  });

  app.get('/api/billing/verify-mp-payment', async (req: Request, res: Response) => {
    const paymentId = typeof req.query.payment_id === 'string' ? req.query.payment_id.trim() : '';
    if (!paymentId || !/^[0-9]+$/.test(paymentId)) {
      res.status(400).json({ error: 'Invalid payment_id format.' });
      return;
    }

    const { mpToken, mercadoPagoConfigured } = getBillingGatewayConfig();
    if (!mercadoPagoConfigured) {
      res.status(503).json({ error: 'Mercado Pago gateway not configured on server.' });
      return;
    }

    try {
      const mpResp = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `Bearer ${mpToken}` },
        }
      );
      const data = (await mpResp.json()) as {
        status?: string;
        transaction_amount?: number;
        payment_method_id?: string;
        external_reference?: string;
      };
      if (!mpResp.ok) {
        res.status(502).json({ error: 'Não foi possível consultar o status do pagamento Pix.' });
        return;
      }

      let planId: ServerPlanId | null = null;
      let countryCode = 'BR';
      let currencyCode = 'BRL';
      let billingCycle: 'monthly' | 'annual' = 'monthly';
      let taxMinor = 0;
      let processingFeeMinor = 0;

      if (data.external_reference) {
        try {
          const parsedRef = JSON.parse(data.external_reference) as {
            planId?: string;
            countryCode?: string;
            curr?: string;
            cycle?: string;
            taxMinor?: number;
            processingFeeMinor?: number;
          };
          planId = normalizeServerPlanId(parsedRef.planId);
          if (parsedRef.countryCode) countryCode = parsedRef.countryCode;
          if (parsedRef.curr) currencyCode = parsedRef.curr;
          if (parsedRef.cycle === 'annual') billingCycle = 'annual';
          if (parsedRef.taxMinor) taxMinor = Number(parsedRef.taxMinor);
          if (parsedRef.processingFeeMinor) processingFeeMinor = Number(parsedRef.processingFeeMinor);
        } catch {
          // Ignore malformed external_reference
        }
      }

      const verified = data.status === 'approved';
      if (verified && planId) {
        const user = await verifySupabaseUser(req);
        if (user) {
          await persistVerifiedSubscriptionPayment({
            userId: user.id,
            userToken: user.token,
            planId,
            countryCode,
            currencyCode,
            billingCycle,
            amountMinor: Math.round(Number(data.transaction_amount ?? 0) * 100),
            taxMinor,
            processingFeeMinor,
            paymentMethod: data.payment_method_id || 'pix',
            provider: 'mercadopago',
            providerPaymentId: paymentId,
          });
        }
      }

      res.json({
        verified,
        status: data.status || 'pending',
        planId,
        countryCode,
        currencyCode,
      });
    } catch {
      res.status(500).json({ error: 'Erro ao verificar pagamento Mercado Pago.' });
    }
  });

  // ============================================================================
  // ADMIN PANEL API (Restricted to verified ADMIN_EMAIL / picelador@gmail.com)
  // ============================================================================
  function getAllowedAdminEmails(): Set<string> {
    const allowed = new Set<string>(['picelador@gmail.com']);
    const raw = process.env.ADMIN_EMAIL || '';
    for (const part of raw.split(',')) {
      const cleaned = part.trim().toLowerCase();
      if (cleaned) allowed.add(cleaned);
    }
    return allowed;
  }

  async function verifyAdminUser(
    req: Request
  ): Promise<{ id: string; email: string; token: string } | null> {
    const user = await verifySupabaseUser(req);
    if (!user || !user.email) return null;
    const emailLower = user.email.trim().toLowerCase();
    if (!getAllowedAdminEmails().has(emailLower)) return null;
    return { id: user.id, email: emailLower, token: user.token };
  }

  app.get('/api/admin/status', async (req: Request, res: Response) => {
    const admin = await verifyAdminUser(req);
    res.json({
      isAdmin: Boolean(admin),
      email: admin?.email ?? null,
    });
  });

  app.get('/api/admin/users', async (req: Request, res: Response) => {
    const admin = await verifyAdminUser(req);
    if (!admin) {
      res.status(403).json({ error: 'Acesso restrito ao administrador.' });
      return;
    }

    const cfg = getSupabaseServerConfig();
    if (!cfg.configured) {
      res.status(503).json({ error: 'Supabase não configurado no servidor.' });
      return;
    }

    // 1. If SUPABASE_SERVICE_ROLE_KEY is configured, query Auth Admin API + tables directly
    if (cfg.serviceRoleKey) {
      try {
        const authHeaders: Record<string, string> = {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
        };
        const [authRes, subsRes, prefsRes, vehiclesRes] = await Promise.all([
          fetch(`${cfg.url}/auth/v1/admin/users?page=1&per_page=200`, {
            headers: authHeaders,
          }),
          supabaseRestFetch<Array<Record<string, unknown>>>(
            'user_subscriptions?select=user_id,plan_id,status,billing_cycle,provider,current_period_end'
          ),
          supabaseRestFetch<Array<Record<string, unknown>>>(
            'user_preferences?select=user_id,active_plan'
          ),
          supabaseRestFetch<Array<{ user_id: string }>>('vehicles?select=user_id'),
        ]);

        if (authRes.ok) {
          const authJson = (await authRes.json()) as {
            users?: Array<{
              id: string;
              email?: string;
              created_at?: string;
              user_metadata?: Record<string, unknown>;
            }>;
          };
          const subsMap = new Map<string, Record<string, unknown>>();
          for (const row of Array.isArray(subsRes.data) ? subsRes.data : []) {
            subsMap.set(String(row.user_id), row);
          }
          const prefsMap = new Map<string, Record<string, unknown>>();
          for (const row of Array.isArray(prefsRes.data) ? prefsRes.data : []) {
            prefsMap.set(String(row.user_id), row);
          }
          const vehicleCounts = new Map<string, number>();
          for (const row of Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []) {
            const uid = String(row.user_id);
            vehicleCounts.set(uid, (vehicleCounts.get(uid) ?? 0) + 1);
          }

          const users = (authJson.users ?? [])
            .map((u) => {
              const sub = subsMap.get(u.id);
              const pref = prefsMap.get(u.id);
              const meta = u.user_metadata ?? {};
              const fullName =
                (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
                (typeof meta.name === 'string' && meta.name.trim()) ||
                '';
              const activePlan =
                normalizeServerPlanId(
                  (sub?.plan_id ? String(sub.plan_id) : null) ??
                    (pref?.active_plan ? String(pref.active_plan) : null)
                ) || 'personal';
              return {
                userId: u.id,
                email: u.email ?? '',
                fullName,
                createdAt: u.created_at ?? '',
                activePlan,
                subscriptionStatus: sub?.status ? String(sub.status) : 'active',
                billingCycle: sub?.billing_cycle === 'annual' ? 'annual' : 'monthly',
                provider: sub?.provider ? String(sub.provider) : 'manual',
                currentPeriodEnd: sub?.current_period_end ? String(sub.current_period_end) : null,
                vehiclesCount: vehicleCounts.get(u.id) ?? 0,
              };
            })
            .sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));

          res.json({ users, needsSqlSetup: false });
          return;
        }
      } catch {
        // Fall through to RPC path below
      }
    }

    // 2. Standard path using SECURITY DEFINER RPC with admin's verified JWT
    try {
      const rpcResp = await fetch(`${cfg.url}/rest/v1/rpc/admin_list_users`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey || cfg.serviceRoleKey,
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      const text = await rpcResp.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
      }

      if (!rpcResp.ok) {
        const errObj = parsed as { code?: string; message?: string } | null;
        const msg = errObj?.message || '';
        const code = errObj?.code || '';
        if (rpcResp.status === 404 || code === 'PGRST202' || msg.includes('admin_list_users')) {
          res.json({ users: [], needsSqlSetup: true });
          return;
        }
        res.status(rpcResp.status).json({ error: msg || 'Não foi possível listar contas.' });
        return;
      }

      const rows = Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
      const users = rows.map((r) => ({
        userId: String(r.user_id ?? ''),
        email: String(r.email ?? ''),
        fullName: String(r.full_name ?? ''),
        createdAt: String(r.created_at ?? ''),
        activePlan: normalizeServerPlanId(String(r.active_plan ?? 'personal')) || 'personal',
        subscriptionStatus: String(r.subscription_status ?? 'active'),
        billingCycle: r.billing_cycle === 'annual' ? 'annual' : 'monthly',
        provider: String(r.provider ?? 'manual'),
        currentPeriodEnd: r.current_period_end ? String(r.current_period_end) : null,
        vehiclesCount: Number(r.vehicles_count ?? 0),
      }));

      res.json({ users, needsSqlSetup: false });
    } catch {
      res.status(500).json({ error: 'Erro ao consultar usuários no Supabase.' });
    }
  });

  app.post('/api/admin/grant-plan', async (req: Request, res: Response) => {
    const admin = await verifyAdminUser(req);
    if (!admin) {
      res.status(403).json({ error: 'Acesso restrito ao administrador.' });
      return;
    }

    const { email, planId, durationDays } = req.body as {
      email?: string;
      planId?: string;
      durationDays?: number;
    };

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }

    const canonicalPlan = normalizeServerPlanId(planId);
    if (!canonicalPlan) {
      res.status(400).json({ error: 'Plano selecionado inválido.' });
      return;
    }

    const parsedDays = Number(durationDays);
    const safeDays = Number.isFinite(parsedDays)
      ? Math.max(1, Math.min(3650, Math.round(parsedDays)))
      : 365;

    const cfg = getSupabaseServerConfig();
    if (!cfg.configured) {
      res.status(503).json({ error: 'Supabase não configurado no servidor.' });
      return;
    }

    // 1. Service role path if configured
    if (cfg.serviceRoleKey) {
      try {
        const authResp = await fetch(
          `${cfg.url}/auth/v1/admin/users?page=1&per_page=200`,
          {
            headers: {
              apikey: cfg.serviceRoleKey,
              Authorization: `Bearer ${cfg.serviceRoleKey}`,
            },
          }
        );
        if (authResp.ok) {
          const authJson = (await authResp.json()) as {
            users?: Array<{ id: string; email?: string }>;
          };
          const targetUser = (authJson.users ?? []).find(
            (u) => (u.email ?? '').trim().toLowerCase() === cleanEmail
          );
          if (!targetUser) {
            res.status(404).json({
              error:
                'Conta não encontrada. O usuário precisa ter entrado no app pelo menos uma vez.',
            });
            return;
          }

          const nowIso = new Date().toISOString();
          const periodEndIso = new Date(Date.now() + safeDays * 86_400_000).toISOString();
          const cycle = safeDays >= 300 ? 'annual' : 'monthly';

          await Promise.all([
            supabaseRestFetch('user_subscriptions?on_conflict=user_id', {
              method: 'POST',
              prefer: 'resolution=merge-duplicates,return=representation',
              body: {
                user_id: targetUser.id,
                plan_id: canonicalPlan,
                country_code: 'BR',
                currency_code: 'BRL',
                billing_cycle: cycle,
                status: 'active',
                auto_renew: false,
                current_period_start: nowIso,
                current_period_end: periodEndIso,
                grace_period_end: null,
                canceled_at: null,
                provider: 'manual',
                updated_at: nowIso,
              },
            }),
            supabaseRestFetch('user_preferences?on_conflict=user_id', {
              method: 'POST',
              prefer: 'resolution=merge-duplicates',
              body: {
                user_id: targetUser.id,
                active_plan: canonicalPlan,
                updated_at: nowIso,
              },
            }),
          ]);

          res.json({
            granted: true,
            userId: targetUser.id,
            email: targetUser.email ?? cleanEmail,
            planId: canonicalPlan,
            status: 'active',
            currentPeriodEnd: periodEndIso,
          });
          return;
        }
      } catch {
        // Fall through to RPC path below
      }
    }

    // 2. Standard path using SECURITY DEFINER RPC with admin's verified JWT
    try {
      const rpcResp = await fetch(`${cfg.url}/rest/v1/rpc/admin_grant_plan`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey || cfg.serviceRoleKey,
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_email: cleanEmail,
          target_plan_id: canonicalPlan,
          duration_days: safeDays,
        }),
      });

      const text = await rpcResp.text();
      let parsed: Record<string, unknown> | null = null;
      if (text) {
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          parsed = null;
        }
      }

      if (!rpcResp.ok) {
        const msg = typeof parsed?.message === 'string' ? parsed.message : '';
        const code = typeof parsed?.code === 'string' ? parsed.code : '';
        if (rpcResp.status === 404 || code === 'PGRST202' || msg.includes('admin_grant_plan')) {
          res.status(503).json({
            needsSqlSetup: true,
            error:
              'Função Admin ainda não instalada no Supabase. Copie e execute o SQL único mostrado nesta tela.',
          });
          return;
        }
        res.status(400).json({ error: msg || 'Não foi possível liberar o plano.' });
        return;
      }

      res.json({
        granted: true,
        userId: String(parsed?.userId ?? ''),
        email: String(parsed?.email ?? cleanEmail),
        planId: canonicalPlan,
        status: String(parsed?.status ?? 'active'),
        currentPeriodEnd: parsed?.currentPeriodEnd ? String(parsed.currentPeriodEnd) : null,
      });
    } catch {
      res.status(500).json({ error: 'Erro ao liberar plano no Supabase.' });
    }
  });

  app.get('/api/passport/:token', async (req: Request, res: Response) => {
    const token = typeof req.params.token === 'string' ? req.params.token.trim() : '';
    if (!/^[a-f0-9]{16,64}$/i.test(token)) {
      res.status(400).json({ error: 'Token do Passaporte Digital inválido.' });
      return;
    }

    const cfg = getSupabaseServerConfig();
    if (!cfg.configured) {
      res.status(503).json({ error: 'Consulta pública indisponível no momento.' });
      return;
    }

    try {
      const shareRes = await supabaseRestFetch<Array<Record<string, unknown>>>(
        `vehicle_passport_shares?share_token=eq.${encodeURIComponent(
          token
        )}&is_active=eq.true&limit=1`
      );
      const row = Array.isArray(shareRes.data) ? shareRes.data[0] : null;
      if (!row) {
        res.status(404).json({ error: 'Passaporte não encontrado ou compartilhamento revogado.' });
        return;
      }

      if (row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()) {
        res.status(410).json({ error: 'Este link de compartilhamento expirou.' });
        return;
      }

      res.json({
        share: {
          id: String(row.id),
          vehicleId: String(row.vehicle_id),
          shareToken: String(row.share_token),
          isActive: Boolean(row.is_active),
          includeExpenses: Boolean(row.include_expenses),
          includeDocuments: Boolean(row.include_documents),
          passportSnapshot: row.passport_snapshot,
          expiresAt: row.expires_at ? String(row.expires_at) : null,
          createdAt: String(row.created_at || ''),
        },
      });
    } catch {
      res.status(500).json({ error: 'Falha ao consultar Passaporte Digital.' });
    }
  });

  // Web Push (VAPID) + Scheduled Maintenance Notification Dispatcher
  const hasPersistentVapid = Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      !process.env.VAPID_PUBLIC_KEY.includes('YOUR_') &&
      !process.env.VAPID_PUBLIC_KEY.includes('COLE_')
  );
  let vapidKeys = hasPersistentVapid
    ? {
        publicKey: process.env.VAPID_PUBLIC_KEY as string,
        privateKey: process.env.VAPID_PRIVATE_KEY as string,
      }
    : webpush.generateVAPIDKeys();

  const vapidSubject =
    process.env.VAPID_SUBJECT && process.env.VAPID_SUBJECT.startsWith('mailto:')
      ? process.env.VAPID_SUBJECT
      : 'mailto:suporte@autolife.world';

  try {
    webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);
  } catch (vapidErr) {
    console.warn('Invalid VAPID keys in environment; falling back to ephemeral keys:', vapidErr);
    vapidKeys = webpush.generateVAPIDKeys();
    webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);
  }

  interface StoredPushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface ScheduledPushReminder {
    id: string;
    endpoint: string;
    title: string;
    body: string;
    url: string;
    tag: string;
    dueAtMs: number;
    sent: boolean;
  }

  const pushSubscriptions = new Map<string, StoredPushSubscription>();
  const scheduledReminders = new Map<string, ScheduledPushReminder>();

  function validatePushSubscription(raw: unknown): StoredPushSubscription | null {
    if (!raw || typeof raw !== 'object') return null;
    const sub = raw as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    if (typeof sub.endpoint !== 'string' || !sub.keys) return null;
    if (typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') {
      return null;
    }
    if (!/^[A-Za-z0-9\-_]{16,256}$/.test(sub.keys.p256dh)) return null;
    if (!/^[A-Za-z0-9\-_]{8,128}$/.test(sub.keys.auth)) return null;

    try {
      const parsed = new URL(sub.endpoint);
      if (parsed.protocol !== 'https:') return null;
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
        host.endsWith('.local')
      ) {
        return null;
      }
      return {
        endpoint: parsed.toString(),
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      };
    } catch {
      return null;
    }
  }

  async function dispatchPushToSubscription(
    sub: StoredPushSubscription,
    payload: { title: string; body: string; url?: string; tag?: string }
  ): Promise<boolean> {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          tag: payload.tag || 'autolife-reminder',
        })
      );
      return true;
    } catch (err: unknown) {
      const statusCode =
        typeof err === 'object' && err !== null && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        pushSubscriptions.delete(sub.endpoint);
        for (const [remKey, rem] of scheduledReminders.entries()) {
          if (rem.endpoint === sub.endpoint) {
            scheduledReminders.delete(remKey);
          }
        }
      }
      return false;
    }
  }

  // Background scheduler checks due maintenance reminders every 30s
  setInterval(() => {
    const now = Date.now();
    for (const reminder of scheduledReminders.values()) {
      if (reminder.sent || reminder.dueAtMs > now) continue;
      const sub = pushSubscriptions.get(reminder.endpoint);
      if (!sub) {
        scheduledReminders.delete(reminder.id);
        continue;
      }
      reminder.sent = true;
      void dispatchPushToSubscription(sub, {
        title: reminder.title,
        body: reminder.body,
        url: reminder.url,
        tag: reminder.tag,
      });
    }
  }, 30_000);

  app.get('/api/maps/config', (_req: Request, res: Response) => {
    const apiKey = (
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ''
    ).trim();
    res.json({ apiKey });
  });

  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    res.json({
      publicKey: vapidKeys.publicKey,
      persistentConfigured: hasPersistentVapid,
    });
  });

  app.post('/api/push/subscribe', (req: Request, res: Response) => {
    const { subscription, reminders } = req.body as {
      subscription?: unknown;
      reminders?: Array<{
        id?: string;
        title?: string;
        body?: string;
        dueAtIso?: string;
      }>;
    };

    const validSub = validatePushSubscription(subscription);
    if (!validSub) {
      res.status(400).json({ error: 'Invalid Web Push subscription payload.' });
      return;
    }

    pushSubscriptions.set(validSub.endpoint, validSub);

    // Replace previous reminders for this endpoint with fresh schedule
    for (const [key, rem] of scheduledReminders.entries()) {
      if (rem.endpoint === validSub.endpoint) {
        scheduledReminders.delete(key);
      }
    }

    let scheduledCount = 0;
    if (Array.isArray(reminders)) {
      for (const rawItem of reminders.slice(0, 30)) {
        if (!rawItem || typeof rawItem.title !== 'string' || typeof rawItem.body !== 'string') {
          continue;
        }
        const dueMs = rawItem.dueAtIso ? Date.parse(rawItem.dueAtIso) : Date.now() + 86_400_000;
        const safeDueMs = Number.isFinite(dueMs) ? dueMs : Date.now() + 86_400_000;
        const id = `${validSub.endpoint.slice(-24)}:${String(rawItem.id || scheduledCount)}`;
        scheduledReminders.set(id, {
          id,
          endpoint: validSub.endpoint,
          title: rawItem.title.slice(0, 120),
          body: rawItem.body.slice(0, 240),
          url: '/',
          tag: `autolife-${String(rawItem.id || scheduledCount).slice(0, 32)}`,
          dueAtMs: safeDueMs,
          sent: false,
        });
        scheduledCount++;
      }
    }

    res.json({
      subscribed: true,
      scheduledCount,
      persistentVapidConfigured: hasPersistentVapid,
    });
  });

  app.post('/api/push/unsubscribe', (req: Request, res: Response) => {
    const { endpoint } = req.body as { endpoint?: string };
    if (typeof endpoint === 'string') {
      pushSubscriptions.delete(endpoint);
      for (const [key, rem] of scheduledReminders.entries()) {
        if (rem.endpoint === endpoint) {
          scheduledReminders.delete(key);
        }
      }
    }
    res.json({ unsubscribed: true });
  });

  app.post('/api/push/test', async (req: Request, res: Response) => {
    const { subscription, delaySeconds, title, body } = req.body as {
      subscription?: unknown;
      delaySeconds?: number;
      title?: string;
      body?: string;
    };

    const validSub = validatePushSubscription(subscription);
    if (!validSub) {
      res.status(400).json({ error: 'Valid PushSubscription is required.' });
      return;
    }

    pushSubscriptions.set(validSub.endpoint, validSub);
    const delay = Math.min(15, Math.max(0, Number(delaySeconds) || 0));
    const safeTitle =
      typeof title === 'string' && title.trim()
        ? title.trim().slice(0, 100)
        : 'AutoLife World · Lembrete Preventivo';
    const safeBody =
      typeof body === 'string' && body.trim()
        ? body.trim().slice(0, 220)
        : 'Notificação push ativa! Você será avisado sobre óleo, pneus e revisões mesmo com o app fechado.';

    if (delay > 0) {
      setTimeout(() => {
        void dispatchPushToSubscription(validSub, {
          title: safeTitle,
          body: safeBody,
          url: '/',
          tag: 'autolife-test-delayed',
        });
      }, delay * 1000);

      res.json({
        queued: true,
        delaySeconds: delay,
        message: `Push agendado para ${delay}s.`,
      });
      return;
    }

    const ok = await dispatchPushToSubscription(validSub, {
      title: safeTitle,
      body: safeBody,
      url: '/',
      tag: 'autolife-test-now',
    });
    if (!ok) {
      res.status(502).json({
        error: 'Não foi possível entregar o push para o serviço do navegador neste ambiente.',
      });
      return;
    }
    res.json({ delivered: true });
  });

  const httpServer = http.createServer(app);
  const hmrDisabled = process.env.DISABLE_HMR === 'true';

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('registerSW.js')
          ) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          }
        },
      })
    );
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoLife World server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
