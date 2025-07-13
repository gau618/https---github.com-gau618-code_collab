// This utility will only run on the client-side.
let synth: SpeechSynthesis;
if (typeof window !== 'undefined') {
  synth = window.speechSynthesis;
}

export const speak = (text: string, voice: SpeechSynthesisVoice | null) => {
  if (!synth) return;
  if (synth.speaking) {
    synth.cancel();
  }
  if (typeof text === 'string' && text.trim()) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    
    // If a specific voice is provided, use it.
    if (voice) {
      utterance.voice = voice;
    }
    
    synth.speak(utterance);
  }
};

export const stopSpeaking = () => {
  if (synth && synth.speaking) {
    synth.cancel();
  }
};
