
import React, { useState, useRef, useEffect } from 'react';
import { Theme, GenerationStatus, PresentationData, PracticeResult, EnglishLevel, LEVEL_CONFIG } from './types';
import { PREDEFINED_THEMES } from './constants';
import { generateIllustration, generatePresentationScript, generateSpeech, analyzeSpeech, encode, setApiKey as setGeminiApiKey } from './services/geminiService';
import ThemeCard from './components/ThemeCard';
import ApiKeyModal from './components/ApiKeyModal';
import { Play, RotateCcw, Sparkles, Wand2, Volume2, Download, Mic, Trophy, Star, ArrowRight, MessageCircle, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

const App: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [customTheme, setCustomTheme] = useState('');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [childName, setChildName] = useState('Anna');
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel>(EnglishLevel.STARTER);
  const [transcript, setTranscript] = useState('');
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [error, setError] = useState<string | null>(null);

  // Client-side only initialization
  useEffect(() => {
    setMounted(true);
    const savedKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    const savedModel = localStorage.getItem('gemini_model') || 'gemini-3-flash-preview';
    setApiKey(savedKey);
    setSelectedModel(savedModel);
    if (savedKey) {
      setGeminiApiKey(savedKey);
    } else {
      setShowApiModal(true);
    }
  }, []);

  const handleSaveApiKey = (key: string, model: string) => {
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_model', model);
    setApiKey(key);
    setSelectedModel(model);
    setGeminiApiKey(key);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const liveSessionRef = useRef<any>(null);

  const handleGenerate = async () => {
    const themeText = customTheme || selectedTheme?.label;
    if (!themeText) return;

    try {
      setStatus(GenerationStatus.GENERATING_IMAGE);
      const imageUri = await generateIllustration(themeText);

      setStatus(GenerationStatus.GENERATING_SCRIPT);
      const scriptData = await generatePresentationScript(imageUri, themeText, selectedLevel);

      const personalizedIntro = scriptData.intro
        .replace(/\[Name\]/g, childName);

      setPresentation({
        imageUri,
        intro: personalizedIntro,
        points: scriptData.points,
        conclusion: scriptData.conclusion,
        script: `${personalizedIntro} ${scriptData.points.join(' ')} ${scriptData.conclusion}`,
      });
      setStatus(GenerationStatus.READY);
    } catch (error) {
      console.error("Generation failed:", error);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const startPractice = async () => {
    setTranscript('');
    setStatus(GenerationStatus.PRACTICING);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              session.sendRealtimeInput({ media: blob });
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.inputTranscription) {
              setTranscript(prev => prev + ' ' + message.serverContent.inputTranscription.text);
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: 'You are listening to a child practice English. Just transcribe accurately what they say.'
        }
      });
      liveSessionRef.current = session;
    } catch (err) {
      console.error("Microphone error:", err);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const stopPractice = async () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }

    if (!transcript) {
      setStatus(GenerationStatus.READY);
      return;
    }

    setStatus(GenerationStatus.SCORING);
    try {
      const result = await analyzeSpeech(presentation!.script, transcript);
      setPracticeResult({ ...result, transcript });
      setStatus(GenerationStatus.RESULT);
    } catch (err) {
      console.error("Scoring failed:", err);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const playAudio = async () => {
    if (!presentation || isPlaying) return;
    try {
      setIsPlaying(true);
      const audioBuffer = await generateSpeech(presentation.script);
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      sourceNodeRef.current = source;
    } catch (error) {
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      setIsPlaying(false);
    }
  };

  const reset = () => {
    setSelectedTheme(null);
    setCustomTheme('');
    setPresentation(null);
    setPracticeResult(null);
    setTranscript('');
    setStatus(GenerationStatus.IDLE);
    stopAudio();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* SSR Loading Screen */}
      {!mounted && (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-blue-600 font-bold text-lg">Loading KidSpeak Lab...</p>
          </div>
        </div>
      )}

      {mounted && (
        <>
          {/* API Key Modal */}
          <ApiKeyModal
            isOpen={showApiModal}
            onClose={() => apiKey && setShowApiModal(false)}
            onSave={handleSaveApiKey}
            currentKey={apiKey}
            currentModel={selectedModel}
          />
          <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
                <div className="bg-blue-500 p-2 rounded-xl">
                  <Sparkles className="text-white" size={24} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">KidSpeak <span className="text-blue-500">Lab</span></h1>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setShowApiModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
              >
                <Settings size={16} className="text-gray-500" />
                <span className="text-red-500 font-medium hidden sm:inline">API Key</span>
              </button>

              <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-4 bg-gray-50 p-2 rounded-full px-4 border border-blue-100">
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm font-bold text-blue-600 w-24 text-center"
                    placeholder="Kid Name"
                  />
                  <div className="w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Level:</span>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value as EnglishLevel)}
                      className="bg-white border border-blue-200 rounded-lg px-3 py-1 text-sm font-bold text-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {Object.values(EnglishLevel).map((level) => (
                        <option key={level} value={level}>
                          {LEVEL_CONFIG[level].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {presentation && <button onClick={reset} className="text-gray-400 hover:text-red-500"><RotateCcw size={20} /></button>}
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 mt-8">
            {status === GenerationStatus.IDLE && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <section className="text-center space-y-4">
                  <h2 className="text-4xl font-bold text-gray-800">Let's practice English! 🚀</h2>
                  <p className="text-gray-500 text-lg">Pick a theme to create your special presentation.</p>

                  <div className="max-w-md mx-auto relative mt-6 group">
                    <input
                      type="text"
                      placeholder="Or type a custom theme..."
                      className="w-full px-6 py-5 rounded-full border-4 border-blue-50 focus:border-blue-400 outline-none shadow-xl text-lg transition-all"
                      value={customTheme}
                      onChange={(e) => { setCustomTheme(e.target.value); setSelectedTheme(null); }}
                    />
                    <Wand2 className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-400 group-hover:rotate-12 transition-transform" />
                  </div>
                </section>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {PREDEFINED_THEMES.map((theme) => (
                    <ThemeCard key={theme.id} theme={theme} isSelected={selectedTheme?.id === theme.id} onClick={(t) => { setSelectedTheme(t); setCustomTheme(''); }} />
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    disabled={!selectedTheme && !customTheme}
                    onClick={handleGenerate}
                    className="flex items-center gap-3 px-12 py-6 rounded-full font-black text-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-30"
                  >
                    <Sparkles size={28} /> Start Magic
                  </button>
                </div>
              </div>
            )}

            {(status === GenerationStatus.GENERATING_IMAGE || status === GenerationStatus.GENERATING_SCRIPT) && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8">
                <div className="relative animate-bounce">
                  <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                    <Wand2 size={48} className="text-white" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold text-blue-600">Making it Perfect...</h3>
                  <p className="text-gray-400 font-medium">Wait for the magic! ✨</p>
                </div>
              </div>
            )}

            {(status === GenerationStatus.READY || status === GenerationStatus.PRACTICING) && presentation && (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                {/* Main Content - Image and Script side by side */}
                <div className="grid lg:grid-cols-5 gap-8">
                  <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-white group">
                      <img src={presentation.imageUri} className="w-full h-auto rounded-[1.5rem] group-hover:scale-[1.02] transition-transform duration-500 shadow-lg" alt="Illustration" />
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className={`bg-white rounded-[2.5rem] shadow-xl p-8 border-t-8 relative transition-all ${status === GenerationStatus.PRACTICING ? 'border-red-500' : 'border-blue-500'}`}>
                      <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4 flex items-center gap-2">
                        📖 Your Script
                        {status === GenerationStatus.PRACTICING && (
                          <span className="text-sm font-normal text-red-500 animate-pulse ml-auto flex items-center gap-1">
                            <Mic size={16} /> Recording...
                          </span>
                        )}
                      </h3>
                      <div className="space-y-4 text-lg leading-relaxed text-gray-700">
                        <div className="text-blue-600 font-bold bg-blue-50 p-3 rounded-lg">{presentation.intro}</div>
                        <ul className="space-y-3">
                          {presentation.points.map((p, i) => <li key={i} className="flex gap-2"><span>⭐</span> {p}</li>)}
                        </ul>
                        <div className="text-green-600 font-bold bg-green-50 p-3 rounded-lg">{presentation.conclusion}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Practice Controls - Below the content */}
                <div className="bg-white rounded-[2rem] shadow-xl p-6 border-2 border-gray-100">
                  {status === GenerationStatus.READY ? (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                      <button onClick={playAudio} className="flex-1 max-w-xs bg-white border-2 border-blue-500 text-blue-600 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all">
                        {isPlaying ? <RotateCcw /> : <Volume2 />} Listen Example
                      </button>
                      <button onClick={startPractice} className="flex-1 max-w-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 shadow-xl transition-all hover:scale-105">
                        <Mic size={24} /> 🎤 Start Practice
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Recording indicator */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-600 font-bold text-lg">Recording in progress...</span>
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      </div>

                      {/* Live transcript */}
                      <div className="bg-gray-50 p-4 rounded-xl min-h-[80px] border-2 border-dashed border-gray-200">
                        {transcript ? (
                          <p className="text-lg text-gray-700 italic text-center">"{transcript}"</p>
                        ) : (
                          <p className="text-gray-400 italic text-center">🎙️ Speak now... Your words will appear here</p>
                        )}
                      </div>

                      {/* Stop button */}
                      <div className="flex justify-center">
                        <button onClick={stopPractice} className="bg-red-600 text-white px-12 py-4 rounded-full font-bold text-xl hover:bg-red-700 shadow-xl flex items-center gap-3 transition-all hover:scale-105">
                          <Play fill="white" size={24} /> Finish & Get Score
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status === GenerationStatus.SCORING && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                <div className="w-24 h-24 border-8 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <h3 className="text-2xl font-bold text-blue-600">Analyzing Your Speech...</h3>
              </div>
            )}

            {status === GenerationStatus.RESULT && practiceResult && (
              <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
                <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-white">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-12 text-center text-white">
                    <Trophy size={80} className="mx-auto mb-4" />
                    <h2 className="text-5xl font-black mb-2">Well Done, {childName}!</h2>
                    <div className="flex justify-center gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={40} fill={i <= (practiceResult.score / 20) ? "yellow" : "rgba(255,255,255,0.2)"} className={i <= (practiceResult.score / 20) ? "text-yellow-400" : "text-white/20"} />
                      ))}
                    </div>
                    <div className="inline-block bg-white/20 px-8 py-2 rounded-full font-bold text-2xl backdrop-blur-md">
                      CEFR Level: {practiceResult.cefrLevel}
                    </div>
                  </div>

                  <div className="p-12 grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <MessageCircle className="text-blue-500" /> Feedback
                      </h4>
                      <p className="text-lg text-gray-600 leading-relaxed italic">"{practiceResult.feedback}"</p>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <Sparkles className="text-yellow-500" /> Practice These Words
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {practiceResult.mistakes.map((m, i) => (
                          <span key={i} className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold border border-red-100">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-12 pt-0 flex justify-center gap-4">
                    <button onClick={() => setStatus(GenerationStatus.READY)} className="px-10 py-4 rounded-full font-bold text-gray-500 border-2 border-gray-100 hover:bg-gray-50 flex items-center gap-2">
                      <RotateCcw size={20} /> Try Again
                    </button>
                    <button onClick={reset} className="px-10 py-4 rounded-full font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xl flex items-center gap-2">
                      New Presentation <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Error Banner */}
          {error && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 max-w-lg z-50">
              <AlertCircle className="text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold">Lỗi API</div>
                <div className="text-sm">{error}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowApiModal(true)} className="px-3 py-2 text-sm bg-white border border-red-300 rounded-lg hover:bg-red-50">
                  Đổi Key
                </button>
                <button onClick={handleRetry} className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
                  <RefreshCw size={14} /> Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Footer Promotion */}
          <footer className="bg-slate-800 text-slate-300 py-8 px-4 mt-auto border-t border-slate-700 no-print">
            <div className="max-w-5xl mx-auto text-center">
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                <p className="font-bold text-lg md:text-xl text-blue-200 mb-3 leading-relaxed">
                  ĐĂNG KÝ KHOÁ HỌC THỰC CHIẾN VIẾT SKKN, TẠO APP DẠY HỌC, TẠO MÔ PHỎNG TRỰC QUAN <br className="hidden md:block" />
                  <span className="text-yellow-400">CHỈ VỚI 1 CÂU LỆNH</span>
                </p>
                <a
                  href="https://tinyurl.com/khoahocAI2025"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all transform hover:-translate-y-1 shadow-lg shadow-blue-900/50"
                >
                  ĐĂNG KÝ NGAY
                </a>
              </div>

              <div className="space-y-2 text-sm md:text-base">
                <p className="font-medium text-slate-400">Mọi thông tin vui lòng liên hệ:</p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
                  <a
                    href="https://www.facebook.com/nguyen.ly.254892/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-400 transition-colors duration-200 flex items-center gap-2"
                  >
                    <span className="font-bold">Facebook:</span> Ms Ly AI
                  </a>
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                  <span className="hover:text-emerald-400 transition-colors duration-200 cursor-default flex items-center gap-2">
                    <span className="font-bold">Zalo:</span> 0962859488
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
