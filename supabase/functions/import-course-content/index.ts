import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type LessonSeed = {
  title: string;
  url: string;
  summary?: string;
};

type ModuleSeed = {
  title: string;
  description: string;
  lessons: LessonSeed[];
};

type ResourceSeed = {
  title: string;
  description: string;
  kind: "pdf" | "indicador" | "planilha" | "bonus";
  fileUrl: string;
};

type CourseSeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  instructorName: string;
  durationLabel: string;
  supportLabel: string;
  accessDurationDays: number;
  priceLabel: string;
  eliteSortOrder?: number;
  eliteReleaseDelayDays?: number;
  status: "published" | "draft";
  linkTitle: string;
  linkDescription: string;
  modules: ModuleSeed[];
  resources: ResourceSeed[];
};

const aulaMestreModules: ModuleSeed[] = [
  {
    title: "Aula Mestre",
    description: "Passo a passo para o aluno entender a estrutura, os cursos e a melhor forma de consumir a plataforma.",
    lessons: [
      {
        title: "Como navegar pela plataforma",
        url: "https://vimeo.com/1175219673?fl=pl&fe=cm",
        summary:
          "Aula obrigatoria de entrada para mostrar o passo a passo da plataforma, a ordem ideal de consumo e como aproveitar o Acesso Elite.",
      },
    ],
  },
];

