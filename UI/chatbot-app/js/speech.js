// ============================================================
// speech.js – Web Speech API wrapper (STT + TTS)
// Placeholder for Minh's module – swap implementation here
// ============================================================

window.SpeechModule = (function() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let isSpeaking = false;
  let onTranscriptCb = null;
  let onErrorCb = null;
  let onEndCb = null;

  function isSupported() {
    return !!SpeechRecognition;
  }

  function init() {
    if (!isSupported()) return false;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      if (onTranscriptCb) onTranscriptCb(final || interim, !!final);
    };

    recognition.onerror = (e) => {
      isListening = false;
      if (onErrorCb) onErrorCb(e.error);
    };

    recognition.onend = () => {
      isListening = false;
      if (onEndCb) onEndCb();
    };

    return true;
  }

  function startListening({ lang = 'vi-VN', onTranscript, onError, onEnd } = {}) {
    if (!isSupported()) {
      if (onError) onError('not-supported');
      return false;
    }

    if (!recognition) init();

    recognition.lang = lang;
    onTranscriptCb = onTranscript;
    onErrorCb = onError;
    onEndCb = onEnd;

    try {
      recognition.start();
      isListening = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  }

  function speak(text, lang = 'vi-VN', onEnd) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Parse markdown bold to plain text
    const plain = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/•/g, '').trim();

    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = lang;
    utter.rate = 0.95;
    utter.pitch = 1.05;
    utter.volume = 1;

    // Try to find a native voice for the language
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(lang.substring(0, 2)));
    if (match) utter.voice = match;

    isSpeaking = true;
    utter.onend = () => {
      isSpeaking = false;
      if (onEnd) onEnd();
    };
    utter.onerror = () => { isSpeaking = false; };

    window.speechSynthesis.speak(utter);
  }

  function cancelSpeak() {
    window.speechSynthesis && window.speechSynthesis.cancel();
    isSpeaking = false;
  }

  function getLang() {
    return window.currentLang === 'en' ? 'en-US' : 'vi-VN';
  }

  return { isSupported, startListening, stopListening, speak, cancelSpeak, getLang,
    get isListening() { return isListening; },
    get isSpeaking() { return isSpeaking; },
  };
})();
