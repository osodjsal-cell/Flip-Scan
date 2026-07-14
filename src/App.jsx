import React, { useState, useRef, useCallback } from 'react'

const PLATFORMS = [
  { id: 'ebay', label: 'eBay', icon: '🛒', url: 'https://www.ebay.com/sell' },
  { id: 'mercari', label: 'Mercari', icon: '📦', url: 'https://www.mercari.com/sell' },
  { id: 'facebook', label: 'Facebook', icon: '📘', url: 'https://www.facebook.com/marketplace/create/item' },
  { id: 'etsy', label: 'Etsy', icon: '🛍️', url: 'https://www.etsy.com/sell' },
  { id: 'reverb', label: 'Reverb', icon: '🎸', url: 'https://reverb.com/sell' },
  { id: 'offerup', label: 'OfferUp', icon: '💬', url: 'https://offerup.com/sell' },
  { id: 'craigslist', label: 'Craigslist', icon: '📋', url: 'https://post.craigslist.org' },
  { id: 'depop', label: 'Depop', icon: '👗', url: 'https://www.depop.com/sell' },
]

const CONDITIONS = ['Like New', 'Good', 'Fair', 'For Parts']

const GOALS = {
  speed: { icon: '⚡', label: 'Fastest Sale', desc: 'Gone in 24–48 hrs' },
  price: { icon: '💰', label: 'Best Price', desc: 'Maximize your return' },
  local: { icon: '📍', label: 'Local Cash', desc: 'No shipping hassle' },
}

