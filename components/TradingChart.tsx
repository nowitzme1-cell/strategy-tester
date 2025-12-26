import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

interface TradingChartProps {
  symbol?: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ symbol = 'BTCUSDT' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      crosshair: {
        vertLine: {
          color: '#3b82f6',
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f6',
          labelBackgroundColor: '#3b82f6',
        },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;

    // Fetch data from Binance Public API
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=100`)
      .then(res => res.json())
      .then(data => {
        const cdata = data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));
        candlestickSeries.setData(cdata);
        chart.timeScale().fitContent();
      })
      .catch(err => console.error('Failed to fetch historical data', err));

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol]);

  return (
    <div className="relative w-full bg-slate-950/20 border border-slate-900 rounded-3xl overflow-hidden p-1 shadow-inner">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-black text-blue-500 uppercase tracking-widest">
          {symbol}
        </div>
        <div className="text-[10px] font-bold text-slate-600 uppercase">Live Market Data</div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};

export default TradingChart;