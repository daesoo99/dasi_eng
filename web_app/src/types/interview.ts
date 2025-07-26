export interface InterviewConfig {
  position: string;
  experience: string;
  duration: number;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  timestamp: number;
}

export interface InterviewAnswer {
  questionId: string;
  text: string;
  audioUrl?: string;
  timestamp: number;
}

export interface InterviewEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface InterviewSession {
  id: string;
  config: InterviewConfig;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  evaluations: InterviewEvaluation[];
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'paused';
}