export default function FlipScan() {
  const [screen, setScreen] = useState('home')
  const [mode, setMode] = useState('standard')
  const [goal, setGoal] = useState(null)
  const [condition, setCondition] = useState('Good')
  const [platforms, setPlatforms] = useState([])
  const [imageData, setImageData] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [tab, setTab] = useState('quick')
  const [copied, setCopied] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const camRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageData({ base64: e.target.result.split(',')[1], mediaType: file.type })
      setPreview(e.target.result)
      setScreen('ready')
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const analyze = async () => {
    if (!imageData) return
    setScreen('analyzing')
    setError(null)

    const isGaryV = mode === 'garyv'
    const goalCtx = goal ? `SELLING GOAL: ${GOALS[goal].label} — optimize everything for this.` : ''

    const systemPrompt = isGaryV
      ? `You are FlipScan with Gary V Mode ON. Identify items forensically and write listings that sound like a real confident authentic human seller — raw energy, direct talk, zero corporate fluff. Short punchy sentences. Respond ONLY with valid JSON — no markdown no backticks.`
      : `You are FlipScan, the world's most accurate AI resale assistant. Forensically identify items from photos, provide real market pricing, and generate platform-optimized listings. Respond ONLY with valid JSON — no markdown no backticks.`

    const prompt = `Analyze this item for resale. Condition: ${condition}. ${goalCtx} Gary V Mode: ${isGaryV}.

Return ONLY this exact JSON — no markdown, no backticks, no extra text:
{
  "itemName": "precise item name",
  "brand": "brand or null",
  "category": "category",
  "description": "2-3 sentence honest resale description",
  "imperfections": ["flaw 1"],
  "priceLow": 0,
  "suggestedPrice": 0,
  "priceHigh": 0,
  "quickSellPrice": 0,
  "pricingRationale": "one sentence",
  "marketSignal": "GREEN",
  "marketSignalReason": "one sentence on demand and saturation",
  "estimatedSellDays": 7,
  "quickSellPlatform": "ebay",
  "quickSellListing": "ready to post listing",
  "platformRankings": [
    {"platformId":"ebay","rank":1,"reason":"why this platform","estimatedDaysToSell":3,"demandLevel":"High","recentSoldNote":"comparable sold prices and when"},
    {"platformId":"mercari","rank":2,"reason":"why","estimatedDaysToSell":5,"demandLevel":"Medium","recentSoldNote":"note"},
    {"platformId":"facebook","rank":3,"reason":"why","estimatedDaysToSell":7,"demandLevel":"Medium","recentSoldNote":"note"}
  ],
  "listings": {
    "ebay": "listing",
    "mercari": "listing",
    "facebook": "listing",
    "etsy": "listing or null",
    "reverb": "listing or null",
    "offerup": "listing",
    "craigslist": "listing or null",
    "depop": "listing or null"
  },
  "searchKeywords": ["kw1","kw2","kw3","kw4"],
  "tips": ["tip1","tip2","tip3"],
  "redFlags": ["disclosure1"],
  "garyVTip": ${isGaryV ? '"One Gary V insight about selling this — real talk"' : 'null'}
}`

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageData.mediaType, data: imageData.base64 } },
              { type: 'text', text: prompt }
            ]
          }]
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'API error')
      const raw = data.content?.map(b => b.text || '').join('') || ''
      const clean = raw.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(clean)
      setResult(parsed)
      setScreen('result')
      setTab(mode === 'garyv' ? 'garyv' : 'quick')
    } catch (e) {
      setError('Analysis failed. Please check your API key and try again.')
      setScreen('ready')
    }
  }

  const copy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const reset = () => {
    setScreen('home')
    setImageData(null)
    setPreview(null)
    setResult(null)
    setMode('standard')
    setGoal(null)
    setCondition('Good')
    setPlatforms([])
    setError(null)
    setTab('quick')
  }

  const getPlatform = (id) => PLATFORMS.find(p => p.id === id)
  const signalColor = { GREEN: '#22c55e', YELLOW: '#f59e0b', RED: '#ef4444' }
  const signalEmoji = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' }
  const demandColor = (d) => ({ high: '#22c55e', medium: '#f59e0b', low: '#ef4444' })[d?.toLowerCase()] || '#666'

  const s = {
    app: { minHeight: '100vh', background: '#09090f', color: '#e8e8f8', fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 80 },
    header: { background: '#0d0d1c', borderBottom: '1px solid #1a1a30', padding: '13px 18px', position: 'sticky', top: 0, zIndex: 30 },
    hInner: { maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { display: 'flex', alignItems: 'center', gap: 10 },
    logoText: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 6 },
    logoSub: { fontSize: 10, color: '#404060', marginTop: 1 },
    vBadge: { fontSize: 10, background: '#1e1e4e', color: '#7070ff', padding: '2px 6px', borderRadius: 4, fontWeight: 600 },
    gvBadge: { fontSize: 10, background: '#3a0a00', color: '#ff7040', padding: '2px 8px', borderRadius: 4, fontWeight: 700 },
    newBtn: { padding: '6px 14px', background: '#0d0d1e', border: '1px solid #2a2a4a', borderRadius: 8, color: '#606080', fontSize: 11, cursor: 'pointer' },
    main: { maxWidth: 560, margin: '0 auto', padding: '20px 16px' },
    hero: { marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #1a1a30' },
    heroTag: { fontSize: 10, color: '#5050a0', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 },
    heroTitle: { fontSize: 36, fontWeight: 900, lineHeight: 1.15, margin: '0 0 12px', color: '#fff', letterSpacing: '-1px' },
    heroSub: { fontSize: 14, color: '#6060a0', lineHeight: 1.6 },
    sec: { marginBottom: 16 },
    lbl: { fontSize: 10, color: '#404070', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 8px', fontWeight: 700, display: 'block' },
    modeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    modeCard: (a) => ({ background: a ? '#1a1a4e' : '#0d0d1e', border: `1px solid ${a ? '#5555ff' : '#1a1a35'}`, borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'center', position: 'relative' }),
    goalRow: (a) => ({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: a ? '#1a1a4e' : '#0d0d1e', border: `1px solid ${a ? '#5555ff' : '#1a1a35'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 6, textAlign: 'left' }),
    primaryBtn: { width: '100%', padding: '15px', background: 'linear-gradient(135deg,#3333dd,#6655ff)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 10 },
    orangeBtn: { width: '100%', padding: '15px', background: 'linear-gradient(135deg,#cc3300,#ff5500)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 10 },
    backBtn: { width: '100%', padding: '11px', background: 'transparent', border: '1px solid #1a1a35', borderRadius: 10, color: '#404060', fontSize: 13, cursor: 'pointer', marginTop: 8 },
    drop: (h) => ({ border: `2px ${h ? 'solid #5555ff' : 'dashed #2a2a4a'}`, borderRadius: 16, padding: h ? 0 : '44px 20px', textAlign: 'center', cursor: 'pointer', background: '#0a0a18', marginBottom: 10, overflow: 'hidden' }),
    prevImg: { width: '100%', maxHeight: 290, objectFit: 'cover', display: 'block', borderRadius: 14 },
    camBtn: { width: '100%', padding: '11px', background: '#0a0a18', border: '1px solid #2a2a4a', borderRadius: 12, color: '#505080', fontSize: 13, cursor: 'pointer', marginBottom: 14 },
    hidden: { display: 'none' },
    chipRow: { display: 'flex', gap: 7, flexWrap: 'wrap' },
    chip: (a) => ({ padding: '6px 13px', borderRadius: 20, border: `1px solid ${a ? '#5555ff' : '#2a2a4a'}`, background: a ? '#1a1a4e' : 'transparent', color: a ? '#a0a0ff' : '#505080', fontSize: 12, cursor: 'pointer' }),
    errBox: { background: '#200a0a', border: '1px solid #4a1a1a', borderRadius: 10, padding: '10px 14px', color: '#ff6060', fontSize: 13, marginBottom: 12 },
    aWrap: { textAlign: 'center', padding: '50px 20px' },
    aImg: { width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 24, opacity: 0.4 },
    spin: { fontSize: 36, display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: 16 },
    aTitle: { color: '#7070a0', fontSize: 15, marginBottom: 6 },
    aSub: { color: '#404060', fontSize: 12 },
    rImg: { width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14, marginBottom: 14 },
    card: { background: '#0d0d1e', border: '1px solid #1a1a35', borderRadius: 14, padding: '14px 16px', marginBottom: 12 },
    eyebrow: { fontSize: 10, color: '#404070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 },
    iName: { margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#e0e0ff' },
    brand: { fontSize: 12, color: '#404060', marginBottom: 8 },
    iDesc: { margin: 0, fontSize: 13, color: '#7070a0', lineHeight: 1.55 },
    sigCard: (sig) => ({ background: '#0d0d1e', border: `1px solid ${(signalColor[sig] || '#444') + '44'}`, borderRadius: 14, padding: '12px 16px', marginBottom: 12 }),
    sigRow: { display: 'flex', alignItems: 'center', gap: 10 },
    pCard: { background: 'linear-gradient(135deg,#0d0d28,#101035)', border: '1px solid #2a2a5e', borderRadius: 14, padding: '14px 16px', marginBottom: 12 },
    pRow: { display: 'flex', gap: 8, marginBottom: 12 },
    pBox: (h) => ({ flex: 1, textAlign: 'center', background: h ? '#1a1a4e' : '#0a0a1e', borderRadius: 10, padding: '10px 6px', border: h ? '1px solid #4040aa' : 'none' }),
    pLbl: { fontSize: 10, color: '#404070', marginBottom: 3 },
    pVal: (h) => ({ fontSize: h ? 23 : 18, fontWeight: 800, color: h ? '#c0c0ff' : '#8080c0' }),
    qsRow: { background: '#091409', borderRadius: 8, padding: '10px 12px', border: '1px solid #1a3a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    qsVal: { fontSize: 24, fontWeight: 900, color: '#50c050' },
    tabRow: { display: 'flex', gap: 5, marginBottom: 12 },
    tabBtn: (a) => ({ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${a ? '#5555ff' : '#1a1a35'}`, background: a ? '#1a1a4e' : '#0d0d1e', color: a ? '#a0a0ff' : '#404070', fontSize: 10, cursor: 'pointer', fontWeight: a ? 700 : 400, textTransform: 'uppercase', letterSpacing: 0.6 }),
    qCard: { background: '#091409', border: '1px solid #1a4a1a', borderRadius: 14, padding: '14px 16px', marginBottom: 12 },
    qText: { margin: '0 0 12px', fontSize: 13, color: '#507050', lineHeight: 1.65, whiteSpace: 'pre-wrap' },
    btnRow: { display: 'flex', gap: 8 },
    copyBtn: (a) => ({ flex: 1, padding: '9px', background: '#0d2a0d', border: '1px solid #2a5a2a', borderRadius: 8, color: a ? '#70ff70' : '#50c050', fontSize: 12, cursor: 'pointer', fontWeight: 700 }),
    openBtn: { flex: 1, padding: '9px', background: '#0d1a2a', border: '1px solid #2a4a6a', borderRadius: 8, color: '#5090c0', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'block' },
    mktCard: { background: '#0d0d1e', border: '1px solid #1a1a35', borderRadius: 12, padding: '12px 14px', marginBottom: 8 },
    lstCard: { background: '#0d0d1e', border: '1px solid #1a1a35', borderRadius: 12, padding: '12px 14px', marginBottom: 8 },
    lstHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    brs: { display: 'flex', gap: 6 },
    cSmall: (a) => ({ padding: '4px 10px', background: 'transparent', border: '1px solid #3a3a6a', borderRadius: 6, color: a ? '#a0a0ff' : '#7070a0', fontSize: 10, cursor: 'pointer' }),
    oSmall: { padding: '4px 10px', background: 'transparent', border: '1px solid #2a3a5a', borderRadius: 6, color: '#406080', fontSize: 10, textDecoration: 'none', display: 'block' },
    lstText: { margin: 0, fontSize: 12, color: '#606080', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
    gvCard: { background: 'linear-gradient(135deg,#1a0800,#220e00)', border: '1px solid #5a2a00', borderRadius: 14, padding: '14px 16px', marginBottom: 12 },
    kwChip: { padding: '4px 10px', background: '#1a1a3a', border: '1px solid #2a2a5a', borderRadius: 20, fontSize: 12, color: '#6060a0' },
    tipItem: { fontSize: 13, color: '#505080', lineHeight: 1.55, marginBottom: 6 },
    resetBtn: { width: '100%', padding: '13px', background: '#0d0d1e', border: '1px solid #1a1a35', borderRadius: 12, color: '#404060', fontSize: 14, cursor: 'pointer', fontWeight: 600, marginTop: 16 },
  }

  const tabs = mode === 'garyv' ? ['garyv', 'markets', 'listings', 'tips'] : ['quick', 'markets', 'listings', 'tips']
  const tabLabel = (t) => ({ garyv: '🔥 Gary V', quick: '⚡ Quick', markets: '📊 Markets', listings: '📋 Lists', tips: '💡 Tips' })[t]

  return (
    <div style={s.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}button,a{font-family:inherit}`}</style>
      <header style={s.header}>
        <div style={s.hInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 22 }}>📸</span>
            <div>
              <div style={s.logoText}>
                FlipScan<span style={s.vBadge}>v4</span>
                {mode === 'garyv' && <span style={s.gvBadge}>🔥 GARY V</span>}
              </div>
              <div style={s.logoSub}>Photo → Market Intel → Cash</div>
            </div>
          </div>
          {screen === 'result' && <button onClick={reset} style={s.newBtn}>+ New Item</button>}
        </div>
      </header>

      <main style={s.main}>

        {screen === 'home' && (
          <div>
            <div style={s.hero}>
              <div style={s.heroTag}>AI-Powered Resale Tool</div>
              <h1 style={s.heroTitle}>Snap it.<br />Price it.<br />Sell it.</h1>
              <p style={s.heroSub}>Point your camera at anything. FlipScan identifies it, prices it with real market data, and writes listings for every platform instantly.</p>
            </div>
            <div style={s.sec}>
              <span style={s.lbl}>Choose your mode</span>
              <div style={s.modeGrid}>
                {[{ id: 'standard', icon: '📋', title: 'Standard Mode', desc: 'Full market analysis + listings' },
                  { id: 'garyv', icon: '🔥', title: 'Gary V Mode', desc: 'Raw, real listings that convert' }
                ].map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)} style={s.modeCard(mode === m.id)}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#c0c0e0', marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: '#5050a0', lineHeight: 1.4 }}>{m.desc}</div>
                    {mode === m.id && <div style={{ position: 'absolute', top: 8, right: 10, color: '#7070ff', fontWeight: 700 }}>✓</div>}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.sec}>
              <span style={s.lbl}>Selling goal <span style={{ color: '#303050', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></span>
              {Object.entries(GOALS).map(([key, g]) => (
                <button key={key} onClick={() => setGoal(goal === key ? null : key)} style={s.goalRow(goal === key)}>
                  <span style={{ fontSize: 20 }}>{g.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#c0c0e0' }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: '#5050a0' }}>{g.desc}</div>
                  </div>
                  {goal === key && <span style={{ marginLeft: 'auto', color: '#7070ff', fontWeight: 700 }}>✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setScreen('ready')} style={mode === 'garyv' ? s.orangeBtn : s.primaryBtn}>
              {mode === 'garyv' ? "🔥 Let's Get This Money" : '📸 Start Scanning'}
            </button>
          </div>
        )}

        {screen === 'ready' && (
          <div>
            <div onClick={() => fileRef.current?.click()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }} onDragOver={(e) => e.preventDefault()} style={s.drop(!!preview)}>
              {preview ? <img src={preview} alt="preview" style={s.prevImg} /> : <div><div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div><div style={{ color: '#505080', fontSize: 14 }}>Tap to choose a photo</div><div style={{ color: '#303060', fontSize: 12, marginTop: 4 }}>or drag & drop</div></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={s.hidden} onChange={e => handleFile(e.target.files[0])} />
            <button onClick={() => camRef.current?.click()} style={s.camBtn}>📷 Take Photo with Camera</button>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={s.hidden} onChange={e => handleFile(e.target.files[0])} />
            {preview && (
              <>
                <div style={s.sec}>
                  <span style={s.lbl}>Condition</span>
                  <div style={s.chipRow}>{CONDITIONS.map(c => <button key={c} onClick={() => setCondition(c)} style={s.chip(condition === c)}>{c}</button>)}</div>
                </div>
                <div style={s.sec}>
                  <span style={s.lbl}>Target platforms <span style={{ color: '#303050', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></span>
                  <div style={s.chipRow}>{PLATFORMS.map(p => <button key={p.id} onClick={() => setPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} style={s.chip(platforms.includes(p.id))}>{p.icon} {p.label}</button>)}</div>
                </div>
                {error && <div style={s.errBox}>{error}</div>}
                <button onClick={analyze} style={mode === 'garyv' ? s.orangeBtn : s.primaryBtn}>
                  {mode === 'garyv' ? '🔥 Identify & Price This Thing' : '✨ Identify & Price This Item'}
                </button>
              </>
            )}
            <button onClick={reset} style={s.backBtn}>← Back</button>
          </div>
        )}

        {screen === 'analyzing' && (
          <div style={s.aWrap}>
            {preview && <img src={preview} alt="" style={s.aImg} />}
            <div style={s.spin}>🔍</div>
            <div style={s.aTitle}>{mode === 'garyv' ? 'Reading the room...' : 'Scanning market data...'}</div>
            <div style={s.aSub}>Checking sold listings across platforms</div>
          </div>
        )}

        {screen === 'result' && result && (
          <div>
            {preview && <img src={preview} alt="Item" style={s.rImg} />}
            {mode === 'garyv' && result.garyVTip && (
              <div style={s.gvCard}>
                <div style={{ fontSize: 10, color: '#804020', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>🔥 Gary V Says</div>
                <p style={{ margin: 0, fontSize: 14, color: '#ff8050', lineHeight: 1.65, fontStyle: 'italic' }}>"{result.garyVTip}"</p>
              </div>
            )}
            <div style={s.card}>
              <div style={s.eyebrow}>{result.category}</div>
              <h2 style={s.iName}>{result.itemName}</h2>
              {result.brand && <div style={s.brand}>Brand: {result.brand}</div>}
              <p style={s.iDesc}>{result.description}</p>
              {result.imperfections?.filter(Boolean).length > 0 && (
                <div style={{ marginTop: 10, background: '#180808', borderRadius: 8, padding: '8px 12px', border: '1px solid #3a1515' }}>
                  <div style={{ fontSize: 10, color: '#a05050', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>⚠️ Condition notes</div>
                  {result.imperfections.map((f, i) => <div key={i} style={{ fontSize: 12, color: '#804040', marginTop: 3 }}>• {f}</div>)}
                </div>
              )}
            </div>
            {result.marketSignal && (
              <div style={s.sigCard(result.marketSignal)}>
                <div style={s.sigRow}>
                  <span style={{ fontSize: 22 }}>{signalEmoji[result.marketSignal]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: signalColor[result.marketSignal] }}>Market Signal: {result.marketSignal}</div>
                    <div style={{ fontSize: 11, color: '#505070', marginTop: 2 }}>{result.marketSignalReason}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#a0a0ff' }}>~{result.estimatedSellDays}d</div>
                    <div style={{ fontSize: 10, color: '#404070' }}>to sell</div>
                  </div>
                </div>
              </div>
            )}
            <div style={s.pCard}>
              <span style={s.lbl}>Market pricing</span>
              <div style={s.pRow}>
                <div style={s.pBox(false)}><div style={s.pLbl}>Low</div><div style={s.pVal(false)}>${result.priceLow}</div></div>
                <div style={s.pBox(true)}><div style={{ ...s.pLbl, color: '#a0a0ff' }}>✅ List At</div><div style={s.pVal(true)}>${result.suggestedPrice}</div></div>
                <div style={s.pBox(false)}><div style={s.pLbl}>High</div><div style={s.pVal(false)}>${result.priceHigh}</div></div>
              </div>
              <div style={s.qsRow}>
                <div>
                  <div style={{ fontSize: 10, color: '#306030', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>⚡ QuickSell Price</div>
                  <div style={{ fontSize: 10, color: '#305030' }}>Drop to this, moves fast</div>
                </div>
                <div style={s.qsVal}>${result.quickSellPrice}</div>
              </div>
              <div style={{ fontSize: 11, color: '#404060', fontStyle: 'italic' }}>💡 {result.pricingRationale}</div>
            </div>
            <div style={s.tabRow}>{tabs.map(t => <button key={t} onClick={() => setTab(t)} style={s.tabBtn(tab === t)}>{tabLabel(t)}</button>)}</div>

            {(tab === 'quick' || tab === 'garyv') && result.quickSellPlatform && (
              <div>
                <div style={s.qCard}>
                  <span style={s.lbl}>{tab === 'garyv' ? '🔥 Gary V QuickSell' : '⚡ Best platform for fastest sale'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{getPlatform(result.quickSellPlatform)?.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#70e070' }}>{getPlatform(result.quickSellPlatform)?.label}</span>
                    <span style={{ marginLeft: 'auto', background: '#0d2a0d', padding: '3px 10px', borderRadius: 8, fontSize: 13, color: '#50c050', fontWeight: 700 }}>${result.quickSellPrice}</span>
                  </div>
                  <p style={s.qText}>{result.quickSellListing}</p>
                  <div style={s.btnRow}>
                    <button onClick={() => copy(result.quickSellListing, 'qs')} style={s.copyBtn(copied === 'qs')}>{copied === 'qs' ? '✓ Copied!' : 'Copy Listing'}</button>
                    <a href={getPlatform(result.quickSellPlatform)?.url} target="_blank" rel="noopener noreferrer" style={s.openBtn}>Open Platform →</a>
                  </div>
                </div>
                {result.redFlags?.filter(Boolean).length > 0 && (
                  <div style={{ background: '#180808', border: '1px solid #3a1515', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#a05050', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>🚩 Disclose before selling</div>
                    {result.redFlags.map((f, i) => <div key={i} style={{ fontSize: 12, color: '#804040', marginTop: 3 }}>• {f}</div>)}
                  </div>
                )}
              </div>
            )}

            {tab === 'markets' && result.platformRankings && (
              <div>
                <span style={s.lbl}>Ranked for this specific item</span>
                {result.platformRankings.slice(0, 5).map((pr, i) => {
                  const plat = getPlatform(pr.platformId)
                  return (
                    <div key={pr.platformId} style={s.mktCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{['🥇', '🥈', '🥉'][i] || `${i + 1}.`}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#c0c0e0' }}>{plat?.label || pr.platformId}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `1px solid ${demandColor(pr.demandLevel)}44`, color: demandColor(pr.demandLevel) }}>{pr.demandLevel}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#505080', lineHeight: 1.5, marginBottom: 6 }}>{pr.reason}</div>
                      <span style={{ fontSize: 11, color: '#40c040', background: '#091409', padding: '2px 8px', borderRadius: 6 }}>~{pr.estimatedDaysToSell}d to sell</span>
                      {pr.recentSoldNote && <div style={{ fontSize: 11, color: '#404060', fontStyle: 'italic', marginTop: 6 }}>📊 {pr.recentSoldNote}</div>}
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'listings' && result.listings && (
              <div>
                {PLATFORMS.filter(p => platforms.length === 0 || platforms.includes(p.id)).map(p => {
                  const listing = result.listings[p.id]
                  if (!listing) return null
                  return (
                    <div key={p.id} style={s.lstCard}>
                      <div style={s.lstHdr}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#7070a0' }}>{p.icon} {p.label}</span>
                        <div style={s.brs}>
                          <button onClick={() => copy(listing, p.id)} style={s.cSmall(copied === p.id)}>{copied === p.id ? '✓' : 'Copy'}</button>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" style={s.oSmall}>Open</a>
                        </div>
                      </div>
                      <p style={s.lstText}>{listing}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'tips' && (
              <div>
                <div style={s.card}>
                  <span style={s.lbl}>Search keywords</span>
                  <div style={s.chipRow}>{result.searchKeywords?.map(kw => <span key={kw} style={s.kwChip}>{kw}</span>)}</div>
                </div>
                {result.tips?.filter(Boolean).length > 0 && (
                  <div style={s.card}>
                    <span style={s.lbl}>Selling tips</span>
                    {result.tips.map((t, i) => <div key={i} style={s.tipItem}>• {t}</div>)}
                  </div>
                )}
              </div>
            )}
            <button onClick={reset} style={s.resetBtn}>📸 Scan Another Item</button>
          </div>
        )}
      </main>
    </div>
  )
}
