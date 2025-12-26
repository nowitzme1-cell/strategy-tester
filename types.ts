
export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface TradingStats {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface StrategyResult {
  text?: string;
  reasoning?: string;
  stats?: TradingStats;
  timestamp: string;
  [key: string]: any; 
}

export interface HistoryItem {
  id: string;
  name?: string;
  input: string;
  result: StrategyResult;
  timestamp: string;
}

export interface AppState {
  user: UserProfile | null;
  webhookUrl: string;
  history: HistoryItem[];
}