const fluxoSimplificadoModules: ModuleSeed[] = [
  {
    title: "01 - Introdução ao Fluxo - Método Speed Flow",
    description: "Base introdutória do método Speed Flow com os conceitos iniciais da trilha.",
    lessons: [
      { title: "Aula 1 - Entendendo sua caminhada", url: "https://vimeo.com/1008207614?share=copy#t=0" },
      { title: "Aula 2 - O que é o Fluxo?", url: "https://vimeo.com/1008207810?share=copy#t=0" },
      { title: "Aula 3 - Intenção - Seja um mestre da análise", url: "https://vimeo.com/1008208502?share=copy#t=0" },
      { title: "Aula 4 - Dominância", url: "https://vimeo.com/1008209143?share=copy#t=0" },
      { title: "Aula 5 - True points", url: "https://vimeo.com/1008209624?share=copy#t=0" },
      { title: "Aula 6 - Fluxo Macro", url: "https://vimeo.com/1008212740?share=copy#t=0" },
      { title: "Aula 7 - Viés", url: "https://vimeo.com/1008212968?share=copy#t=0" },
      { title: "Aula 8 - Day Trade", url: "https://vimeo.com/1008210931?share=copy#t=0" },
      { title: "Aula 9 - Eficiência", url: "https://vimeo.com/1008212275?share=copy#t=0" },
      { title: "Aula 10 - Truques operacionais", url: "https://vimeo.com/1008214290?share=copy#t=0" },
    ],
  },
  {
    title: "02 - Entenda o Jogo - A Base do fluxo real",
    description: "Leitura do jogo e das chaves operacionais para interpretar o fluxo real.",
    lessons: [
      { title: "Aula 1 - Boas-vindas!", url: "https://vimeo.com/927741228?share=copy#t=0" },
      { title: "Aula 2 - Chave 1 - Equilíbrio do Fluxo", url: "https://vimeo.com/849565397" },
      { title: "Aula 3 - Chave 2 - Atenção", url: "https://vimeo.com/852126736" },
      { title: "Aula 4 - Chave 3 - Trade Regions e True Points", url: "https://vimeo.com/849572255" },
    ],
  },
  {
    title: "03 - Raio X da mente institucional",
    description: "Análise do comportamento institucional, volume e práticas avançadas.",
    lessons: [
      { title: "Aula 1 - Como eles te manipulam", url: "https://vimeo.com/852483830" },
      { title: "Aula 2 - A Teoria institucional - O olhar do tubarão", url: "https://vimeo.com/850999466" },
      { title: "Aula 3 - Raio X do Volume", url: "https://vimeo.com/851001954" },
      { title: "Aula 4 - Prática avançada 1", url: "https://vimeo.com/851003590" },
      { title: "Aula 5 - Prática avançada 2", url: "https://vimeo.com/851008130" },
      { title: "Aula 6 - Prática avançada 3", url: "https://vimeo.com/852479368" },
    ],
  },
  {
    title: "04 - Estrutura avançada de Fluxo",
    description: "Estrutura de mercado e fundamentos do fluxo real aplicados no contexto operacional.",
    lessons: [
      { title: "Aula 1 - O Fluxo Real", url: "https://vimeo.com/900920474" },
      { title: "Aula 2 - Os pilares do Fluxo Real", url: "https://vimeo.com/900920993" },
      { title: "Aula 3 - Estrutura dinâmica do mercado", url: "https://vimeo.com/900921728" },
      { title: "Aula 4 - Fluxo na prática", url: "https://vimeo.com/900921975" },
    ],
  },
  {
    title: "05 - Sistema de operação 1.0",
    description: "Sistema operacional, checklists, rotina diária e aulas ao vivo de prática.",
    lessons: [
      { title: "Aula 1 - O sistema à prova de erros", url: "https://vimeo.com/852867430" },
      { title: "Aula 2 - Juntando as peças", url: "https://vimeo.com/852925336" },
      { title: "Aula 3 - Como começar o dia", url: "https://vimeo.com/853088993" },
      { title: "Aula 4 - Check List", url: "https://vimeo.com/853123369" },
      { title: "Aula 5 - De volta à base", url: "https://vimeo.com/853173297" },
      { title: "Aula 6 - Dominando a volatilidade", url: "https://vimeo.com/891520441" },
      { title: "Aula 7 - Na prática 1 - Aula ao vivo", url: "https://vimeo.com/851055293" },
      { title: "Aula 8 - Na prática 2 - Aula ao vivo", url: "https://vimeo.com/851058790" },
      { title: "Aula 9 - Na prática 3 - Aula ao vivo", url: "https://vimeo.com/851072834" },
      { title: "Aula 10 - É hora do show", url: "https://vimeo.com/927739315" },
    ],
  },
  {
    title: "06 - Otimização Operacional obrigatória",
    description: "Rotina de backtesting, laboratório operacional e otimização do fluxo.",
    lessons: [
      { title: "Aula 1 - Backtesting 1.0 - Planilha anexada na aula", url: "https://vimeo.com/962435610?share=copy" },
      { title: "Aula 3 - Otimização do Fluxo", url: "https://vimeo.com/1000931498?share=copy#t=0" },
    ],
  },
  {
    title: "07 - O Grande Blefe do mercado - VOL+",
    description: "Conceito de VOL+ e aplicação prática do método.",
    lessons: [
      { title: "Aula 1 - O conceito de VOL+", url: "https://vimeo.com/853189551?share=copy" },
      { title: "Aula 2 - VOL+ na Prática", url: "https://youtu.be/Cw1VbiOofyw" },
    ],
  },
  {
    title: "09 - Revisão Operacional e Estrutura",
    description: "Revisão dos conceitos operacionais, estrutura e leitura de OBV.",
    lessons: [
      { title: "Aula 1 - Revisão Operacional", url: "https://vimeo.com/1071535010?share=copy" },
      { title: "Aula 2 - Revisão de Estrutura", url: "https://vimeo.com/1071535788?share=copy" },
      { title: "Aula 3 - Estrutura no OBV", url: "https://vimeo.com/1115322210?share=copy" },
    ],
  },
];

