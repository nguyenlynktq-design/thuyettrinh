import React, { useState } from 'react';
import { X, Key, ExternalLink, Sparkles } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string, model: string) => void;
    currentKey?: string;
    currentModel?: string;
}

const MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast & efficient', default: true },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Premium quality' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fallback option' },
];

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKey = '', currentModel = 'gemini-3-flash-preview' }) => {
    const [apiKey, setApiKey] = useState(currentKey);
    const [selectedModel, setSelectedModel] = useState(currentModel);

    if (!isOpen) return null;

    const handleSave = () => {
        if (apiKey.trim()) {
            onSave(apiKey.trim(), selectedModel);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Key size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Thiết lập API Key</h2>
                                <p className="text-blue-100 text-sm">Cấu hình để sử dụng app</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* API Key Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Nhập API key của bạn..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                        />
                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            <ExternalLink size={14} /> Lấy API key miễn phí tại Google AI Studio
                        </a>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700">Chọn Model AI</label>
                        <div className="grid gap-2">
                            {MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => setSelectedModel(model.id)}
                                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selectedModel === model.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            {model.name}
                                            {model.default && (
                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Mặc định</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">{model.description}</div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModel === model.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                        }`}>
                                        {selectedModel === model.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        <Sparkles size={20} />
                        Lưu và bắt đầu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
