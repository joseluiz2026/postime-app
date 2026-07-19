"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, Dropzone, FieldLabel, ModalShell, TextInput } from "../ui";

const VOICES = [
  { name: "Aria", desc: "Feminina · Inglês (EUA)" },
  { name: "Bruno", desc: "Masculina · Português (BR)" },
  { name: "Sofia", desc: "Feminina · Português (BR)" },
  { name: "Diego", desc: "Masculina · Espanhol" },
  { name: "Clara", desc: "Feminina · Português (PT)" },
];

type Step = "key" | "choice" | "upload" | "library" | "done";

export function ElevenModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "eleven";
  const [step, setStep] = useState<Step>("key");
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);
  const [doneText, setDoneText] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (wizard.voiceCloned) {
        setStep("done");
      } else {
        setStep("key");
        setApiKey("");
        setKeyError(false);
        setVoiceFile(null);
        setCloning(false);
      }
    }
  }

  function finishClone(name: string, text: string) {
    wizard.connectEleven(name);
    setDoneText(text);
    setStep("done");
  }

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="plug" title="Conectar sua conta ElevenLabs">
      {step === "key" && (
        <div>
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
            Cole sua chave de API da ElevenLabs (Profile → API Keys, na conta pessoal dela). Ela fica guardada com
            segurança e só é usada pra narrar com a sua voz clonada.
          </p>
          <FieldLabel htmlFor="elevenApiKey">Chave de API</FieldLabel>
          <TextInput
            id="elevenApiKey"
            placeholder={keyError ? "Cole sua chave antes de continuar" : "sk_..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={keyError ? { borderColor: "var(--gold)" } : undefined}
          />
          <div className="mt-4">
            <Btn
              variant="primary"
              onClick={() => {
                if (!apiKey.trim()) {
                  setKeyError(true);
                  return;
                }
                setStep("choice");
              }}
            >
              <Icon name="check" /> Validar chave
            </Btn>
          </div>
        </div>
      )}

      {step === "choice" && (
        <div>
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
            Chave validada. Como você quer narrar seus vídeos?
          </p>
          <div className="flex flex-col gap-2.5">
            <Btn variant="primary" onClick={() => setStep("upload")}>
              <Icon name="microphone-2" /> Clonar minha voz
            </Btn>
            <Btn onClick={() => setStep("library")}>
              <Icon name="library" /> Escolher da biblioteca gratuita
            </Btn>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div>
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
            Envie uma amostra da sua voz (1 a 5 minutos, áudio limpo, pouco ruído de fundo).
          </p>
          <Dropzone
            icon="microphone-2"
            title={voiceFile ? voiceFile.name : "Clique para escolher ou arraste o áudio aqui"}
            subtitle={voiceFile ? `${(voiceFile.size / 1024 / 1024).toFixed(1)} MB · clique para trocar` : "MP3 ou WAV · 1 a 5 minutos"}
            accept=".mp3,.wav,audio/*"
            onFiles={(files) => setVoiceFile(files[0])}
          />
          <div className="mt-4">
            <Btn
              variant="primary"
              disabled={!voiceFile || cloning}
              onClick={() => {
                setCloning(true);
                setTimeout(() => {
                  finishClone(
                    "",
                    "Voz clonada com sucesso! A partir de agora ela fica disponível pra narrar seus vídeos automaticamente.",
                  );
                }, 1800);
              }}
            >
              {cloning ? <Icon name="loader-2" spin /> : <Icon name="sparkles" />} {cloning ? "Clonando..." : "Clonar minha voz"}
            </Btn>
          </div>
        </div>
      )}

      {step === "library" && (
        <div>
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
            Vozes prontas da biblioteca gratuita da ElevenLabs — sem precisar de plano pago na conta dela.
          </p>
          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
            {VOICES.map((v) => (
              <button
                key={v.name}
                onClick={() =>
                  finishClone(
                    v.name,
                    `Voz "${v.name}" conectada com sucesso! Ela já fica disponível pra narrar seus vídeos, sem custo na conta ElevenLabs.`,
                  )
                }
                className="flex items-center justify-between w-full px-3.5 py-3 border-[0.5px] border-[var(--line)] rounded-[10px] bg-[var(--bg-2)] cursor-pointer transition-all text-left font-sans hover:border-[var(--gold)]"
              >
                <span>
                  <span className="block text-[13.5px] font-medium text-[var(--text-1)]">{v.name}</span>
                  <span className="block text-[11.5px] text-[var(--text-3)] mt-0.5">{v.desc}</span>
                </span>
                <span className="text-xs text-[var(--gold)] shrink-0">Usar</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="text-center">
          <Icon name="circle-check" className="text-[40px] text-[var(--teal)] block mb-3" />
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
            {doneText ||
              (wizard.selectedVoiceName
                ? `Voz "${wizard.selectedVoiceName}" conectada com sucesso!`
                : "Voz clonada com sucesso! A partir de agora ela fica disponível pra narrar seus vídeos automaticamente.")}
          </p>
          <Btn variant="primary" onClick={wizard.closeModal}>
            Concluir
          </Btn>
        </div>
      )}
    </ModalShell>
  );
}