const smartFlowModules: ModuleSeed[] = [
  {
    title: "SMART FLOW",
    description: "Módulo com estratégias, estruturas, sinais e operacional completo do Smart Flow.",
    lessons: [
      { title: "Aula 1 - A Base do Preço Justo", url: "https://vimeo.com/1140875314?share=copy&fl=sv&fe=ci" },
      { title: "Aula 2 - Flip na Prática", url: "https://vimeo.com/1140875455?share=copy&fl=sv&fe=ci" },
      { title: "Aula 3 - O Grande Truque - Dominando as Estruturas", url: "https://vimeo.com/1140876083?share=copy&fl=sv&fe=ci" },
      { title: "Aula 4 - Diversificar é Sobreviver", url: "https://vimeo.com/1140876347?share=copy&fl=sv&fe=ci" },
      { title: "Aula 5 - Forex - Indicadores Bônus + Black Arrow Gratuito + 100% bônus primeiro depósito", url: "https://vimeo.com/1140876347?share=copy&fl=sv&fe=ci" },
      { title: "Aula 6 - Gatilho - Smart Signal", url: "https://vimeo.com/1140878491?share=copy&fl=sv&fe=ci" },
      { title: "Aula 7 - Ajuste fino do sinal - Evitando ruídos", url: "https://vimeo.com/1140876475?share=copy&fl=sv&fe=ci" },
      { title: "Aula 8 - Operacional Completo", url: "https://vimeo.com/1140876534?share=copy&fl=sv&fe=ci" },
      { title: "Aula 9 - Diminuindo Ainda Mais os Stops - O Filtro Salva Vidas", url: "https://vimeo.com/1140876944?share=copy&fl=sv&fe=ci" },
      { title: "Aula 10 - Deixando tudo no piloto automático - Indicador de Screening", url: "https://vimeo.com/1137034864?share=copy&fl=sv&fe=ci" },
      { title: "Aula 11 - Bônus - Surfando a tendência do jeito certo + Reforço operacional + Indicador", url: "https://vimeo.com/1140877063?share=copy&fl=sv&fe=ci" },
      { title: "Aula 12 - Setup Momentum Zero", url: "https://vimeo.com/1140907549?share=copy&fl=sv&fe=ci" },
    ],
  },
];

const contextoAvancadoModules: ModuleSeed[] = [
  {
    title: "CONTEXTO AVANÇADO DE MERCADO",
    description: "Módulo com preço justo, flip, forex, estrutura, alvos, book, OBV e leitura de agressão.",
    lessons: [
      { title: "Aula 1 - Preço Justo", url: "https://vimeo.com/1130329990?share=copy&fl=sv&fe=ci" },
      { title: "Aula 2 - Flip + Forex", url: "https://vimeo.com/1130329553?share=copy&fl=sv&fe=ci" },
      { title: "Aula 3 - Estrutura e alvos", url: "https://vimeo.com/1130319547?share=copy&fl=sv&fe=ci" },
      { title: "Aula 4 - Leitura de BOOK + Estrutura OBV", url: "https://vimeo.com/1130321023?share=copy&fl=sv&fe=ci" },
      { title: "Aula 5 - Analisando regiões de flip com saldo de agressão", url: "https://www.youtube.com/watch?v=QsmP0f3EqRA" },
    ],
  },
];

const fluxoSmartMoneyModules: ModuleSeed[] = [
  {
    title: "12 - Fluxo Smart Money",
    description: "Módulo com leitura SMC e práticas avançadas aplicadas ao Smart Money.",
    lessons: [
      { title: "Aula 1 - Dominando o SMC", url: "https://vimeo.com/925597889?share=copy" },
      { title: "Aula 2 - Prática avançada 1", url: "https://vimeo.com/925599229?share=copy" },
      { title: "Aula 3 - Prática avançada 2", url: "https://vimeo.com/925599028?share=copy" },
      { title: "Aula 4 - Prática avançada 3", url: "https://vimeo.com/925598806?share=copy" },
    ],
  },
];

const menteBlindadaModules: ModuleSeed[] = [
  {
    title: "Master Class - mente Blindada: Psicologia Avançada de Mercado",
    description: "Master class focada em psicologia avançada de mercado e mente blindada para execução.",
    lessons: [
      {
        title: "Master Class - mente Blindada: Psicologia Avançada de Mercado",
        url: "https://youtu.be/18QzfyyHKXo",
      },
    ],
  },
];

