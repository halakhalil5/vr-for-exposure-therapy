/**
 * Speech Service
 *
 * Bridges Node.js to the local Python Whisper script. Whisper runs locally;
 * no paid or remote speech-to-text API is used here.
 */

const { execFile } = require('child_process');
const path = require('path');

const PYTHON_EXECUTABLE = process.env.WHISPER_PYTHON_PATH || process.env.PYTHON_PATH || 'python';
const TRANSCRIBE_SCRIPT = path.join(__dirname, '..', 'scripts', 'transcribe.py');

const extractJSON = (stdout) => {
  const trimmed = String(stdout || '').trim();
  const jsonStart = trimmed.lastIndexOf('{');

  if (jsonStart === -1) {
    throw new Error('Python transcription script did not return JSON');
  }

  return JSON.parse(trimmed.slice(jsonStart));
};

const transcribeAudioFile = (audioFilePath) => {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON_EXECUTABLE,
      [TRANSCRIBE_SCRIPT, audioFilePath],
      {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 5
      },
      (error, stdout, stderr) => {
        if (error) {
          let detail = [stdout, stderr].filter(Boolean).join('\n').trim() || error.message;

          try {
            const parsed = extractJSON(stdout);
            detail = parsed.error || detail;
          } catch {
            // Keep the raw process output if Python did not produce JSON.
          }

          return reject(new Error(`Whisper transcription failed: ${detail}`));
        }

        try {
          const result = extractJSON(stdout);
          resolve({ text: String(result.text || '').trim() });
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
};

module.exports = {
  transcribeAudioFile
};
