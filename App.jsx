import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Link2, Pause, Play, QrCode, RefreshCw, RotateCcw, Sparkles, Timer, WalletCards } from 'lucide-react';

const STORAGE = 'tiny-tools-dashboard';

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return <button className="btn" disabled={!value} onClick={copy}>{copied ? <Check size={18}/> : <Copy size={18}/>} {copied ? 'Copied' : 'Copy'}</button>;
}

function ShortLinkTool() {
  const [url, setUrl] = useStoredState(`${STORAGE}:url`, '');
  const shortUrl = useMemo(() => {
    if (!url.trim()) return '';
    const clean = url.trim();
    const code = btoa(unescape(encodeURIComponent(clean))).replace(/[+/=]/g, '').slice(0, 8).toLowerCase();
    return `https://tt.ly/${code || 'link'}`;
  }, [url]);
  return <div>
    <label>Long URL</label>
    <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste your long link here..." />
    <div className="output">
      <p className="kicker">Generated short link</p>
      <p className="result">{shortUrl || 'Your short link will appear here'}</p>
      <div className="actions"><CopyButton value={shortUrl} /></div>
    </div>
    <p className="note">MVP note: this creates a local demo short link. To make real public short links, connect a backend or URL shortener API later.</p>
  </div>;
}

function PomodoroTool() {
  const WORK = 25 * 60;
  const BREAK = 5 * 60;
  const [seconds, setSeconds] = useStoredState(`${STORAGE}:seconds`, WORK);
  const [mode, setMode] = useStoredState(`${STORAGE}:mode`, 'focus');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds(prev => {
        if (prev > 1) return prev - 1;
        const next = mode === 'focus' ? 'break' : 'focus';
        setMode(next);
        return next === 'focus' ? WORK : BREAK;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode]);

  const total = mode === 'focus' ? WORK : BREAK;
  const progress = 1 - seconds / total;
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  function reset() { setRunning(false); setMode('focus'); setSeconds(WORK); }

  return <div className="timer-wrap">
    <div className="timer-circle" style={{ background: `conic-gradient(#7c4a25 ${progress * 360}deg, #f5dfc1 0deg)` }}>
      <div className="timer-inner"><div><div className="mode">{mode}</div><div className="time">{minutes}:{secs}</div></div></div>
    </div>
    <div className="actions" style={{ justifyContent: 'center' }}>
      <button className="btn earth" onClick={() => setRunning(!running)}>{running ? <Pause size={18}/> : <Play size={18}/>} {running ? 'Pause' : 'Start'}</button>
      <button className="btn secondary" onClick={reset}><RotateCcw size={18}/> Reset</button>
    </div>
    <p className="note">25 minutes focus + 5 minutes rest. Simple, quiet, and built for getting things done.</p>
  </div>;
}

