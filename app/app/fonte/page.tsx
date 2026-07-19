"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useWizard, type SourceType } from "@/lib/wizard-context";
import { Btn, Card, Dropzone, FieldLabel, HelpTip, TextArea, TextInput } from "@/components/app/ui";

const SOURCES: { id: SourceType; icon: string; title: string; desc: string }[] = [
  { id: "ebook", icon: "file-text", title: "Upload de ebook", desc: "PDF ou texto próprio como base de conteúdo." },
  { id: "texto", icon: "edit", title: "Colar texto", desc: "Cole um trecho, ideia ou rascunho direto." },
  { id: "link", icon: "link", title: "Link externo", desc: "Um artigo, página ou post como referência." },
  { id: "youtube", icon: "brand-youtube", title: "Vídeo do YouTube", desc: "Extrai a transcrição como fonte de temas." },
  { id: "websearch", icon: "search", title: "Pesquisar na Web", desc: "Digite um tema e a IA pesquisa fontes por você." },
];

const SRC_ICON: Record<SourceType, string> = {
  ebook: "file-text",
  texto: "edit",
  link: "link",
  youtube: "brand-youtube",
  websearch: "search",
};

export default function FontePage() {
  const wizard = useWizard();
  const router = useRouter();
  const matched = wizard.matchedOwnImageIndices();
  const label = wizard.sourceLabel();

  return (
    <div>
      <Card>
        <h3 className="font-sans text-base font-semibold m-0 mb-1 text-[var(--text-1)] tracking-tight">
          Escolha a fonte de conteúdo
        </h3>
        <p className="text-[13px] text-[var(--text-2)] m-0 mb-6 leading-relaxed">
          O motor lê o material e extrai os temas que viram roteiros diários.
        </p>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => wizard.setSourceType(s.id)}
              className={`relative text-left border-[0.5px] rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-px ${
                wizard.sourceType === s.id
                  ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)]"
                  : "border-[var(--line)] hover:border-[var(--line-strong)]"
              } ${s.id === "websearch" ? "col-span-2 max-[720px]:col-span-1" : ""}`}
            >
              {wizard.sourceType === s.id && (
                <span className="absolute top-3.5 right-3.5 w-[18px] h-[18px] rounded-full bg-[var(--gold)] text-[#20200E] text-[11px] flex items-center justify-center font-semibold">
                  ✓
                </span>
              )}
              <Icon name={s.icon} className="text-xl text-[var(--gold)] mb-3 block" />
              <div className="text-[13px] font-medium text-[var(--text-1)] mb-0.5">{s.title}</div>
              <div className="text-xs text-[var(--text-3)] leading-relaxed">{s.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {wizard.sourceType === "ebook" && (
            <div>
              <FieldLabel htmlFor="ebook-upload">Arquivo (PDF, DOCX ou TXT)</FieldLabel>
              <Dropzone
                icon="cloud-upload"
                title={wizard.ebookFileName ?? "Clique para escolher ou arraste o arquivo aqui"}
                subtitle="PDF, DOCX ou TXT · até 20MB"
                accept=".pdf,.doc,.docx,.txt"
                onFiles={(files) => wizard.setEbookFileName(files[0]?.name ?? null)}
              />
            </div>
          )}
          {wizard.sourceType === "texto" && (
            <div>
              <FieldLabel htmlFor="texto-input">Texto de referência</FieldLabel>
              <TextArea
                id="texto-input"
                placeholder="Cole aqui um trecho, ideia ou rascunho para servir de base aos temas..."
                value={wizard.texto}
                onChange={(e) => wizard.setTexto(e.target.value)}
              />
            </div>
          )}
          {wizard.sourceType === "link" && (
            <div>
              <FieldLabel htmlFor="link-input">URL do artigo ou página</FieldLabel>
              <TextInput
                id="link-input"
                placeholder="https://exemplo.com/artigo"
                value={wizard.link}
                onChange={(e) => wizard.setLink(e.target.value)}
              />
            </div>
          )}
          {wizard.sourceType === "youtube" && (
            <div>
              <FieldLabel htmlFor="youtube-input">URL do vídeo do YouTube</FieldLabel>
              <TextInput
                id="youtube-input"
                placeholder="https://youtube.com/watch?v=..."
                value={wizard.youtube}
                onChange={(e) => wizard.setYoutube(e.target.value)}
              />
            </div>
          )}
          {wizard.sourceType === "websearch" && (
            <div>
              <FieldLabel htmlFor="websearch-input">Tema para pesquisar</FieldLabel>
              <TextInput
                id="websearch-input"
                placeholder="Ex: produtividade no trabalho remoto"
                value={wizard.websearch}
                onChange={(e) => wizard.setWebsearch(e.target.value)}
              />
              <p className="text-[13px] text-[var(--text-2)] mt-2 leading-relaxed">
                O POSTime pesquisa na web sobre esse tema, reúne as fontes mais relevantes e usa como base pros
                roteiros — sem você precisar colar nada.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t-[0.5px] border-[var(--line)]">
          <FieldLabel>
            Imagens próprias (opcional)
            <HelpTip
              label="Como funciona o encaixe automático"
              text={
                <>
                  O nome do arquivo é usado pra encaixar a imagem automaticamente. Se o roteiro menciona &quot;praia
                  de Copacabana&quot;, nomeie o arquivo como <strong>copacabana.jpg</strong> — o POSTime reconhece a
                  palavra e usa essa foto nesse trecho, em vez de buscar uma genérica nos bancos gratuitos.
                </>
              }
            />
          </FieldLabel>
          <p className="text-[13px] text-[var(--text-2)] mb-4 leading-relaxed">
            Suas próprias fotos, de lugares, pessoas ou produtos citados no roteiro. <strong>Aviso:</strong> nomeie o
            arquivo com a mesma palavra citada no roteiro — é assim que ele entra automaticamente na hora certa do
            vídeo.
          </p>
          <Dropzone
            icon="photo"
            title="Clique para escolher ou arraste as imagens aqui"
            subtitle="JPG, PNG ou WEBP · pode escolher várias · até 10MB cada"
            accept=".jpg,.jpeg,.png,.webp,image/*"
            multiple
            onFiles={(files) => wizard.addOwnImages(files)}
          />
          {wizard.ownImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {wizard.ownImages.map((img, idx) => (
                <div
                  key={img.url}
                  className={`flex items-center gap-2 bg-[var(--bg-2)] border-[0.5px] rounded-[9px] pl-1.5 pr-2 py-1.5 text-xs text-[var(--text-2)] max-w-[220px] ${
                    matched.has(idx) ? "border-[var(--teal)]" : "border-[var(--line)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-7 h-7 object-cover rounded-md shrink-0" />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]" title={img.name}>
                    {img.name}
                  </span>
                  {matched.has(idx) && (
                    <span className="text-[var(--teal)] text-[13px] shrink-0" title="Encaixado automaticamente no roteiro">
                      <Icon name="check" />
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={() => wizard.removeOwnImage(idx)}
                    className="shrink-0 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-sm leading-none flex hover:text-[var(--gold)]"
                  >
                    <Icon name="minus" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-3 mt-6">
          <span className="font-mono text-xs text-[var(--teal)] flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--teal)_8%,transparent)] border-[0.5px] border-[color-mix(in_srgb,var(--teal)_25%,transparent)] rounded-full px-3 py-1.5">
            <Icon name={SRC_ICON[wizard.sourceType]} /> {label ?? "nenhum arquivo selecionado"}
          </span>
          <div className="flex gap-1.5 items-center">
            <Btn onClick={wizard.clickAutoGenerate}>
              <Icon name="bolt" /> Gerar automático
            </Btn>
            <HelpTip
              label="O que Gerar automático faz"
              text='Roda o processo inteiro sozinho — roteiros, imagens, narração e montagem — e te leva direto pros vídeos prontos. Use "Extrair temas" se preferir revisar cada etapa manualmente.'
            />
            <Btn variant="primary" className="ml-1" onClick={() => router.push("/app/roteiros")}>
              Extrair temas <Icon name="arrow-right" />
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
