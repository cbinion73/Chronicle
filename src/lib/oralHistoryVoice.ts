// Voice capture for the Oral History (M19) — in-browser only. Chronicle
// has no blob/file storage anywhere in its schema (every table is plain
// strings), and adding one would mean a real migration and a real
// hosting cost for what could be hours of family audio. So the honest,
// disclosed scope cut: recordings live only in the browser tab for the
// duration of the interview, for immediate playback and an optional
// best-effort transcription (if the keeper has configured a transcription
// provider in Settings). What gets saved to Chronicle is always the
// written word, never the raw audio. See REDESIGN.md Milestone 19.

export interface VoiceRecorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export async function startRecording(): Promise<VoiceRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const releaseStream = () => {
    for (const track of stream.getTracks()) track.stop();
  };

  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          releaseStream();
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = releaseStream;
      recorder.stop();
    },
  };
}
