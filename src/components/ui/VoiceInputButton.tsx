import { useState, useEffect, useRef } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import toast from 'react-hot-toast';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function VoiceInputButton({ onTranscript, className = '' }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [recognition, setRecognition] = useState<any>(null);

  // Keep callback ref updated to avoid recreating SpeechRecognition on parent renders
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setIsListening(false);
          return;
        }
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission blocked. Please allow mic access in your browser settings.');
        } else if (event.error === 'audio-capture') {
          toast.error('No microphone found. Please connect a microphone.');
        } else {
          toast.error('Voice typing failed: ' + event.error);
        }
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscriptRef.current(transcript);
        }
      };

      setRecognition(rec);

      return () => {
        rec.abort();
      };
    }
  }, [lang]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognition) {
      toast.error('Voice typing is not supported in this browser. Try Chrome/Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const toggleLang = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextLang = lang === 'en-IN' ? 'hi-IN' : 'en-IN';
    setLang(nextLang);
    toast.success(`Language set to ${nextLang === 'en-IN' ? 'English' : 'Hindi (हिंदी)'}`);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        className={`p-1 rounded-md transition-colors focus:outline-none ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice typing'}
      >
        {isListening ? <MicOffIcon style={{ fontSize: 14 }} /> : <MicIcon style={{ fontSize: 14 }} />}
      </button>
      <button
        type="button"
        onClick={toggleLang}
        className="text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-l border-gray-200 dark:border-slate-600 pl-1.5 pr-0.5 focus:outline-none"
        title="Click to toggle English/Hindi"
      >
        {lang === 'en-IN' ? 'EN' : 'HI'}
      </button>
    </div>
  );
}
