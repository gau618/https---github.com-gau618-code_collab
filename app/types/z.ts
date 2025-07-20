import { z } from 'zod';

// Define the schema for a single coding question
const codingQuestionSchema = z.object({
  title: z.string().describe("A short, descriptive title for the problem (e.g., 'Two Sum')."),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe("The difficulty level of the problem."),
  description: z.string().describe("A clear, detailed description of the problem statement."),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
  })).describe("At least one input/output example to clarify the requirements."),
  constraints: z.array(z.string()).optional().describe("A list of constraints or edge cases (e.g., 'Array length is between 2 and 1000')."),
  starterCode: z.string().describe("Boilerplate code for the candidate to start with in JavaScript."),
});

// We expect an array of these questions
const questionsArraySchema = z.array(codingQuestionSchema);