const entendendoIndicadoresModules: ModuleSeed[] = [
  {
    title: "Entendendo os Indicadores",
    description: "Módulo com os principais indicadores da operação e regras práticas de configuração visual.",
    lessons: [
      { title: "Aula 1 - Volat / Cloud / Juros / OBV", url: "https://vimeo.com/1018382983?share=copy#t=0" },
      { title: "Aula 2 - FluxoV6 / LT / MAG/ Radar", url: "https://vimeo.com/1018389970?share=copy#t=0" },
      { title: "Aula 3 - Alarmes e regras de coloração do 1.0", url: "https://vimeo.com/1025511426?share=copy#t=0" },
    ],
  },
];

const protocolo5CModules: ModuleSeed[] = [
  {
    title: "Protocolo 5C Trades Rápidos e Lucrativos",
    description: "Trilha objetiva com o passo inicial, leitura de momentum, conceitos centrais e otimização operacional.",
    lessons: [
      { title: "Comece por aqui", url: "https://vimeo.com/1173050957?fl=pl&fe=cm" },
      { title: "MAG o momentum", url: "https://vimeo.com/1173053942?fl=pl&fe=cm" },
      { title: "Conceitos importantes", url: "https://vimeo.com/1173051798?fl=pl&fe=cm" },
      { title: "Otimização Operacional", url: "https://youtu.be/HaB7OBHaXOs" },
    ],
  },
];

