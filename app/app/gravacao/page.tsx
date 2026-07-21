"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, Card, Dropzone } from "@/components/app/ui";

type RecPhase = "idle" | "recording" | "ready" | "listening";
type Mode = "record" | "upload";

function formatTime(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

export default function GravacaoPage() {
  const wizard = useWizard();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("record");
  const [phase, setPhase] = useState<RecPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);

  const slides = wizard.roteiros;
  const idx = wizard.scriptIndex;
  const current = slides[idx];

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function stopPlayback() {
    audioElRef.current?.pause();
    audioElRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function resetRec() {
    setPhase("idle");
    setSeconds(0);
    setMp3File(null);
    setRecordedBlob(null);
    setMicError(null);
    clearTimer();
    stopStream();
    stopPlayback();
  }

  if (idx !== prevIdx) {
    setPrevIdx(idx);
    setPhase("idle");
    setSeconds(0);
    setMp3File(null);
    setRecordedBlob(null);
    setMicError(null);
    setAllDone(false);
  }

  useEffect(() => {
    clearTimer();
    stopStream();
    stopPlayback();
  }, [idx]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      stopPlayback();
    };
  }, []);

  function goTo(i: number) {
    wizard.setScriptIndex(i);
  }

  async function toggleRecord() {
    if (mode === "upload") return;
    if (phase === "idle") {
      setMicError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const recorder = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          setRecordedBlob(new Blob(chunksRef.current, { type: mimeType }));
          stopStream();
        };
        recorder.start();
        recorderRef.current = recorder;
        setPhase("recording");
        setSeconds(0);
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch {
        setMicError("Não foi possível acessar o microfone. Verifique a permissão do navegador para este site.");
      }
    } else if (phase === "recording") {
      recorderRef.current?.stop();
      clearTimer();
      setPhase("ready");
    }
  }

  function toggleListen() {
    if (phase === "ready") {
      const source = mode === "upload" ? mp3File : recordedBlob;
      if (!source) return;
      const url = URL.createObjectURL(source);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => {
        setPhase((p) => (p === "listening" ? "ready" : p));
      };
      audioElRef.current = audio;
      audio.play();
      setPhase("listening");
    } else if (phase === "listening") {
      audioElRef.current?.pause();
      setPhase("ready");
    }
  }

  async function save() {
    if (phase !== "ready" && phase !== "listening") return;
    const source = mode === "upload" ? mp3File : recordedBlob;
    if (!source) return;
    stopPlayback();
    const ext = mode === "upload" ? "mp3" : recordedBlob?.type.includes("webm") ? "webm" : "m4a";
    const wasLast = idx >= slides.length - 1;
    const ok = await wizard.uploadRecording(idx, source, ext);
    if (!ok) return;
    if (wasLast) setAllDone(true);
    resetRec();
  }

  if (!current) {
    return (
      <Card>
        <p className="text-[13px] text-[var(--text-2)]">
          Nenhum roteiro gerado ainda. Volte à aba Roteiros e clique em Gerar.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col items-center text-center px-5 pt-9 pb-6">
        <h3 className="text-base font-semibold m-0 mb-0.5 text-[var(--text-1)]">
          Tema {String(idx + 1).padStart(2, "0")} · Gravação
        </h3>
        <p className="text-[13px] text-[var(--text-2)] max-w-[440px] leading-relaxed">
          Leia o roteiro, grave (ou envie um MP3), ouça e salve. O ciclo passa sozinho para o próximo tema.
        </p>

        <div className="relative w-full max-w-[520px] mt-6">
          <button
            aria-label="Roteiro anterior"
            disabled={idx === 0}
            onClick={() => goTo(idx - 1)}
            className="absolute top-1/2 -translate-y-1/2 -left-2 w-10 h-10 rounded-full border-[1.5px] border-[var(--line-strong)] bg-[var(--bg-1)] text-[var(--text-1)] flex items-center justify-center text-[17px] cursor-pointer shadow-[0_6px_18px_rgba(0,0,0,0.4)] z-[2] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-left" />
          </button>
          <div className="bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[14px] px-[52px] py-5 min-h-[96px] text-left">
            <div className="font-mono text-[11px] tracking-wide text-[var(--teal)] mb-1.5">
              {current.meta} · {idx + 1} DE {slides.length}
            </div>
            <div className="text-[14.5px] leading-relaxed text-[var(--text-1)]">{current.text}</div>
          </div>
          <button
            aria-label="Próximo roteiro"
            disabled={idx === slides.length - 1}
            onClick={() => goTo(idx + 1)}
            className="absolute top-1/2 -translate-y-1/2 -right-2 w-10 h-10 rounded-full border-[1.5px] border-[var(--line-strong)] bg-[var(--bg-1)] text-[var(--text-1)] flex items-center justify-center text-[17px] cursor-pointer shadow-[0_6px_18px_rgba(0,0,0,0.4)] z-[2] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
        <div className="flex gap-1.5 mt-3 justify-center">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para roteiro ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full border-none p-0 cursor-pointer transition-all ${
                i === idx ? "bg-[var(--gold)] w-4 rounded-[3px]" : "bg-[var(--line-strong)] w-1.5"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mt-8 bg-[var(--bg-2)] p-1 rounded-[11px] border-[0.5px] border-[var(--line)] justify-center">
          <button
            onClick={() => {
              setMode("record");
              resetRec();
            }}
            className={`px-4 py-2 rounded-lg border-none text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
              mode === "record" ? "bg-[var(--gold)] text-[#1a1a1a]" : "bg-transparent text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            <Icon name="microphone" /> Gravar agora
          </button>
          <button
            onClick={() => {
              setMode("upload");
              resetRec();
            }}
            className={`px-4 py-2 rounded-lg border-none text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
              mode === "upload" ? "bg-[var(--gold)] text-[#1a1a1a]" : "bg-transparent text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            <Icon name="file-music" /> Enviar MP3
          </button>
        </div>

        {mode === "record" && (
          <div className="flex flex-col items-center w-full mt-8">
            <button
              aria-label="Iniciar gravação"
              onClick={toggleRecord}
              className={`w-[88px] h-[88px] rounded-full border-2 flex items-center justify-center text-[28px] cursor-pointer mb-4 transition-all hover:scale-[1.03] ${
                phase === "recording"
                  ? "border-[var(--teal)] text-[var(--teal)] animate-pulse"
                  : phase === "ready" || phase === "listening"
                    ? "border-[var(--teal)] text-[var(--teal)]"
                    : "border-[var(--gold)] text-[var(--gold)]"
              }`}
            >
              <Icon
                name={
                  phase === "idle"
                    ? "microphone"
                    : phase === "recording"
                      ? "player-stop-filled"
                      : "check"
                }
              />
            </button>
            <div className="font-mono text-xs text-[var(--text-2)] mb-2 tracking-wide">
              {phase === "idle" && `Pronto para gravar · 00:00`}
              {phase === "recording" && `Gravando... ${formatTime(seconds)}`}
              {phase === "ready" && `Áudio pronto · ${formatTime(seconds)}`}
              {phase === "listening" && `Reproduzindo... ${formatTime(seconds)}`}
            </div>
            {micError && (
              <p className="text-[12.5px] text-[var(--gold)] max-w-[380px] mb-6 flex items-center gap-1.5">
                <Icon name="alert-triangle" /> {micError}
              </p>
            )}
            {!micError && <div className="mb-6" />}
          </div>
        )}

        {mode === "upload" && (
          <div className="w-full max-w-[420px] mt-6">
            <Dropzone
              icon="file-music"
              title={mp3File ? mp3File.name : "Clique para escolher ou arraste o .mp3 aqui"}
              subtitle={mp3File ? `${(mp3File.size / 1024 / 1024).toFixed(1)} MB · clique para trocar` : "MP3 · até 20MB"}
              accept=".mp3,audio/mpeg"
              onFiles={(files) => {
                setMp3File(files[0]);
                setPhase("ready");
              }}
            />
          </div>
        )}

        {(phase === "ready" || phase === "listening") && (
          <div className="flex gap-2.5 mt-5 flex-wrap justify-center">
            <Btn onClick={toggleListen} disabled={wizard.audioUploading}>
              <Icon name={phase === "listening" ? "player-pause" : "headphones"} />{" "}
              {phase === "listening" ? "Ouvindo..." : "Ouvir"}
            </Btn>
            <Btn variant="primary" onClick={save} disabled={wizard.audioUploading}>
              <Icon name={wizard.audioUploading ? "loader-2" : "check"} />{" "}
              {wizard.audioUploading ? "Salvando..." : "Salvar e ir para o próximo"}
            </Btn>
            <Btn variant="ghost" onClick={resetRec} disabled={wizard.audioUploading}>
              Refazer
            </Btn>
          </div>
        )}

        {wizard.audioError && (
          <p className="text-[12.5px] text-[var(--gold)] max-w-[380px] mt-3 flex items-center gap-1.5">
            <Icon name="alert-triangle" /> {wizard.audioError}
          </p>
        )}

        {allDone && (
          <p className="font-mono text-xs text-[var(--text-2)] mt-5">Todos os roteiros foram gravados e salvos.</p>
        )}

        <div className="w-full max-w-[420px] mt-8 text-left flex flex-col gap-2">
          {slides.map((_, i) => {
            const isDone = wizard.savedTemas[i];
            const isUsed = wizard.usedTemas[i];
            const isCurrent = i === idx && !isDone;
            const isChecked = wizard.selectedForVideo.includes(i);
            const label = isUsed ? "já usado em vídeo" : isDone ? "salvo" : isCurrent ? "em andamento" : "pendente";
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] border-[0.5px] text-[13px] transition-all ${
                  isUsed
                    ? "opacity-45 border-[var(--line)] text-[var(--text-2)]"
                    : isDone
                      ? "border-[var(--teal)] text-[var(--text-1)] bg-[var(--bg-2)]"
                      : isCurrent
                        ? "border-[var(--gold)] text-[var(--text-1)] bg-[var(--bg-2)]"
                        : "border-[var(--line)] text-[var(--text-2)] bg-[var(--bg-2)]"
                }`}
              >
                {isDone && !isUsed ? (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => wizard.toggleSelectedForVideo(i)}
                    className="w-4 h-4 shrink-0 accent-[var(--gold)] cursor-pointer"
                  />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span
                  className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[11px] shrink-0 ${
                    isUsed
                      ? "bg-[var(--bg-3)] border-[var(--line-strong)] text-[var(--text-3)]"
                      : isDone
                        ? "bg-[var(--teal)] border-[var(--teal)] text-[#1a1a1a]"
                        : isCurrent
                          ? "border-[var(--gold)] text-transparent"
                          : "border-[var(--line-strong)] text-transparent"
                  }`}
                >
                  {isUsed ? <Icon name="lock" /> : isDone ? <Icon name="check" /> : null}
                </span>
                <span>
                  Tema {String(i + 1).padStart(2, "0")} · {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="w-full mt-8">
          <Btn variant="primary" onClick={() => router.push("/app/estilo")}>
            Continuar para Estilo <Icon name="arrow-right" />
          </Btn>
        </div>
      </div>
    </Card>
  );
}
