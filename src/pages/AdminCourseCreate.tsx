import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const steps = [
  {
    key: "info",
    title: "Informacoes",
    text: "Defina nome, subtitulo e descricao do curso.",
  },
  {
    key: "config",
    title: "Configuracao",
    text: "Defina instrutor, preco e status inicial.",
  },
  {
    key: "finish",
    title: "Finalizar",
    text: "Crie o produto e siga para o editor de modulos e aulas.",
  },
];

export default function AdminCourseCreate() {
  const { account } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [instructorName, setInstructorName] = useState("Victor Ferreira");
  const [priceLabel, setPriceLabel] = useState("R$ 0");
  const [eliteSortOrder, setEliteSortOrder] = useState("100");
  const [eliteReleaseDelayDays, setEliteReleaseDelayDays] = useState("0");
  const [status, setStatus] = useState<"published" | "draft">("draft");

  const createMutation = useMutation({
    mutationFn: () =>
      academyRepository.createCourse({
        title,
        subtitle,
        description,
        heroImage,
        instructorName,
        priceLabel,
        eliteSortOrder: Number(eliteSortOrder) || 100,
        eliteReleaseDelayDays: Math.max(0, Number(eliteReleaseDelayDays) || 0),
        status,
      }),
    onSuccess: (course) => {
      toast({
        title: "Curso criado",
        description: "Agora voce sera levado para o editor do curso.",
      });
      navigate(`/app/admin/produtos/${course.id}`);
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel criar o curso",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  const canAdvanceInfo = title.trim() && subtitle.trim() && description.trim();
  const canAdvanceConfig = instructorName.trim() && priceLabel.trim();

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" className="gap-2">
        <Link to="/app/admin/produtos">
          <ArrowLeft className="h-4 w-4" />
          Voltar para produtos
        </Link>
      </Button>

      <section className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-primary/65">Novo produto</p>
            <h1 className="mt-3 text-4xl text-slate-900">Crie um curso sem complicacao.</h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Em vez de um formulario gigante, o fluxo foi dividido em etapas simples para voce
              chegar logo ao editor.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.map((item, index) => (
              <div
                key={item.key}
                className={`rounded-2xl border p-4 ${
                  step === index
                    ? "border-primary bg-primary/5"
                    : step > index
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-border bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold shadow-sm">
                    {step > index ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {step === 0 ? (
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 1: Informacoes do curso</CardTitle>
            <CardDescription>
              O aluno vai ver esses dados na capa do produto e na navegacao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Nome do curso</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitulo</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-image">Imagem da capa</Label>
              <Input
                id="hero-image"
                value={heroImage}
                onChange={(event) => setHeroImage(event.target.value)}
                placeholder="https://sua-imagem.com/capa-do-curso.jpg"
              />
            </div>
            <div className="rounded-3xl border border-amber-200/60 bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] p-5">
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                <p className="text-sm leading-6 text-muted-foreground">
                  A capa vai aparecer no card do curso, no topo do player e nas vitrines do portal.
                </p>
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-slate-100">
                  {heroImage.trim() ? (
                    <div
                      className="h-36 bg-cover bg-center"
                      style={{ backgroundImage: `url(${heroImage})` }}
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                      Cole a URL da imagem para ver a prévia da capa.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={!canAdvanceInfo} onClick={() => setStep(1)} className="gap-2">
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Etapa 2: Configuracoes iniciais</CardTitle>
            <CardDescription>
              Isso ja deixa o produto pronto para continuar a montagem no editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instructor">Instrutor</Label>
                <Input
                  id="instructor"
                  value={instructorName}
                  onChange={(event) => setInstructorName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preco</Label>
                <Input
                  id="price"
                  value={priceLabel}
                  onChange={(event) => setPriceLabel(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="elite-order">Ordem no Acesso Elite</Label>
                <Input
                  id="elite-order"
                  type="number"
                  min="1"
                  value={eliteSortOrder}
                  onChange={(event) => setEliteSortOrder(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="elite-release-days">Liberar no Elite após quantos dias</Label>
                <Input
                  id="elite-release-days"
                  type="number"
                  min="0"
                  value={eliteReleaseDelayDays}
                  onChange={(event) => setEliteReleaseDelayDays(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status inicial</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as "published" | "draft")}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                Voltar
              </Button>
              <Button disabled={!canAdvanceConfig} onClick={() => setStep(2)} className="gap-2">
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <CardTitle>Etapa 3: Revisao final</CardTitle>
            </div>
            <CardDescription>
              O curso sera criado e voce vai direto para a tela de montar modulos e aulas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-secondary/40 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Curso</p>
                <p className="mt-2 text-xl font-semibold">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {heroImage.trim() ? "Capa personalizada configurada" : "Usando capa padrao"}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/40 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Config</p>
                <p className="mt-2 font-semibold">{instructorName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {priceLabel} · {status === "published" ? "Publicado" : "Rascunho"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 p-5 text-sm leading-7 text-muted-foreground">
              Assim que o curso for criado, o proximo passo e abrir o editor para adicionar modulos
              e aulas de video com links do Vimeo.
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Criando..." : "Criar curso e abrir editor"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
