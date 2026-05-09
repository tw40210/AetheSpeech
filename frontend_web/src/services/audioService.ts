/**
 * Browser-native audio recording using MediaRecorder.
 * Produces a Blob (typically audio/webm;codecs=opus in Chrome/Edge,
 * audio/ogg;codecs=opus in Firefox) compatible with Whisper transcription.
 */

export interface AudioFile {
  blob: Blob;
  questionId: string;
  mimeType: string;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private currentQuestionId: string | null = null;

  /** Returns true if the browser can access the microphone. */
  async hasPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  /** Start recording audio for a given question. */
  async startRecording(questionId: string): Promise<void> {
    this.currentQuestionId = questionId;
    this.chunks = [];

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Prefer webm/opus; fall back to whatever the browser supports
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
      ? 'audio/ogg;codecs=opus'
      : '';

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(100); // collect data every 100 ms
  }

  /**
   * Stop recording and return the audio file descriptor.
   * Returns null if no audio was captured or recording was not active.
   */
  stopRecording(): Promise<AudioFile | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType ?? 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });

        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;

        if (blob.size === 0 || !this.currentQuestionId) {
          resolve(null);
        } else {
          resolve({ blob, questionId: this.currentQuestionId, mimeType });
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /** Cancel an in-progress recording without resolving data. */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.chunks = [];
  }
}

export const audioService = new AudioService();
