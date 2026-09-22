export interface MarketQuote {
  symbol: string;
  name?: string;
  type: 'crypto' | 'stock';
  priceUsd: number;
  priceInr?: number;
  change24hPercent: number;
  high24h?: number;
  low24h?: number;
  lastUpdated: string;
  source: string;
  error?: string;
}

export class MarketsService {
  // Free CoinGecko crypto lookup (No API key needed)
  public async getCryptoQuote(idOrSymbol: string): Promise<MarketQuote | null> {
    const symbolMap: Record<string, string> = {
      btc: "bitcoin",
      bitcoin: "bitcoin",
      eth: "ethereum",
      ethereum: "ethereum",
      sol: "solana",
      solana: "solana",
      doge: "dogecoin",
      dogecoin: "dogecoin",
      xrp: "ripple",
      ripple: "ripple",
      ada: "cardano",
      cardano: "cardano",
      bnb: "binancecoin",
    };

    const queryId = symbolMap[idOrSymbol.toLowerCase()] || idOrSymbol.toLowerCase();

    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${queryId}&vs_currencies=usd,inr&include_24hr_change=true&include_24hr_vol=false`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) {
        throw new Error(`CoinGecko HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data[queryId]) {
        return null;
      }

      const coinData = data[queryId];
      return {
        symbol: idOrSymbol.toUpperCase(),
        name: queryId.charAt(0).toUpperCase() + queryId.slice(1),
        type: "crypto",
        priceUsd: coinData.usd || 0,
        priceInr: coinData.inr || (coinData.usd ? coinData.usd * 86.5 : 0),
        change24hPercent: Number((coinData.usd_24h_change || 0).toFixed(2)),
        lastUpdated: new Date().toISOString(),
        source: "CoinGecko (Public Free API)",
      };
    } catch (err: any) {
      console.warn(`[MarketsService] CoinGecko error for ${idOrSymbol}:`, err.message);
      return null;
    }
  }

  // Stock lookup using Finnhub free tier or public endpoint
  public async getStockQuote(symbol: string): Promise<MarketQuote | null> {
    const cleanSym = symbol.toUpperCase().trim();
    const finnhubKey = process.env.FINNHUB_API_KEY;

    if (finnhubKey) {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(cleanSym)}&token=${finnhubKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // c = current price, d = change, dp = percent change, h = high, l = low
          if (data && typeof data.c === "number" && data.c > 0) {
            return {
              symbol: cleanSym,
              type: "stock",
              priceUsd: data.c,
              priceInr: Number((data.c * 86.5).toFixed(2)),
              change24hPercent: Number((data.dp || 0).toFixed(2)),
              high24h: data.h,
              low24h: data.l,
              lastUpdated: new Date().toISOString(),
              source: "Finnhub Stock API",
            };
          }
        }
      } catch (err: any) {
        console.warn(`[MarketsService] Finnhub error for ${cleanSym}:`, err.message);
      }
    }

    // Try Yahoo Finance public query as fallback if Finnhub key is not yet added
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === "number") {
          const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
          const changePercent = prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0;

          return {
            symbol: cleanSym,
            name: meta.shortName || cleanSym,
            type: "stock",
            priceUsd: meta.regularMarketPrice,
            priceInr: Number((meta.regularMarketPrice * 86.5).toFixed(2)),
            change24hPercent: Number(changePercent.toFixed(2)),
            lastUpdated: new Date().toISOString(),
            source: "Yahoo Finance Market Data",
          };
        }
      }
    } catch (yErr: any) {
      console.warn(`[MarketsService] Yahoo Finance fallback error for ${cleanSym}:`, yErr.message);
    }

    return null;
  }

  public async getMarketPrice(symbolOrQuery: string): Promise<MarketQuote> {
    const raw = symbolOrQuery.trim();

    // Check if crypto first
    const cryptoQuote = await this.getCryptoQuote(raw);
    if (cryptoQuote) {
      return cryptoQuote;
    }

    // Check stock
    const stockQuote = await this.getStockQuote(raw);
    if (stockQuote) {
      return stockQuote;
    }

    // Return not found
    return {
      symbol: raw.toUpperCase(),
      type: "stock",
      priceUsd: 0,
      change24hPercent: 0,
      lastUpdated: new Date().toISOString(),
      source: "Markets Service",
      error: `Could not retrieve live price for symbol "${raw}". For stocks, verify FINNHUB_API_KEY in .env.`,
    };
  }

  public async getWatchlist(symbols: string[]): Promise<MarketQuote[]> {
    const results = await Promise.all(
      symbols.map((sym) => this.getMarketPrice(sym))
    );
    return results;
  }
}

export const marketsService = new MarketsService();