const courseSeeds: CourseSeed[] = [
  {
    slug: "aula-mestre-acesso-elite",
    title: "Aula Mestre",
    subtitle: "Como navegar pela estrutura do Acesso Elite e aproveitar a plataforma do jeito certo.",
    description:
      "Aula obrigatoria de boas-vindas para mostrar ao aluno como usar a area de membros, encontrar os cursos, seguir a trilha e aproveitar melhor a estrutura do Acesso Elite.",
    heroImage:
      "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Primeiro passo do Elite",
    supportLabel: "Obrigatoria antes dos demais cursos",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    eliteSortOrder: 0,
    eliteReleaseDelayDays: 0,
    status: "published",
    linkTitle: "Aula Mestre do Acesso Elite",
    linkDescription: "Curso interno e obrigatorio do Acesso Elite para apresentar a estrutura da plataforma.",
    modules: aulaMestreModules,
    resources: [],
  },
  {
    slug: "fluxo-simplificado-3-0",
    title: "Fluxo Simplificado 3.0",
    subtitle: "Método Speed Flow, leitura de fluxo real e sistema operacional aplicado.",
    description:
      "Curso migrado do Tutor LMS com trilha estruturada sobre fluxo, mente institucional, estrutura de mercado e operação prática. O conteúdo foi organizado em módulos com videoaulas, links externos e materiais de apoio.",
    heroImage:
      "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80",
    instructorName: "Victor Ferreira",
    durationLabel: "Trilha completa em módulos",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Migrado do WordPress",
    status: "published",
    linkTitle: "Cadastro Fluxo Simplificado 3.0",
    linkDescription: "Link público de cadastro para o curso migrado do WordPress.",
    modules: fluxoSimplificadoModules,
    resources: [
      {
        title: "Planilha Backtesting 1.0",
        description: "Planilha de apoio da Aula 1 do módulo 06 - Otimização Operacional obrigatória.",
        kind: "planilha",
        fileUrl:
          "https://docs.google.com/spreadsheets/d/10ROBusRjQg3XQoNpWz68ZBlYnlPMcMAIoiypjpQLYdI/edit?gid=378195164#gid=378195164",
      },
    ],
  },
  {
    slug: "smart-flow",
    title: "SMART FLOW",
    subtitle: "Preço justo, estruturas, sinais, screening e operacional completo.",
    description:
      "Curso com foco em leitura de preço justo, flip, estruturas, sinais, filtros, operacional completo e setup Momentum Zero.",
    heroImage:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Trilha Smart Flow",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    status: "published",
    linkTitle: "Cadastro Smart Flow",
    linkDescription: "Link público de cadastro para o curso Smart Flow.",
    modules: smartFlowModules,
    resources: [],
  },
  {
    slug: "contexto-avancado-de-mercado",
    title: "CONTEXTO AVANÇADO DE MERCADO",
    subtitle: "Preço justo, flip, forex, estrutura, OBV e leitura de agressão.",
    description:
      "Curso focado em contexto avançado de mercado, leitura de estrutura, regiões de flip, book, OBV e análise prática de agressão.",
    heroImage:
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Trilha Contexto Avançado",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    status: "published",
    linkTitle: "Cadastro Contexto Avançado de Mercado",
    linkDescription: "Link público de cadastro para o curso Contexto Avançado de Mercado.",
    modules: contextoAvancadoModules,
    resources: [],
  },
  {
    slug: "fluxo-smart-money",
    title: "Fluxo Smart Money",
    subtitle: "SMC, leitura institucional e práticas avançadas.",
    description:
      "Curso focado em Smart Money Concepts, leitura institucional e prática avançada para interpretar contexto e execução com mais precisão.",
    heroImage:
      "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Trilha Smart Money",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    status: "published",
    linkTitle: "Cadastro Fluxo Smart Money",
    linkDescription: "Link público de cadastro para o curso Fluxo Smart Money.",
    modules: fluxoSmartMoneyModules,
    resources: [],
  },
  {
    slug: "master-class-mente-blindada",
    title: "Master Class - mente Blindada: Psicologia Avançada de Mercado",
    subtitle: "Psicologia avançada, disciplina e leitura emocional aplicada ao mercado.",
    description:
      "Master class dedicada à mente blindada no mercado, com foco em psicologia avançada, disciplina operacional e fortalecimento da tomada de decisão.",
    heroImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Master class",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    status: "published",
    linkTitle: "Cadastro Master Class - Mente Blindada",
    linkDescription: "Link público de cadastro para a master class Mente Blindada.",
    modules: menteBlindadaModules,
    resources: [],
  },
  {
    slug: "entendendo-os-indicadores",
    title: "Entendendo os Indicadores",
    subtitle: "Volat, Cloud, Juros, OBV, FluxoV6, LT, MAG, Radar e regras de coloração.",
    description:
      "Curso focado em entender os principais indicadores da operação, com leitura objetiva, configuração visual e uso prático no dia a dia.",
    heroImage:
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Trilha de indicadores",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    status: "published",
    linkTitle: "Cadastro Entendendo os Indicadores",
    linkDescription: "Link público de cadastro para o curso Entendendo os Indicadores.",
    modules: entendendoIndicadoresModules,
    resources: [],
  },
  {
    slug: "protocolo-5c-trades-rapidos-e-lucrativos",
    title: "Protocolo 5C Trades Rápidos e Lucrativos",
    subtitle: "Momentum, conceitos essenciais e otimização operacional aplicada.",
    description:
      "Curso direto ao ponto com a estrutura do Protocolo 5C, leitura de momentum, fundamentos importantes e otimização operacional.",
    heroImage:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
    instructorName: "Victor Garcia",
    durationLabel: "Trilha Protocolo 5C",
    supportLabel: "Acesso por 12 meses",
    accessDurationDays: 365,
    priceLabel: "Acesso Elite",
    status: "published",
    linkTitle: "Cadastro Protocolo 5C",
    linkDescription: "Link público de cadastro para o curso Protocolo 5C Trades Rápidos e Lucrativos.",
    modules: protocolo5CModules,
    resources: [],
  },
];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function syncCourseToEliteEnrollments(
  adminClient: ReturnType<typeof createClient>,
  courseId: string,
  courseSlug: string,
  courseStatus: "published" | "draft",
) {
  if (courseStatus !== "published" || courseSlug === "acesso-elite-bundle") {
    return;
  }

  const enrollmentsResult = await adminClient
    .from("enrollments")
    .select("id, student_id, course_id, granted_at, expires_at, source_slug, status")
    .eq("source_slug", "acesso-elite")
    .eq("status", "active");

  if (enrollmentsResult.error) {
    throw enrollmentsResult.error;
  }

  const eliteAnchors = new Map<
    string,
    {
      studentId: string;
      grantedAt: string;
      expiresAt: string;
    }
  >();

  for (const enrollment of enrollmentsResult.data ?? []) {
    const current = eliteAnchors.get(enrollment.student_id);
    if (!current || new Date(enrollment.expires_at).getTime() > new Date(current.expiresAt).getTime()) {
      eliteAnchors.set(enrollment.student_id, {
        studentId: enrollment.student_id,
        grantedAt: enrollment.granted_at,
        expiresAt: enrollment.expires_at,
      });
    }
  }

  const existingCourseEnrollments = new Set(
    (enrollmentsResult.data ?? [])
      .filter((enrollment) => enrollment.course_id === courseId)
      .map((enrollment) => enrollment.student_id),
  );

  for (const anchor of eliteAnchors.values()) {
    if (existingCourseEnrollments.has(anchor.studentId)) {
      continue;
    }

    const insertEnrollment = await adminClient.from("enrollments").insert({
      course_id: courseId,
      student_id: anchor.studentId,
      granted_at: anchor.grantedAt,
      expires_at: anchor.expiresAt,
      source_slug: "acesso-elite",
      status: "active",
    });

    if (insertEnrollment.error) {
      throw insertEnrollment.error;
    }
  }
}

