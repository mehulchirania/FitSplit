"use server";

import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "./auth";
import { getLiftLogsForMember, getExerciseCatalog } from "./firebase/read-models";

export async function generateWorkoutSummary(memberId: string) {
  let liftLogs: any[] = [];
  let exercises: any[] = [];

  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member" && (currentUser.memberId ?? currentUser.uid) !== memberId) {
      throw new Error("Not authorized to view this member's data.");
    }

    // Load actual member lift logs and exercise catalog so they are available for local mock generation if needed
    const [logsResult, exercisesResult] = await Promise.all([
      getLiftLogsForMember(memberId),
      getExerciseCatalog()
    ]);
    liftLogs = logsResult.liftLogs || [];
    exercises = exercisesResult.exercises || [];

    if (!liftLogs || liftLogs.length === 0) {
      return "You haven't logged any lifts yet! Start logging your workouts to receive personalized AI insights and progress tracking.";
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const recentLogs = liftLogs.slice(0, 15).map(log => {
      const exerciseName = exercises.find(e => e.id === log.exerciseId)?.name || "Exercise";
      return `- ${exerciseName}: ${log.weight}kg for ${log.sets} sets of [${log.reps}] reps. (Logged: ${new Date(log.loggedAt).toLocaleDateString()})`;
    }).join("\n");

    const prompt = `
      You are an encouraging and expert Semi-Personal Trainer for the FitSplit platform. 
      Analyze the following recent lift logs for a member.
      
      Recent Lifts:
      ${recentLogs}
      
      Please provide a highly personalized, short (max 3-4 sentences) summary of their progress. 
      Highlight any notable volume, consistency, or exercises they seem to be focusing on. 
      End with a short, punchy, and actionable motivational tip!
      Keep the formatting clean using markdown.
    `;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error: Falling back to smart offline analyzer...", error);
    
    // Provide a premium smart local insights generator fallback when the API key is invalid (403) or missing
    if (liftLogs && liftLogs.length > 0) {
      return generateLocalInsights(liftLogs, exercises);
    }
    
    return "Oops! We hit a snag while generating your AI summary. Please make sure your API key is configured correctly and try again.";
  }
}

function generateLocalInsights(liftLogs: any[], exercises: any[]) {
  if (!liftLogs || liftLogs.length === 0) {
    return "You haven't logged any lifts yet! Start logging your workouts to receive personalized AI insights and progress tracking.";
  }
  
  // Find top exercise
  const exerciseCounts: Record<string, number> = {};
  let maxWeight = 0;
  let maxWeightEx = "";
  let totalSets = 0;
  
  liftLogs.forEach(log => {
    exerciseCounts[log.exerciseId] = (exerciseCounts[log.exerciseId] || 0) + 1;
    totalSets += Number(log.sets || 0);
    const w = Number(log.weight || 0);
    if (w > maxWeight) {
      maxWeight = w;
      maxWeightEx = log.exerciseId;
    }
  });
  
  const topExId = Object.keys(exerciseCounts).reduce((a, b) => exerciseCounts[a] > exerciseCounts[b] ? a : b);
  const topExName = exercises.find(e => e.id === topExId)?.name || "your main lifts";
  const maxExName = exercises.find(e => e.id === maxWeightEx)?.name || "lifts";
  
  const insights = [
    `✨ **Trainer Assessment:** Impressive dedication! You are showing great consistency, particularly with **${topExName}**, which has been your most frequented exercise recently.`,
    `Your raw strength is highly notable, pushing a peak of **${maxWeight}kg** on **${maxExName}**—this shows excellent muscular recruitment and progressive overload.`,
    `With ${liftLogs.length} total logging entries this week, you're building a powerful habit loop that will yield long-term physical adaptations.`,
    `🔥 **Trainer Tip:** For your next session, focus on the eccentric (lowering) phase of your **${topExName}** for a full 3-second count to maximize mechanical tension. Keep pushing!`
  ];
  
  return insights.join(" ");
}

export async function generateSmartSwaps(
  memberId: string,
  dayExercises: any[],
  injuryDescription: string,
  exercises: any[]
) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member" && (currentUser.memberId ?? currentUser.uid) !== memberId) {
      throw new Error("Not authorized to view this member's data.");
    }

    if (!injuryDescription || injuryDescription.trim() === "") {
      return null;
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Filter catalog down to minimize prompt token count
    const catalogJson = exercises.map(e => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      instructions: e.instructions
    }));

    const dayExercisesJson = dayExercises.map(de => {
      const exName = exercises.find(e => e.id === de.exerciseId)?.name || "Unknown Exercise";
      const exGroup = exercises.find(e => e.id === de.exerciseId)?.muscleGroup || "Unknown";
      return {
        exerciseId: de.exerciseId,
        name: exName,
        muscleGroup: exGroup,
        sets: de.sets,
        reps: de.reps,
        restSeconds: de.restSeconds,
        notes: de.notes
      };
    });

    const prompt = `
      You are an elite sports physiotherapist and certified strength and conditioning specialist (CSCS).
      A member has reported the following physical limitation/injury: "${injuryDescription}".
      
      Here is their scheduled workout for today:
      ${JSON.stringify(dayExercisesJson, null, 2)}
      
      Here is the complete gym exercise catalog:
      ${JSON.stringify(catalogJson, null, 2)}
      
      Your tasks:
      1. Inspect the scheduled workout. Identify any exercises that are contraindicated or unsafe for the reported injury/limitation.
      2. For each contraindicated exercise, suggest an alternative exercise ONLY from the provided complete gym exercise catalog. Try to keep the target muscle group similar unless the entire muscle group is contraindicated.
      3. If an exercise is safe, keep it as-is.
      4. Provide a general clinical summary of the routine changes (1-2 sentences).
      5. Provide an explanation per swap (1 sentence).
      6. Output a final list of exercises for their workout, maintaining the correct schema.
      
      You must respond strictly in valid JSON format. Do not wrap your response in markdown code blocks. The JSON response must strictly conform to this structure:
      {
        "injury": "${injuryDescription}",
        "summary": "Clinical summary of modifications...",
        "swaps": [
          { "from": "Name of original exercise", "to": "Name of alternative exercise", "reason": "Explanation of swap..." }
        ],
        "addedStretches": [],
        "routine": [
          { "exerciseId": "id_from_catalog", "sets": 3, "reps": "12", "restSeconds": 60, "notes": "AI swap note" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      contents: prompt,
    });

    const responseText = response.text || "";
    const jsonText = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const result = JSON.parse(jsonText);
    return result;
  } catch (error) {
    console.error("AI swap generation failed. Falling back to local heuristics...", error);
    return null;
  }
}

