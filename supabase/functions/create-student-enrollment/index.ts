import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type EnrollmentPayload = {
  slug?: string;
  fullName?: string;
  email?: string;
  whatsapp?: string;
  notes?: string | null;
  password?: string;
};

const ELITE_LINK_SLUG = "acesso-elite";
const ELITE_COURSE_SLUG = "acesso-elite-bundle";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "msg" in error && typeof error.msg === "string"
          ? error.msg
          : null;

    if (maybeMessage) {
      return maybeMessage;
    }

    return JSON.stringify(error);
  }

  return "Erro inesperado.";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureEliteEnrollmentLink(
  adminClient: ReturnType<typeof createClient>,
) {
  const existingLink = await adminClient
    .from("enrollment_links")
    .select("id, course_id")
    .eq("slug", ELITE_LINK_SLUG)
    .eq("is_active", true)
    .maybeSingle();

  if (existingLink.error) {
    throw new Error(`Falha ao localizar o Acesso Elite: ${getErrorMessage(existingLink.error)}`);
  }

  if (existingLink.data) {
    return existingLink.data;
  }

  const existingCourse = await adminClient
    .from("courses")
    .select("id")
    .eq("slug", ELITE_COURSE_SLUG)
    .maybeSingle();

  if (existingCourse.error) {
    throw new Error(`Falha ao localizar o curso Elite: ${getErrorMessage(existingCourse.error)}`);
  }

  let eliteCourseId = existingCourse.data?.id ?? null;

  if (!eliteCourseId) {
    const createdCourse = await adminClient
      .from("courses")
      .insert({
        slug: ELITE_COURSE_SLUG,
        title: "Acesso Elite",
        subtitle: "Todos os cursos publicados em um unico acesso.",
        description: "Bundle interno usado para liberar todos os cursos publicados da plataforma.",
        hero_image:
          "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
        instructor_name: "Victor Ferreira",
        duration_label: "Acesso multicurso",
        support_label: "3 meses, 6 meses ou 1 ano",
        access_duration_days: 365,
        price_label: "Acesso especial",
        status: "draft",
      })
      .select("id")
      .single();

    if (createdCourse.error) {
      throw new Error(`Falha ao criar o curso Elite: ${getErrorMessage(createdCourse.error)}`);
    }

    eliteCourseId = createdCourse.data.id;
  }

  const createdLink = await adminClient
    .from("enrollment_links")
    .insert({
      course_id: eliteCourseId,
      slug: ELITE_LINK_SLUG,
      title: "Acesso Elite",
      description: "Cadastro especial para liberar todos os cursos publicados.",
      is_active: true,
    })
    .select("id, course_id")
    .single();

  if (createdLink.error) {
    throw new Error(`Falha ao criar o link Elite: ${getErrorMessage(createdLink.error)}`);
  }

  return createdLink.data;
}

async function findAuthUserIdByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;

  while (page <= 10) {
    const result = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (result.error) {
      throw result.error;
    }

    const matched = result.data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );

    if (matched) {
      return matched.id;
    }

    if (result.data.users.length < 100) {
      break;
    }

    page += 1;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido." }, 405);
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Variaveis do Supabase nao configuradas na funcao.");
    }

    const payload = (await request.json()) as EnrollmentPayload;

    if (!payload.slug || !payload.fullName || !payload.email || !payload.whatsapp || !payload.password) {
      return jsonResponse({ error: "Preencha todos os campos obrigatorios." }, 400);
    }

    if (payload.password.trim().length < 6) {
      return jsonResponse({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const email = normalizeEmail(payload.email);

    const linkResult =
      payload.slug === ELITE_LINK_SLUG
        ? { data: await ensureEliteEnrollmentLink(adminClient), error: null }
        : await adminClient
            .from("enrollment_links")
            .select("id, course_id")
            .eq("slug", payload.slug)
            .eq("is_active", true)
            .maybeSingle();

    if (linkResult.error) {
      throw new Error(`Falha ao localizar o link: ${getErrorMessage(linkResult.error)}`);
    }

    if (!linkResult.data) {
      return jsonResponse({ error: "Link de cadastro nao encontrado." }, 404);
    }

    const pendingRequestResult = await adminClient
      .from("enrollment_requests")
      .select("id")
      .eq("course_id", linkResult.data.course_id)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRequestResult.error) {
      throw new Error(
        `Falha ao verificar solicitacoes pendentes: ${getErrorMessage(pendingRequestResult.error)}`,
      );
    }

    let accountCreated = false;
    let authUserId: string | null = null;

    const createUserResult = await adminClient.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
      },
    });

    if (createUserResult.error) {
      const duplicateUser =
        /already exists|already been registered|registered/i.test(
          getErrorMessage(createUserResult.error),
        );

      if (!duplicateUser) {
        throw new Error(`Falha ao criar o login no Auth: ${getErrorMessage(createUserResult.error)}`);
      }

      authUserId = await findAuthUserIdByEmail(adminClient, email);
    } else {
      authUserId = createUserResult.data.user?.id ?? null;
      accountCreated = true;
    }

    const profileResult = await adminClient
      .from("academy_users")
      .upsert(
        {
          auth_user_id: authUserId,
          email,
          full_name: payload.fullName,
          role: "student",
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();

    if (profileResult.error) {
      throw new Error(`Falha ao gravar o perfil do aluno: ${getErrorMessage(profileResult.error)}`);
    }

    if (!pendingRequestResult.data) {
      const requestInsert = await adminClient.from("enrollment_requests").insert({
        link_id: linkResult.data.id,
        course_id: linkResult.data.course_id,
        full_name: payload.fullName,
        email,
        whatsapp: payload.whatsapp,
        notes: payload.notes ?? null,
      });

      if (requestInsert.error) {
        throw new Error(
          `Falha ao gravar a solicitacao de matricula: ${getErrorMessage(requestInsert.error)}`,
        );
      }
    }

    return jsonResponse({
      success: true,
      accountCreated,
      requestCreated: !pendingRequestResult.data,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ error: message }, 400);
  }
});