async function importCourse(adminClient: ReturnType<typeof createClient>, courseSeed: CourseSeed) {
  const existingCourseResult = await adminClient
    .from("courses")
    .select("id")
    .eq("slug", courseSeed.slug)
    .maybeSingle();

  if (existingCourseResult.error) {
    throw existingCourseResult.error;
  }

  let courseId = existingCourseResult.data?.id ?? null;

  if (courseId) {
    const existingModules = await adminClient
      .from("course_modules")
      .select("id")
      .eq("course_id", courseId);

    if (existingModules.error) {
      throw existingModules.error;
    }

    const moduleIds = (existingModules.data ?? []).map((item) => item.id);

    if (moduleIds.length > 0) {
      const deleteLessons = await adminClient
        .from("course_lessons")
        .delete()
        .in("module_id", moduleIds);

      if (deleteLessons.error) {
        throw deleteLessons.error;
      }
    }

    const deleteModules = await adminClient
      .from("course_modules")
      .delete()
      .eq("course_id", courseId);

    if (deleteModules.error) {
      throw deleteModules.error;
    }

    const deleteResources = await adminClient
      .from("course_resources")
      .delete()
      .eq("course_id", courseId);

    if (deleteResources.error) {
      throw deleteResources.error;
    }

    const updateCourse = await adminClient
      .from("courses")
      .update({
        title: courseSeed.title,
        subtitle: courseSeed.subtitle,
        description: courseSeed.description,
        hero_image: courseSeed.heroImage,
        instructor_name: courseSeed.instructorName,
        duration_label: courseSeed.durationLabel,
        support_label: courseSeed.supportLabel,
        access_duration_days: courseSeed.accessDurationDays,
        price_label: courseSeed.priceLabel,
        elite_sort_order: courseSeed.eliteSortOrder ?? 100,
        elite_release_delay_days: courseSeed.eliteReleaseDelayDays ?? 0,
        status: courseSeed.status,
      })
      .eq("id", courseId);

    if (updateCourse.error) {
      throw updateCourse.error;
    }
  } else {
    const insertCourse = await adminClient
      .from("courses")
      .insert({
        slug: courseSeed.slug,
        title: courseSeed.title,
        subtitle: courseSeed.subtitle,
        description: courseSeed.description,
        hero_image: courseSeed.heroImage,
        instructor_name: courseSeed.instructorName,
        duration_label: courseSeed.durationLabel,
        support_label: courseSeed.supportLabel,
        access_duration_days: courseSeed.accessDurationDays,
        price_label: courseSeed.priceLabel,
        elite_sort_order: courseSeed.eliteSortOrder ?? 100,
        elite_release_delay_days: courseSeed.eliteReleaseDelayDays ?? 0,
        status: courseSeed.status,
      })
      .select("id")
      .single();

    if (insertCourse.error) {
      throw insertCourse.error;
    }

    courseId = insertCourse.data.id;
  }

  for (const [moduleIndex, moduleSeed] of courseSeed.modules.entries()) {
    const moduleInsert = await adminClient
      .from("course_modules")
      .insert({
        course_id: courseId,
        title: moduleSeed.title,
        description: moduleSeed.description,
        module_order: moduleIndex + 1,
      })
      .select("id")
      .single();

    if (moduleInsert.error) {
      throw moduleInsert.error;
    }

    for (const [lessonIndex, lessonSeed] of moduleSeed.lessons.entries()) {
      const lessonInsert = await adminClient
        .from("course_lessons")
        .insert({
          module_id: moduleInsert.data.id,
          title: lessonSeed.title,
          summary: lessonSeed.summary ?? "",
          duration_label: "Vídeo",
          lesson_order: lessonIndex + 1,
          vimeo_url: lessonSeed.url,
        });

      if (lessonInsert.error) {
        throw lessonInsert.error;
      }
    }
  }

  for (const resourceSeed of courseSeed.resources) {
    const resourceInsert = await adminClient
      .from("course_resources")
      .insert({
        course_id: courseId,
        title: resourceSeed.title,
        description: resourceSeed.description,
        kind: resourceSeed.kind,
        file_url: resourceSeed.fileUrl,
      });

    if (resourceInsert.error) {
      throw resourceInsert.error;
    }
  }

  const linkSlug = slugify(`${courseSeed.slug}-cadastro`);
  const existingLink = await adminClient
    .from("enrollment_links")
    .select("id")
    .eq("slug", linkSlug)
    .maybeSingle();

  if (existingLink.error) {
    throw existingLink.error;
  }

  if (existingLink.data) {
    const updateLink = await adminClient
      .from("enrollment_links")
      .update({
        course_id: courseId,
        title: courseSeed.linkTitle,
        description: courseSeed.linkDescription,
        is_active: true,
      })
      .eq("id", existingLink.data.id);

    if (updateLink.error) {
      throw updateLink.error;
    }
  } else {
    const linkInsert = await adminClient
      .from("enrollment_links")
      .insert({
        course_id: courseId,
        slug: linkSlug,
        title: courseSeed.linkTitle,
        description: courseSeed.linkDescription,
        is_active: true,
      });

    if (linkInsert.error) {
      throw linkInsert.error;
    }
  }

  await syncCourseToEliteEnrollments(
    adminClient,
    courseId,
    courseSeed.slug,
    courseSeed.status,
  );

  return {
    courseId,
    slug: courseSeed.slug,
    title: courseSeed.title,
    modulesImported: courseSeed.modules.length,
    lessonsImported: courseSeed.modules.reduce((total, moduleSeed) => total + moduleSeed.lessons.length, 0),
    resourcesImported: courseSeed.resources.length,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Variáveis do Supabase não configuradas na função.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = await request.json().catch(() => ({}));
    const requestedSlug =
      typeof body?.slug === "string" && body.slug.trim().length > 0 ? body.slug.trim() : null;

    const seedsToImport = requestedSlug
      ? courseSeeds.filter((courseSeed) => courseSeed.slug === requestedSlug)
      : courseSeeds;

    if (seedsToImport.length === 0) {
      throw new Error("Nenhum curso encontrado para importação.");
    }

    const imported = [];

    for (const courseSeed of seedsToImport) {
      imported.push(await importCourse(adminClient, courseSeed));
    }

    return jsonResponse({
      success: true,
      imported,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, 400);
  }
});
