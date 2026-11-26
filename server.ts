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

  // Multi-Currency SaaS Billing Catalog (authoritative server-side pricing in minor units)
  const SERVER_PLAN_CATALOG: Record<
    'plus' | 'fleet',
    {
      name: string;
      prices: Record<
        string,
        { monthlyMinor: number; annualMinor: number; zeroDecimal?: boolean; symbol: string }
      >;
    }
  > = {
    plus: {
      name: 'AutoLife Plus (Multiveículos)',
      prices: {
        BRL: { monthlyMinor: 1990, annualMinor: 19080, symbol: 'R$' },
        USD: { monthlyMinor: 499, annualMinor: 4788, symbol: '$' },
        EUR: { monthlyMinor: 499, annualMinor: 4788, symbol: '€' },
        GBP: { monthlyMinor: 399, annualMinor: 3828, symbol: '£' },
        CAD: { monthlyMinor: 699, annualMinor: 6708, symbol: 'CA$' },
        CHF: { monthlyMinor: 450, annualMinor: 4320, symbol: 'CHF' },
        MXN: { monthlyMinor: 8900, annualMinor: 85440, symbol: 'MX$' },
        JPY: { monthlyMinor: 750, annualMinor: 7200, zeroDecimal: true, symbol: '¥' },
      },
    },
    fleet: {
      name: 'AutoLife Frotas & Oficinas',
      prices: {
        BRL: { monthlyMinor: 14900, annualMinor: 142800, symbol: 'R$' },
        USD: { monthlyMinor: 2990, annualMinor: 28680, symbol: '$' },
        EUR: { monthlyMinor: 2790, annualMinor: 26760, symbol: '€' },
        GBP: { monthlyMinor: 2490, annualMinor: 23880, symbol: '£' },
        CAD: { monthlyMinor: 3990, annualMinor: 38280, symbol: 'CA$' },
        CHF: { monthlyMinor: 2690, annualMinor: 25800, symbol: 'CHF' },
        MXN: { monthlyMinor: 54900, annualMinor: 526800, symbol: 'MX$' },
        JPY: { monthlyMinor: 4500, annualMinor: 43200, zeroDecimal: true, symbol: '¥' },
      },
    },
  };

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

  app.get('/api/billing/status', (_req: Request, res: Response) => {
    const { stripeConfigured, mercadoPagoConfigured } = getBillingGatewayConfig();
    res.json({
      stripeConfigured,
      mercadoPagoConfigured,
      configured: stripeConfigured || mercadoPagoConfigured,
      supportedCurrencies: Object.keys(SERVER_PLAN_CATALOG.plus.prices),
    });
  });

  app.post('/api/billing/checkout-session', async (req: Request, res: Response) => {
    const { planId, currency, billingCycle, paymentMethod, payerEmail } = req.body as {
      planId?: string;
      currency?: string;
      billingCycle?: string;
      paymentMethod?: string;
      payerEmail?: string;
    };

    if (planId !== 'plus' && planId !== 'fleet') {
      res.status(400).json({ error: 'Invalid planId. Must be plus or fleet.' });
      return;
    }

    const plan = SERVER_PLAN_CATALOG[planId];
    const curr = typeof currency === 'string' ? currency.toUpperCase() : 'BRL';
    const priceSpec = plan.prices[curr];
    if (!priceSpec) {
      res.status(400).json({ error: 'Unsupported currency code.' });
      return;
    }

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const method =
      paymentMethod === 'pix' ||
      paymentMethod === 'sepa_debit' ||
      paymentMethod === 'apple_google_pay'
        ? paymentMethod
        : 'card';

    if (method === 'pix' && curr !== 'BRL') {
      res.status(400).json({ error: 'O pagamento via Pix está disponível apenas em Real (BRL).' });
      return;
    }
    if (method === 'sepa_debit' && curr !== 'EUR') {
      res.status(400).json({ error: 'SEPA Direct Debit is only supported for EUR transactions.' });
      return;
    }

    const unitAmount = cycle === 'annual' ? priceSpec.annualMinor : priceSpec.monthlyMinor;
    const displayAmount = priceSpec.zeroDecimal ? unitAmount : unitAmount / 100;
    const formattedAmount = `${priceSpec.symbol} ${displayAmount.toFixed(
      priceSpec.zeroDecimal ? 0 : 2
    )}`;
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
            'X-Idempotency-Key': `autolife-${planId}-${cycle}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          },
          body: JSON.stringify({
            transaction_amount: amountBrl,
            description: `${plan.name} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`,
            payment_method_id: 'pix',
            payer: {
              email: cleanEmail,
            },
            external_reference: JSON.stringify({ planId, cycle, curr: 'BRL' }),
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

      // 2. Stripe Checkout (Card, Apple/Google Pay, SEPA, or Stripe Pix)
      if (stripeConfigured) {
        const params = new URLSearchParams();
        const isOneTimePix = method === 'pix';
        params.set('mode', isOneTimePix ? 'payment' : 'subscription');
        params.set(
          'success_url',
          `${baseUrl}/?checkout=success&plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`
        );
        params.set('cancel_url', `${baseUrl}/?checkout=cancelled`);
        if (cleanEmail !== 'pagamento@autolife.world') {
          params.set('customer_email', cleanEmail);
        }

        if (method === 'pix') {
          params.append('payment_method_types[]', 'pix');
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
          `${plan.name} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`
        );
        if (!isOneTimePix) {
          params.set(
            'line_items[0][price_data][recurring][interval]',
            cycle === 'annual' ? 'year' : 'month'
          );
        }
        params.set('metadata[planId]', planId);
        params.set('metadata[currency]', curr);
        params.set('metadata[billingCycle]', cycle);

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
          res.status(502).json({
            error: stripeJson.error?.message || 'Falha ao criar sessão de pagamento no Stripe.',
          });
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
        const mpPriceSpec = plan.prices[mpCurr];
        const mpUnitMinor = cycle === 'annual' ? mpPriceSpec.annualMinor : mpPriceSpec.monthlyMinor;
        const mpUnitPrice = Number((mpUnitMinor / 100).toFixed(2));

        const prefResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                title: `${plan.name} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`,
                quantity: 1,
                currency_id: mpCurr,
                unit_price: mpUnitPrice,
              },
            ],
            payer: {
              email: cleanEmail,
            },
            external_reference: JSON.stringify({ planId, cycle, curr: mpCurr }),
            back_urls: {
              success: `${baseUrl}/?checkout=mp_success&plan=${encodeURIComponent(planId)}`,
              failure: `${baseUrl}/?checkout=cancelled`,
              pending: `${baseUrl}/?checkout=mp_pending&plan=${encodeURIComponent(planId)}`,
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
        metadata?: { planId?: string };
      };
      if (!stripeResp.ok) {
        res.status(502).json({ error: 'Unable to verify checkout session.' });
        return;
      }
      const planId =
        data.metadata?.planId === 'plus' || data.metadata?.planId === 'fleet'
          ? data.metadata.planId
          : null;
      res.json({
        verified: data.payment_status === 'paid',
        planId,
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
        external_reference?: string;
      };
      if (!mpResp.ok) {
        res.status(502).json({ error: 'Não foi possível consultar o status do pagamento Pix.' });
        return;
      }

      let planId: 'plus' | 'fleet' | null = null;
      if (data.external_reference) {
        try {
          const parsedRef = JSON.parse(data.external_reference) as { planId?: string };
          if (parsedRef.planId === 'plus' || parsedRef.planId === 'fleet') {
            planId = parsedRef.planId;
          }
        } catch {
          // Ignore malformed external_reference
        }
      }

      res.json({
        verified: data.status === 'approved',
        status: data.status || 'pending',
        planId,
      });
    } catch {
      res.status(500).json({ error: 'Erro ao verificar pagamento Mercado Pago.' });
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
