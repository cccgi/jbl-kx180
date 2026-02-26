import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import VerticalSlider from './components/VerticalSlider';
import HorizontalSlider from './components/HorizontalSlider';
import './App.css';

const socket = io(`http://${window.location.hostname}:3001`);

const App = () => {
  const [activeTab, setActiveTab] = useState('MAIN');
  const [connected, setConnected] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('kx180-theme') || 'dark');

  const [params, setParams] = useState({
    // HOME & MASTER
    masterMusic: 50, masterMic: 50, masterEffect: 50,
    masterCenter: 80, masterSub: 80,
    muteMusic: false, muteMic: false, muteEffect: false, muteCenter: false, muteSub: false,
    inputSource: 0,
    musicBypass: false,
    currentPreset: 0,

    // MUSIC EQ (15 Bands)
    musicEQ: Array(15).fill(0),
    musicEQBypass: Array(15).fill(false),
    preBypassEQ: Array(15).fill(0), // Remembers values before bypass

    // MIC TAB
    mic1: 25, mic2: 25,
    mic1FBX: 0, mic2FBX: 0,
    mic1HPF: 40, mic2HPF: 40,
    mic1EQ: Array(15).fill(0),
    mic1EQBypass: Array(15).fill(false),
    mic1PreBypass: Array(15).fill(0),
    mic1Comp: { threshold: 0, attack: 45, release: 360, ratio: 4.0 },

    mic2EQ: Array(15).fill(0),
    mic2EQBypass: Array(15).fill(false),
    mic2PreBypass: Array(15).fill(0),
    mic2Comp: { threshold: 0, attack: 45, release: 360, ratio: 4.0 },

    // ECHO TAB
    echoVol: 100, echoDry: 100, echoDelay: 200, echoRepeat: 50,
    echoLPF: 12000, echoHPF: 40, echoPreDelay: 0, echoDamping: 12000,

    // REVERB TAB
    reverbVol: 100, reverbDry: 100, reverbTime: 3000, reverbPreDelay: 50,
    reverbLPF: 12000, reverbHPF: 40,
    reverbModel: 1,

    // EFFECT EQ (5 Bands)
    echoEQ: Array(5).fill(0),
    echoEQBypass: Array(5).fill(false),
    reverbEQ: Array(5).fill(0),
    reverbEQBypass: Array(5).fill(false),
  });

  const eqFrequencies = ["25.8", "40.1", "63.7", "101", "161", "250", "405", "630", "1k", "1.6k", "2.5k", "4k", "6.3k", "10k", "16k"];
  const effectEQFrequencies = ["60.1", "231", "926", "3k", "14k"];
  const presets = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "POP", "PRO", "STE"];

  useEffect(() => {
    socket.on('status', (data) => setConnected(data.connected));
    socket.on('sync-state', (newState) => {
      setParams(newState);
    });
    socket.on('set-param', (data) => {
      if (data.key) {
        if (data.index !== undefined && Array.isArray(params[data.key])) {
          setParams(prev => {
            const newArr = [...prev[data.key]];
            newArr[data.index] = data.value;
            return { ...prev, [data.key]: newArr };
          });
        } else {
          setParams(prev => ({ ...prev, [data.key]: data.value }));
        }
      }
    });

    socket.on('recall-program', (data) => {
      setParams(prev => ({ ...prev, currentPreset: data.index }));
    });

    socket.on('set-mic-fbx', (data) => {
      const key = data.micIndex === 0 ? 'mic1FBX' : 'mic2FBX';
      setParams(prev => ({ ...prev, [key]: data.value }));
    });

    socket.on('set-mic-hpf', (data) => {
      const key = data.micIndex === 0 ? 'mic1HPF' : 'mic2HPF';
      setParams(prev => ({ ...prev, [key]: data.value }));
    });

    socket.on('set-reverb-lpf', (data) => {
      setParams(prev => ({ ...prev, reverbLPF: data.value }));
    });

    socket.on('set-reverb-hpf', (data) => {
      setParams(prev => ({ ...prev, reverbHPF: data.value }));
    });

    return () => {
      socket.off('status');
      socket.off('sync-state');
      socket.off('set-param');
      socket.off('recall-program');
      socket.off('set-mic-fbx');
      socket.off('set-mic-hpf');
      socket.off('set-reverb-lpf');
      socket.off('set-reverb-hpf');
    };
  }, []);

  const updateParam = (key, value, bank, id, type = 'standard') => {
    setParams(prev => ({ ...prev, [key]: value }));
    socket.emit('set-param', { key, bank, id, value, type });
  };

  const toggleHardware = () => {
    if (connected) socket.emit('release-hw');
    else socket.emit('connect-hw');
  };

  const renderHome = () => (
    <div className="tab-content main-dashboard">
      <div className="all-vols-container">
        <div className="master-vols">
          <VerticalSlider label="MUSIC" max={80} value={params.masterMusic} onChange={(v) => updateParam('masterMusic', v, 0x0A, 0x00)} isMuted={params.muteMusic} onMute={() => updateParam('muteMusic', !params.muteMusic, 0x0A, 0x21)} />
          <VerticalSlider label="MIC" max={80} value={params.masterMic} onChange={(v) => updateParam('masterMic', v, 0x0A, 0x01)} isMuted={params.muteMic} onMute={() => updateParam('muteMic', !params.muteMic, 0x0A, 0x22)} />
          <VerticalSlider label="EFFECT" max={80} value={params.masterEffect} onChange={(v) => updateParam('masterEffect', v, 0x0A, 0x02)} isMuted={params.muteEffect} onMute={() => updateParam('muteEffect', !params.muteEffect, 0x0A, 0x23)} />
        </div>
        <div className="secondary-vols">
          <VerticalSlider label="MIC 1" value={params.mic1} onChange={(v) => updateParam('mic1', v, 0x01, 0x14)} />
          <VerticalSlider label="MIC 2" value={params.mic2} onChange={(v) => updateParam('mic2', v, 0x02, 0x14)} />
          <VerticalSlider label="CENTER" value={params.masterCenter} max={80} onChange={(v) => updateParam('masterCenter', v, 0x06, 0x04)} isMuted={params.muteCenter} onMute={() => updateParam('muteCenter', !params.muteCenter, 0x06, 0x06)} />
          <VerticalSlider label="SUB" value={params.masterSub} max={80} onChange={(v) => updateParam('masterSub', v, 0x07, 0x03)} isMuted={params.muteSub} onMute={() => updateParam('muteSub', !params.muteSub, 0x07, 0x15)} />
        </div>
      </div>
      <div className="dashboard-footer">
        <div className="footer-box">
          <span className="tiny-label">INPUT</span>
          <div className="radio-buttons mini">
            {['VOD', 'BGM', 'OPT'].map((s, i) => (
              <button key={s} className={params.inputSource === i ? 'active' : ''} onClick={() => updateParam('inputSource', i, 0x0A, 0x03)}>{s}</button>
            ))}
          </div>
        </div>
        <div className="footer-box">
          <span className="tiny-label">M1 FBX</span>
          <div className="radio-buttons mini">
            {['OFF', '1', '2', '3'].map((l, i) => (
              <button key={l} className={params.mic1FBX === i ? 'active' : ''} onClick={() => {
                setParams(p => ({ ...p, mic1FBX: i }));
                socket.emit('set-mic-fbx', { micIndex: 0, value: i });
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div className="footer-box">
          <span className="tiny-label">M2 FBX</span>
          <div className="radio-buttons mini">
            {['OFF', '1', '2', '3'].map((l, i) => (
              <button key={l} className={params.mic2FBX === i ? 'active' : ''} onClick={() => {
                setParams(p => ({ ...p, mic2FBX: i }));
                socket.emit('set-mic-fbx', { micIndex: 1, value: i });
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div className="footer-box bypass">
          <button className={`bypass-btn mini-dash ${params.musicBypass ? 'active' : ''}`} onClick={() => updateParam('musicBypass', !params.musicBypass, 0x0A, 0x16)}>EQ BYPASS</button>
        </div>
      </div>
    </div>
  );

  const renderMusic = () => (
    <div className="tab-content">
      <div className="control-group header-integrated">
        <div className="row-flex">
          <div className="label-col">INPUT SOURCE</div>
          <button className={`bypass-btn mini ${params.musicBypass ? 'active' : ''}`} onClick={() => updateParam('musicBypass', !params.musicBypass, 0x0A, 0x16)}>EQ BYPASS</button>
          <div className="radio-buttons mini">
            {['VOD', 'BGM', 'OPT'].map((s, i) => (
              <button key={s} className={params.inputSource === i ? 'active' : ''} onClick={() => updateParam('inputSource', i, 0x0A, 0x03)}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="label" style={{ marginTop: '15px' }}>15-BAND MUSIC EQ (Hz)</div>
      <div className="eq-scroll-container">
        {params.musicEQ.map((val, i) => {
          return (
            <div key={i} className="eq-band-col">
              <VerticalSlider
                label={eqFrequencies[i]}
                min={-24}
                max={12}
                value={val}
                unit="dB"
                showTicks={false}
                onChange={(v) => {
                  if (params.musicEQBypass[i]) return; // Locked if bypassed
                  const newEQ = [...params.musicEQ];
                  newEQ[i] = v;
                  setParams(p => ({ ...p, musicEQ: newEQ }));
                  const hwVal = (v + 24) * 10 + 2320;
                  socket.emit('set-param', { bank: 0x00, id: i, value: hwVal, type: 'precision' });
                }}
              />
              <div className="eq-bypass-check">
                <input type="checkbox" checked={params.musicEQBypass[i]} onChange={() => {
                  const newBypass = [...params.musicEQBypass];
                  const newEQ = [...params.musicEQ];
                  const newPre = [...params.preBypassEQ];

                  newBypass[i] = !newBypass[i];

                  if (newBypass[i]) {
                    // ENABLE BYPASS: Store current, set to 0
                    newPre[i] = val;
                    newEQ[i] = 0;
                    socket.emit('set-param', { key: 'musicEQ', index: i, bank: 0x00, id: i, value: 2560, type: 'precision' });
                  } else {
                    // DISABLE BYPASS: Restore previous
                    newEQ[i] = newPre[i];
                    const hwVal = (newPre[i] + 24) * 10 + 2320;
                    socket.emit('set-param', { key: 'musicEQ', index: i, bank: 0x00, id: i, value: hwVal, type: 'precision' });
                  }

                  setParams(p => ({ ...p, musicEQ: newEQ, musicEQBypass: newBypass, preBypassEQ: newPre }));
                }} />
                <label>BYP</label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMicDetail = (idx) => {
    const isM1 = idx === 0;
    const eqKey = isM1 ? 'mic1EQ' : 'mic2EQ';
    const bypKey = isM1 ? 'mic1EQBypass' : 'mic2EQBypass';
    const preKey = isM1 ? 'mic1PreBypass' : 'mic2PreBypass';
    const compKey = isM1 ? 'mic1Comp' : 'mic2Comp';
    const bank = isM1 ? 0x01 : 0x02;

    return (
      <div className="mic-detail-panel">
        <div className="mic-eq-section">
          <div className="mini-header-row">
            <span className="tiny-label">15-BAND MIC EQ</span>
            <button
              className={`bypass-btn micro ${params[bypKey].every(v => v) ? 'active' : ''}`}
              onClick={() => {
                const allByp = !params[bypKey].every(v => v);
                const newByp = Array(15).fill(allByp);
                const newEQ = [...params[eqKey]];
                const newPre = [...params[preKey]];

                if (allByp) {
                  params[eqKey].forEach((v, i) => { newPre[i] = v; newEQ[i] = 0; });
                } else {
                  params[preKey].forEach((v, i) => { newEQ[i] = v; });
                }

                setParams(p => ({ ...p, [eqKey]: newEQ, [bypKey]: newByp, [preKey]: newPre }));
                // In a real scenario, we'd emit each band or a global bypass
              }}
            >
              EQ BYPASS
            </button>
          </div>
          <div className="mic-eq-scroll">
            {params[eqKey].map((val, i) => (
              <div key={i} className="mic-eq-col">
                <VerticalSlider
                  label={`EQ${i + 1}`}
                  subLabel={eqFrequencies[i]}
                  min={-24}
                  max={12}
                  value={val}
                  showTicks={false}
                  compact={true}
                  onChange={(v) => {
                    if (params[bypKey][i]) return;
                    const newEQ = [...params[eqKey]];
                    newEQ[i] = v;
                    setParams(p => ({ ...p, [eqKey]: newEQ }));
                    socket.emit('set-param', { key: eqKey, index: i, bank, id: i, value: v, type: 'mic-eq' });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mic-comp-section">
          <span className="tiny-label">COMPRESSOR</span>
          <div className="comp-grid">
            <VerticalSlider
              label="Thrsh"
              min={-40}
              max={0}
              step={0.1}
              value={params[compKey].threshold}
              unit=" dBu"
              compact={true}
              onChange={(v) => {
                setParams(p => ({ ...p, [compKey]: { ...p[compKey], threshold: v } }));
                socket.emit('set-param', { key: compKey, subKey: 'threshold', bank, id: 0x15, value: v, type: 'mic-comp' });
              }}
            />
            <VerticalSlider
              label="Attack"
              min={0.5}
              max={100}
              step={0.5}
              value={params[compKey].attack}
              unit=" ms"
              compact={true}
              onChange={(v) => {
                setParams(p => ({ ...p, [compKey]: { ...p[compKey], attack: v } }));
                socket.emit('set-param', { key: compKey, subKey: 'attack', bank, id: 0x16, value: v, type: 'mic-comp' });
              }}
            />
            <VerticalSlider
              label="Release"
              min={10}
              max={2000}
              step={10}
              value={params[compKey].release}
              unit=" ms"
              compact={true}
              onChange={(v) => {
                setParams(p => ({ ...p, [compKey]: { ...p[compKey], release: v } }));
                socket.emit('set-param', { key: compKey, subKey: 'release', bank, id: 0x17, value: v, type: 'mic-comp' });
              }}
            />
            <VerticalSlider
              label="Ratio"
              min={1}
              max={100}
              step={1}
              value={params[compKey].ratio}
              unit=":1"
              compact={true}
              onChange={(v) => {
                setParams(p => ({ ...p, [compKey]: { ...p[compKey], ratio: v } }));
                socket.emit('set-param', { key: compKey, subKey: 'ratio', bank, id: 0x18, value: v, type: 'mic-comp' });
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMic = () => (
    <div className="tab-content mic-tab-container full-height">
      <div className="mic-channel expanded">
        <div className="mic-header">
          <div className="label">MIC 1</div>
          <div className="mic-fbx-mini">
            <span className="mini-label">FBX</span>
            <div className="radio-buttons">
              {['OFF', '1', '2', '3'].map((l, i) => (
                <button key={l} className={params.mic1FBX === i ? 'active' : ''} onClick={() => {
                  setParams(p => ({ ...p, mic1FBX: i }));
                  socket.emit('set-mic-fbx', { micIndex: 0, value: i });
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mic-h-controls">
          <HorizontalSlider
            label="HPF Freq"
            min={20}
            max={303}
            value={params.mic1HPF}
            unit=" Hz"
            onChange={(v) => {
              setParams(p => ({ ...p, mic1HPF: v }));
              socket.emit('set-mic-hpf', { micIndex: 0, value: v });
            }}
          />
          <HorizontalSlider
            label="MIC Vol"
            value={params.mic1}
            unit="%"
            onChange={(v) => updateParam('mic1', v, 0x01, 0x14)}
          />
        </div>
        {renderMicDetail(0)}
      </div>
      <div className="mic-channel expanded">
        <div className="mic-header">
          <div className="label">MIC 2</div>
          <div className="mic-fbx-mini">
            <span className="mini-label">FBX</span>
            <div className="radio-buttons">
              {['OFF', '1', '2', '3'].map((l, i) => (
                <button key={l} className={params.mic2FBX === i ? 'active' : ''} onClick={() => {
                  setParams(p => ({ ...p, mic2FBX: i }));
                  socket.emit('set-mic-fbx', { micIndex: 1, value: i });
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mic-h-controls">
          <HorizontalSlider
            label="HPF Freq"
            min={20}
            max={303}
            value={params.mic2HPF}
            unit=" Hz"
            onChange={(v) => {
              setParams(p => ({ ...p, mic2HPF: v }));
              socket.emit('set-mic-hpf', { micIndex: 1, value: v });
            }}
          />
          <HorizontalSlider
            label="MIC Vol"
            value={params.mic2}
            unit="%"
            onChange={(v) => updateParam('mic2', v, 0x02, 0x14)}
          />
        </div>
        {renderMicDetail(1)}
      </div>
    </div>
  );

  const renderEffectEQ = (type) => {
    const isEcho = type === 'ECHO';
    const eqKey = isEcho ? 'echoEQ' : 'reverbEQ';
    const bypKey = isEcho ? 'echoEQBypass' : 'reverbEQBypass';
    const bank = 0x03;
    const startId = isEcho ? 0x06 : 0x11;

    return (
      <div className="effect-eq-section">
        <span className="tiny-label">{type} EQ</span>
        <div className="effect-eq-grid">
          {params[eqKey].map((val, i) => (
            <div key={i} className="eq-band-unit">
              <VerticalSlider
                label={`EQ${i + 1}`}
                subLabel={effectEQFrequencies[i]}
                min={-24}
                max={12}
                value={val}
                showTicks={false}
                compact={true}
                onChange={(v) => {
                  if (params[bypKey][i]) return;
                  const newEQ = [...params[eqKey]];
                  newEQ[i] = v;
                  setParams(p => ({ ...p, [eqKey]: newEQ }));
                  socket.emit('set-param', { key: eqKey, index: i, bank, id: startId + i, value: v, type: isEcho ? 'echo-eq' : 'reverb-eq' });
                }}
              />
              <div className="eq-bypass-box">
                <input
                  type="checkbox"
                  checked={params[bypKey][i]}
                  onChange={(e) => {
                    const newByp = [...params[bypKey]];
                    newByp[i] = e.target.checked;
                    setParams(p => ({ ...p, [bypKey]: newByp }));
                    socket.emit('set-param', { key: bypKey, index: i, bank, id: startId + i, value: e.target.checked, type: isEcho ? 'echo-eq-byp' : 'reverb-eq-byp' });
                  }}
                />
                <span className="tiny-label">BYP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEcho = () => (
    <div className="tab-content echo-reverb-container">
      <div className="grid-row">
        <VerticalSlider label="VOL" value={params.echoVol} onChange={(v) => updateParam('echoVol', v, 0x03, 0x27)} />
        <VerticalSlider label="DRY" value={params.echoDry} onChange={(v) => updateParam('echoDry', v, 0x03, 0x28)} />
        <VerticalSlider label="DELAY" max={500} value={params.echoDelay} unit="ms" onChange={(v) => updateParam('echoDelay', v, 0x03, 0x00)} />
        <VerticalSlider label="REPEAT" min={1} max={90} value={params.echoRepeat} onChange={(v) => updateParam('echoRepeat', v, 0x03, 0x01)} />
      </div>
      <div className="grid-row">
        <VerticalSlider label="LPF" min={5990} max={20200} value={params.echoLPF} unit="Hz" onChange={(v) => updateParam('echoLPF', v, 0x03, 0x02)} />
        <VerticalSlider label="HPF" min={20} max={303} value={params.echoHPF} unit="Hz" onChange={(v) => updateParam('echoHPF', v, 0x03, 0x03)} />
        <VerticalSlider label="PRE" max={250} value={params.echoPreDelay} unit="ms" onChange={(v) => updateParam('echoPreDelay', v, 0x03, 0x04)} />
        <VerticalSlider label="DAMP" min={5990} max={20200} value={params.echoDamping} unit="Hz" onChange={(v) => updateParam('echoDamping', v, 0x03, 0x05)} />
      </div>
      {renderEffectEQ('ECHO')}
    </div>
  );

  const renderReverb = () => (
    <div className="tab-content echo-reverb-container">
      <div className="control-group header-integrated">
        <div className="row-flex">
          <div className="label-col">REVERB MODEL</div>
          <div className="radio-buttons mini reverb-models">
            {['Room', 'Small Hall', 'Large Hall', 'Voice'].map((l, i) => (
              <button key={l} className={params.reverbModel === i + 1 ? 'active' : ''} onClick={() => updateParam('reverbModel', i + 1, 0x03, 0x2a)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid-row">
        <VerticalSlider label="VOL" value={params.reverbVol} onChange={(v) => updateParam('reverbVol', v, 0x03, 0x29)} />
        <VerticalSlider label="DRY" value={params.reverbDry} onChange={(v) => updateParam('reverbDry', v, 0x03, 0x10)} />
        <VerticalSlider label="TIME" max={9000} value={params.reverbTime} unit="ms" onChange={(v) => updateParam('reverbTime', v, 0x03, 0x0d)} />
        <VerticalSlider label="PRE" max={250} value={params.reverbPreDelay} unit="ms" onChange={(v) => updateParam('reverbPreDelay', v, 0x03, 0x0e)} />
      </div>
      <div className="grid-row">
        <VerticalSlider label="LPF" min={5990} max={20200} value={params.reverbLPF} unit="Hz" onChange={(v) => updateParam('reverbLPF', v, 0x03, 0x0d)} />
        <VerticalSlider label="HPF" min={20} max={303} value={params.reverbHPF} unit="Hz" onChange={(v) => updateParam('reverbHPF', v, 0x03, 0x0e)} />
        {/* Fill empty spots for 4-col consistency */}
        <div className="empty-slider"></div>
        <div className="empty-slider"></div>
      </div>
      {renderEffectEQ('REVERB')}
    </div>
  );


  const renderSettings = () => (
    <div className="tab-content settings-page">
      <div className="control-group hardware-lock">
        <div className="radio-label">THEME</div>
        <div className="radio-buttons">
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => { setTheme('dark'); localStorage.setItem('kx180-theme', 'dark'); }}>DARK</button>
          <button className={theme === 'light' ? 'active' : ''} onClick={() => { setTheme('light'); localStorage.setItem('kx180-theme', 'light'); }}>LIGHT</button>
        </div>
      </div>

      <div className="control-group hardware-lock">
        <div className="radio-label">HARDWARE CONNECTION</div>
        <button className={`lock-btn ${connected ? 'status-connected' : 'status-disconnected'}`} onClick={toggleHardware}>
          {connected ? 'RELEASE HARDWARE' : 'LOCK HARDWARE'}
        </button>
      </div>

      <div className="control-group preset-recall">
        <div className="radio-label">PRESET RECALL (LCD COMMIT)</div>
        <div className="preset-grid">
          {presets.map((p, i) => (
            <button
              key={p}
              className={params.currentPreset === i ? 'active' : ''}
              onClick={() => {
                setParams(p => ({ ...p, currentPreset: i }));
                socket.emit('recall-program', { index: i });
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'MAIN': return renderHome();
      case 'MUSIC': return renderMusic();
      case 'MIC': return renderMic();
      case 'ECHO': return renderEcho();
      case 'REVERB': return renderReverb();
      case 'SETTINGS': return renderSettings();
      default: return renderHome();
    }
  };

  return (
    <div className={`app-container ${theme}-theme`}>
      <div className="header">
        <div className="header-left">
          {activeTab !== 'MAIN' && <div className="back-btn" onClick={() => setActiveTab('MAIN')}>{'<'}</div>}
        </div>
        <div className="screen-title">{activeTab}</div>
        <div className="header-right">
          <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
          <div className="settings-icon" onClick={() => setActiveTab('SETTINGS')}>⚙️</div>
        </div>
      </div>

      <div className="scroll-content">
        {renderTabContent()}
      </div>

      <div className="tab-bar">
        {['MAIN', 'MUSIC', 'MIC', 'ECHO', 'REVERB'].map(tab => (
          <div key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            <div className="tab-icon">
              {tab === 'MAIN' ? '🏠' : tab === 'MUSIC' ? '🎵' : tab === 'MIC' ? '🎤' : tab === 'ECHO' ? '🔁' : '🌊'}
            </div>
            <div className="tab-label">{tab}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
