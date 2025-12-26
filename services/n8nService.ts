
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
  if (!webhookUrl) return { success: false, message: 'URL is empty' };
  
  // Basic URL validation
  let urlObj: URL;
  try {
    urlObj = new URL(webhookUrl);
  } catch (e) {
    return { success: false, message: 'Invalid URL format' };
  }

  // Check for Mixed Content (Browser security blocks HTTP calls from HTTPS sites)
  const isHttpsSource = window.location.protocol === 'https:';
  const isHttpTarget = urlObj.protocol === 'http:';
  if (isHttpsSource && isHttpTarget) {
    return { 
      success: false, 
      message: 'Security Block: Cannot call HTTP backend from HTTPS frontend.',
      isMixedContent: true 
    };
  }

  const pingPayload = { action: 'ping', timestamp: new Date().toISOString() };

  try {
    // Attempt 1: Standard CORS fetch (Best case)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(pingPayload),
    });

    if (response.ok || response.status < 500) {
      return { success: true, message: 'Connection established' };
    }
    return { success: false, message: `Server returned status ${response.status}` };
  } catch (error) {
    // Attempt 2: "Opaque" Probe (Check if server even exists)
    // This allows us to see if the server is alive but just blocking CORS
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // Opaque request
        body: JSON.stringify(pingPayload),
      });
      
      // If no-cors fetch doesn't throw, the server is REACHABLE but blocking the browser
      return { 
        success: false, 
        message: 'CORS Blocked: Server is alive but your backend must allow this origin.',
        isCorsError: true 
      };
    } catch (probeError) {
      console.error('Handshake failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      return { 
        success: false, 
        message: msg === 'Failed to fetch' ? 'Server Unreachable: Check URL or Server Status.' : msg 
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
    throw new Error('Webhook URL not configured.');
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
      throw new Error(`Agent request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as StrategyResult;
  } catch (error) {
    console.error('Error testing strategy:', error);
    throw error;
  }
};
