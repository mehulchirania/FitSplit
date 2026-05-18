"use server";

import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "./auth";
import { getLiftLogsForMember, getExerciseCatalog } from "./firebase/read-models";

export async function generateWorkoutSummary(memberId: string) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role === "member" && (currentUser.memberId ?? currentUser.uid) !== memberId) {
      throw new Error("Not authorized to view this member's data.");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const [{ liftLogs }, { exercises }] = await Promise.all([
      getLiftLogsForMember(memberId),
      getExerciseCatalog()
    ]);
    
    if (!liftLogs || liftLogs.length === 0) {
      return "You haven't logged any lifts yet! Start logging your workouts to receive personalized AI insights and progress tracking.";
    }

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
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Oops! We hit a snag while generating your AI summary. Please make sure your API key is configured correctly and try again.";
  }
}
