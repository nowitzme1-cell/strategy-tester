
import { StrategyResult } from '../types';

/**
 * Sends a ping request to verify the webhook is reachable and accepting requests.
 * Uses a dual-stage probe to distinguish between CORS blocks and actual network failures.
 */
export const verifyWebhook = async (webhookUrl: string): Promise<{ 
  success: boolean; 
  message: string; 
  isCorsError?: boolean;
  isMixedContent?: boolean;
}> => {
  if (!webhookUrl || webhookUrl.trim() === '') {
    return { success: false, message: 'Endpoint URL is missing' };
  }
  
  // Basic URL validation
  let urlObj: URL;
  try {
    urlObj = new URL(webhookUrl);
  } catch (e) {
    return { success: false, message: 'The URL format is invalid.' };
  }

  // Check for Mixed Content (Browser security blocks HTTP calls from HTTPS sites like Vercel)
  const isHttpsSource = window.location.protocol === 'https:';
  const isHttpTarget = urlObj.protocol === 'http:';
  if (isHttpsSource && isHttpTarget) {
    return { 
      success: false, 
      message: 'Mixed Content Error: Vercel (HTTPS) cannot talk to HTTP. Use HTTPS or a tunnel.',
      isMixedContent: true 
    };
  }

  const pingPayload = { action: 'ping', timestamp: new Date().toISOString(), origin: window.location.origin };

  try {
    // Attempt 1: Standard CORS fetch
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(pingPayload),
    });

    if (response.ok || response.status < 500) {
      return { success: true, message: 'Terminal Handshake Successful' };
    }
    return { success: false, message: `Server Error: ${response.status}` };
  } catch (error) {
    // Attempt 2: "Opaque" Probe
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(pingPayload),
      });
      
      return { 
        success: false, 
        message: 'CORS Block: Server is active but blocking Vercel. Check n8n CORS settings.',
        isCorsError: true 
      };
    } catch (probeError) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[QuantLeap] Webhook Reachability Error:', msg);
      return { 
        success: false, 
        message: msg === 'Failed to fetch' ? 'Endpoint Unreachable: Check if your backend is online.' : msg 
      };
    }
  }
};

export const testStrategy = async (
  webhookUrl: string,
  userId: string,
  strategyInput: string,
  strategyName?: string,
  backtestParams?: {
    startDate: string;
    endDate: string;
    initialCapital: number;
    riskPerTrade: number;
  }
): Promise<StrategyResult> => {
  if (!webhookUrl) {
    throw new Error('No backend terminal linked.');
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        strategyName: strategyName || 'Untitled Strategy',
        strategyInput,
        backtestParams,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Agent returned error: ${errorText || response.status}`);
    }

    const data = await response.json();
    return data as StrategyResult;
  } catch (error) {
    console.error('[QuantLeap] Strategy Submission Error:', error);
    throw error;
  }
};