function QRTool() {
  const [text, setText] = useStoredState(`${STORAGE}:qr`, '');
  const [qrUrl, setQrUrl] = useState('');
  useEffect(() => {
    if (!text.trim()) { setQrUrl(''); return; }
    QRCode.toDataURL(text, { width: 720, margin: 2, color: { dark: '#1c1917', light: '#fffaf0' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [text]);
  function download() {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'qr-code.png';
    a.click();
  }
  return <div className="qr-grid">
    <div>
      <label>Text or URL</label>
      <textarea rows="7" value={text} onChange={e => setText(e.target.value)} placeholder="Type text or paste a URL..." />
      <div className="actions"><button className="btn" disabled={!qrUrl} onClick={download}><Download size={18}/> Download PNG</button></div>
      <p className="note">This version generates a real scannable QR code and lets you download it as an image.</p>
    </div>
    <div className="qr-box">{qrUrl ? <img src={qrUrl} alt="Generated QR code" /> : <p className="note">QR preview will appear here.</p>}</div>
  </div>;
}

const currencies = [
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
];

function CurrencyTool() {
  const [amount, setAmount] = useStoredState(`${STORAGE}:currency-amount`, '100');
  const [from, setFrom] = useStoredState(`${STORAGE}:currency-from`, 'GBP');
  const [to, setTo] = useStoredState(`${STORAGE}:currency-to`, 'HKD');
  const [rate, setRate] = useState(null);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const numericAmount = Number(amount);
  const converted = rate && Number.isFinite(numericAmount) ? numericAmount * rate : null;
  const fromCurrency = currencies.find(c => c.code === from) || currencies[0];
  const toCurrency = currencies.find(c => c.code === to) || currencies[1];

  async function fetchRate() {
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (from === to) {
      setRate(1);
      setDate(new Date().toISOString().slice(0, 10));
      setStatus('done');
      setError('');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (!response.ok) throw new Error('Rate request failed');
      const data = await response.json();
      const nextRate = data?.rates?.[to];
      if (!nextRate) throw new Error('Currency pair unavailable');
      setRate(nextRate);
      setDate(data?.date || new Date().toISOString().slice(0, 10));
      setStatus('done');
    } catch {
      setError('Could not fetch live rate. Please try again later.');
      setStatus('error');
    }
  }

  useEffect(() => {
    fetchRate();
  }, [from, to]);

  function swapCurrencies() {
    setFrom(to);
    setTo(from);
  }

  const formattedConverted = converted === null ? '—' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(converted);
  const formattedRate = rate ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6 }).format(rate) : '—';

  return <div className="currency-tool">
    <div className="currency-grid">
      <div>
        <label>Amount</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="100" />
      </div>
      <div>
        <label>From</label>
        <select value={from} onChange={e => setFrom(e.target.value)}>
          {currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}
        </select>
      </div>
      <div className="swap-cell">
        <button className="btn secondary swap-btn" onClick={swapCurrencies} title="Swap currencies"><RefreshCw size={18}/> Swap</button>
      </div>
      <div>
        <label>To</label>
        <select value={to} onChange={e => setTo(e.target.value)}>
          {currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}
        </select>
      </div>
    </div>

    <div className="output currency-output">
      <p className="kicker">Converted amount</p>
      <p className="result currency-result">{toCurrency.symbol}{formattedConverted}</p>
      <p className="note">{amount || 0} {fromCurrency.code} = {formattedConverted} {toCurrency.code}</p>
      <p className="note">Rate: 1 {fromCurrency.code} = {formattedRate} {toCurrency.code}{date ? ` · Updated ${date}` : ''}</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="actions">
        <button className="btn earth" onClick={fetchRate} disabled={status === 'loading'}><RefreshCw size={18}/> {status === 'loading' ? 'Updating...' : 'Update rate'}</button>
        <CopyButton value={converted === null ? '' : `${amount} ${from} = ${formattedConverted} ${to}`} />
      </div>
    </div>
    <p className="note">Uses live exchange rates from a free public rate API. Good for quick estimates; check your bank or broker before making a transaction.</p>
  </div>;
}

const tools = [
  { id: 'short', title: 'Short Link', description: 'Paste a long URL and generate a copyable short link.', icon: Link2, component: <ShortLinkTool /> },
  { id: 'timer', title: 'Pomodoro Timer', description: '25 minutes focus, 5 minutes rest, with start, pause and reset.', icon: Timer, component: <PomodoroTool /> },
  { id: 'qr', title: 'QR Code Generator', description: 'Enter text or a URL and download a scannable QR code.', icon: QrCode, component: <QRTool /> },
  { id: 'currency', title: 'Currency Converter', description: 'Convert major currencies with live exchange rates.', icon: WalletCards, component: <CurrencyTool /> },
];

export default function App() {
  const [active, setActive] = useStoredState(`${STORAGE}:active`, 'short');
  const selected = tools.find(t => t.id === active) || tools[0];
  const SelectedIcon = selected.icon;
  return <main className="app">
    <div className="container">
      <section className="hero">
        <div className="badge"><Sparkles size={18}/> Personal Tools Dashboard</div>
        <h1>All your daily tiny tools in one calm place.</h1>
        <p>Start with useful tools: short links, Pomodoro focus timer, QR code generator and currency converter. Built as a simple MVP and ready to grow.</p>
      </section>
      <section className="layout">
        <aside className="sidebar">
          {tools.map(tool => {
            const Icon = tool.icon;
            return <button key={tool.id} className={`tool-card ${selected.id === tool.id ? 'active' : ''}`} onClick={() => setActive(tool.id)}>
              <div className="tool-row"><div className="icon-box"><Icon size={24}/></div><div><h3>{tool.title}</h3><p>{tool.description}</p></div></div>
            </button>;
          })}
        </aside>
        <section className="panel">
          <div className="panel-head"><div className="icon-box"><SelectedIcon size={26}/></div><div><h2>{selected.title}</h2><p>{selected.description}</p></div></div>
          {selected.component}
        </section>
      </section>
      <p className="footer">Tiny Tools Dashboard · MVP v2 · Installable PWA-ready website</p>
    </div>
  </main>;
}
