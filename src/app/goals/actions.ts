
'use server';

import { createGoalFromText, type CreateGoalFromTextInput } from "@/ai/flows/create-goal-from-text-flow";
import { z } from "zod";

const getGoalDetailsSchema = z.object({
  text: z.string().min(10, 'Please describe your goal in a bit more detail.'),
});

/**
 * A simple server action that ONLY calls the AI flow to get structured data.
 * It does NOT perform any database operations.
 */
export async function getGoalDetailsFromAiAction(
  input: z.infer<typeof getGoalDetailsSchema>
): Promise<{ goalName?: string; targetAmount?: number; error?: string; }> {
  
  const validatedFields = getGoalDetailsSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  try {
    const aiInput: CreateGoalFromTextInput = { text: validatedFields.data.text };
    const goalDetails = await createGoalFromText(aiInput);
    return { goalName: goalDetails.name, targetAmount: goalDetails.targetAmount };

  } catch (error) {
    console.error("Error in getGoalDetailsFromAiAction:", error);
    return { error: "The AI failed to process your request. Please try again." };
  }
}
