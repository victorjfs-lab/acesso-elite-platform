import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type ManualStudentPayload = {
  fullName?: string;
  email?: string;
  whatsapp?: string;
  password?: string;
  courseId?: string;
  durationDays?: number;
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

function getExpiresAt(days: number, grantedAtIso: string) {
  const date = new Date(grantedAtIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
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

    const authHeader = request.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return jsonResponse({ error: "Sessao administrativa nao encontrada." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const requester = await adminClient.auth.getUser(accessToken);

    if (requester.error || !requester.data.user) {
      return jsonResponse({ error: "Nao foi possivel validar a sessao do administrador." }, 401);
    }

    const requesterEmail = normalizeEmail(requester.data.user.email ?? "");
    let requesterProfile = await adminClient
      .from("academy_users")
      .select("role")
      .eq("auth_user_id", requester.data.user.id)
      .maybeSingle();

    if (!requesterProfile.data && requesterEmail) {
      requesterProfile = await adminClient
        .from("academy_users")
        .select("role")
        .eq("email", requesterEmail)
        .maybeSingle();
    }

    if (requesterProfile.error || requesterProfile.data?.role !== "admin") {
      return jsonResponse({ error: "Apenas administradores podem cadastrar alunos manualmente." }, 403);
    }

    const payload = (await request.json()) as ManualStudentPayload;

    if (!payload.fullName || !payload.email || !payload.password || !payload.courseId) {
      return jsonResponse({ error: "Preencha todos os campos obrigatorios." }, 400);
    }

    const durationDays = Number(payload.durationDays ?? 0);

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return jsonResponse({ error: "Selecione um prazo valido para o acesso." }, 400);
    }

    if (payload.password.trim().length < 6) {
      return jsonResponse({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const email = normalizeEmail(payload.email);

    const courseResult = await adminClient
      .from("courses")
      .select("id, slug, status")
      .eq("id", payload.courseId)
      .maybeSingle();

    if (courseResult.error) {
      throw new Error(`Falha ao localizar o curso: ${getErrorMessage(courseResult.error)}`);
    }

    if (!courseResult.data) {
      return jsonResponse({ error: "Curso nao encontrado." }, 404);
    }

    const allPublishedCourses = await adminClient
      .from("courses")
      .select("id, slug, status")
      .eq("status", "published");

    if (allPublishedCourses.error) {
      throw new Error(
        `Falha ao localizar cursos publicados: ${getErrorMessage(allPublishedCourses.error)}`,
      );
    }

    const targetCourses =
      courseResult.data.slug === ELITE_COURSE_SLUG
        ? allPublishedCourses.data.filter((course) => course.slug !== ELITE_COURSE_SLUG)
        : [courseResult.data];

    if (targetCourses.length === 0) {
      return jsonResponse({ error: "Nao ha cursos publicados para liberar neste acesso." }, 400);
    }

    let authUserId: string | null = null;

    const createUserResult = await adminClient.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
        whatsapp: payload.whatsapp ?? "",
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

      if (!authUserId) {
        throw new Error("O usuario ja existe no Auth, mas nao foi localizado para atualizacao.");
      }

      const updateUserResult = await adminClient.auth.admin.updateUserById(authUserId, {
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
          whatsapp: payload.whatsapp ?? "",
        },
      });

      if (updateUserResult.error) {
        throw new Error(`Falha ao atualizar a senha do usuario: ${getErrorMessage(updateUserResult.error)}`);
      }
    } else {
      authUserId = createUserResult.data.user?.id ?? null;
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

    const studentId = profileResult.data.id;
    const grantedAt = new Date().toISOString();
    const expiresAt = getExpiresAt(durationDays, grantedAt);

    for (const course of targetCourses) {
      const existingEnrollment = await adminClient
        .from("enrollments")
        .select("id")
        .eq("course_id", course.id)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingEnrollment.error) {
        throw new Error(
          `Falha ao localizar matriculas antigas: ${getErrorMessage(existingEnrollment.error)}`,
        );
      }

      if (existingEnrollment.data) {
        const updateEnrollment = await adminClient
          .from("enrollments")
          .update({
            granted_at: grantedAt,
            expires_at: expiresAt,
            source_slug: courseResult.data.slug === ELITE_COURSE_SLUG ? ELITE_LINK_SLUG : "manual-admin",
            status: "active",
          })
          .eq("id", existingEnrollment.data.id);

        if (updateEnrollment.error) {
          throw new Error(
            `Falha ao atualizar a matricula: ${getErrorMessage(updateEnrollment.error)}`,
          );
        }
      } else {
        const insertEnrollment = await adminClient.from("enrollments").insert({
          course_id: course.id,
          student_id: studentId,
          granted_at: grantedAt,
          expires_at: expiresAt,
          source_slug: courseResult.data.slug === ELITE_COURSE_SLUG ? ELITE_LINK_SLUG : "manual-admin",
          status: "active",
        });

        if (insertEnrollment.error) {
          throw new Error(
            `Falha ao criar a matricula: ${getErrorMessage(insertEnrollment.error)}`,
          );
        }
      }

      await adminClient
        .from("enrollment_requests")
        .update({ status: "approved", approved_at: grantedAt })
        .eq("course_id", course.id)
        .eq("email", email)
        .eq("status", "pending");
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ error: message }, 400);
  }
});
