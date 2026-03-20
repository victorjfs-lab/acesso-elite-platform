import { addDays, differenceInCalendarDays } from "date-fns";
import { demoCourses, demoLinks, demoSeedState } from "@/data/academyMock";
import { readDemoState, updateDemoState } from "@/lib/academy-demo-store";
import {
  ensureLessonStarted,
  getCompletedLessonIds,
  getStartedLessonMap,
  markLessonAsCompleted,
  setLessonStartedAt,
} from "@/lib/academy-progress-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  AcademyAccount,
  AdminCourseStructure,
  AdminOverviewData,
  AdminStudentAccess,
  Course,
  CourseDetailData,
  CourseLesson,
  CourseModule,
  CourseResource,
  CreateCourseInput,
  CreateCourseLessonInput,
  CreateCourseModuleInput,
  CreateCourseResourceInput,
  CreateEnrollmentLinkInput,
  Enrollment,
  EnrollmentFormInput,
  EnrollmentLink,
  EnrollmentRequest,
  EnrollmentRequestSummary,
  ReorderCourseLessonsInput,
  StudentCourseAccess,
  StudentDashboardData,
  UpdateEliteCourseSettingsInput,
  UpdateCourseBasicsInput,
} from "@/types/academy";

const ACCESS_DURATION_DAYS = 365;
const ELITE_LINK_SLUG = "acesso-elite";
const ELITE_COURSE_SLUG = "acesso-elite-bundle";
const MASTER_ELITE_COURSE_SLUG = "aula-mestre-acesso-elite";
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";

type LessonProgressRecord = {
  studentId: string;
  courseId: string;
  lessonId: string;
  startedAt: string | null;
  completedAt: string | null;
};

type CourseProgressSnapshot = {
  completedLessonIds: string[];
  startedLessonAtById: Record<string, string>;
};

type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function toAppError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    const parts = [candidate.message, candidate.details, candidate.hint].filter(Boolean);
    return new Error(parts.join(" ").trim() || fallbackMessage);
  }

  return new Error(fallbackMessage);
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function getExpiresAt(days: number, grantedAtIso = nowIso()) {
  return addDays(new Date(grantedAtIso), days).toISOString();
}

function getEliteSortOrder(course: Course) {
  return Number.isFinite(course.eliteSortOrder) ? course.eliteSortOrder : 999;
}

function sortCoursesForElite(courses: Course[]) {
  return [...courses].sort((a, b) => {
    const orderDiff = getEliteSortOrder(a) - getEliteSortOrder(b);
    return orderDiff !== 0 ? orderDiff : a.title.localeCompare(b.title);
  });
}

function isEliteEnrollment(enrollment: Enrollment) {
  return enrollment.sourceSlug === ELITE_LINK_SLUG;
}

function isMasterEliteCourse(course: Course) {
  return course.slug === MASTER_ELITE_COURSE_SLUG;
}

function getEliteCourseReleaseOffsetDays(course: Course) {
  const configuredDelay = Math.max(0, course.eliteReleaseDelayDays);

  // For Elite scheduling, "day 1" means immediate availability.
  return configuredDelay > 0 ? configuredDelay - 1 : 0;
}

function isCourseReleasedForEnrollment(enrollment: Enrollment, course: Course) {
  if (!isEliteEnrollment(enrollment)) {
    return true;
  }

  const releaseDate = addDays(
    new Date(enrollment.grantedAt),
    getEliteCourseReleaseOffsetDays(course),
  );

  return releaseDate.getTime() <= Date.now();
}

function isMasterCourseCompleted(access: StudentCourseAccess) {
  return access.lessons.length > 0 && access.completedLessonIds.length >= access.lessons.length;
}

function applyEliteMasterGate(accessList: StudentCourseAccess[]) {
  const masterAccess =
    accessList.find(
      (item) =>
        item.enrollment.status === "active" &&
        isEliteEnrollment(item.enrollment) &&
        isMasterEliteCourse(item.course),
    ) ?? null;

  if (!masterAccess || isMasterCourseCompleted(masterAccess)) {
    return accessList;
  }

  return accessList.filter(
    (item) => !isEliteEnrollment(item.enrollment) || isMasterEliteCourse(item.course),
  );
}

function isEliteCourseBlockedByMaster(
  accessList: StudentCourseAccess[],
  course: Course,
  enrollment: Enrollment | null,
) {
  if (!enrollment || !isEliteEnrollment(enrollment) || isMasterEliteCourse(course)) {
    return false;
  }

  const gatedAccessList = applyEliteMasterGate(accessList);
  return !gatedAccessList.some((item) => item.course.id === course.id);
}

async function syncPublishedCourseToEliteSupabase(course: Course) {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  if (course.status !== "published" || course.slug === ELITE_COURSE_SLUG) {
    return;
  }

  const collections = await getSupabaseCollections();
  const eliteAnchors = new Map<string, Enrollment>();

  for (const enrollment of collections.enrollments) {
    if (enrollment.status !== "active" || enrollment.sourceSlug !== ELITE_LINK_SLUG) {
      continue;
    }

    const current = eliteAnchors.get(enrollment.studentId);
    if (!current || new Date(enrollment.expiresAt).getTime() > new Date(current.expiresAt).getTime()) {
      eliteAnchors.set(enrollment.studentId, enrollment);
    }
  }

  for (const anchor of eliteAnchors.values()) {
    const existing = collections.enrollments.find(
      (item) => item.studentId === anchor.studentId && item.courseId === course.id,
    );

    if (existing) {
      continue;
    }

    const { error } = await supabase.from("enrollments").insert({
      course_id: course.id,
      student_id: anchor.studentId,
      granted_at: anchor.grantedAt,
      expires_at: anchor.expiresAt,
      source_slug: ELITE_LINK_SLUG,
      status: "active",
    });

    if (error) {
      throw error;
    }
  }
}

function syncPublishedCourseToEliteDemo(course: Course) {
  if (course.status !== "published" || course.slug === ELITE_COURSE_SLUG) {
    return;
  }

  updateDemoState((state) => {
    const eliteAnchors = new Map<string, Enrollment>();

    for (const enrollment of state.enrollments) {
      if (enrollment.status !== "active" || enrollment.sourceSlug !== ELITE_LINK_SLUG) {
        continue;
      }

      const current = eliteAnchors.get(enrollment.studentId);
      if (!current || new Date(enrollment.expiresAt).getTime() > new Date(current.expiresAt).getTime()) {
        eliteAnchors.set(enrollment.studentId, enrollment);
      }
    }

    const nextEnrollments = [...state.enrollments];

    for (const anchor of eliteAnchors.values()) {
      const existing = nextEnrollments.find(
        (item) => item.studentId === anchor.studentId && item.courseId === course.id,
      );

      if (existing) {
        continue;
      }

      nextEnrollments.unshift({
        id: createId("enrollment"),
        courseId: course.id,
        studentId: anchor.studentId,
        grantedAt: anchor.grantedAt,
        expiresAt: anchor.expiresAt,
        sourceSlug: ELITE_LINK_SLUG,
        status: "active",
      });
    }

    return {
      ...state,
      enrollments: nextEnrollments,
    };
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

function normalizeEnrollment(enrollment: Enrollment): Enrollment {
  const isExpired = new Date(enrollment.expiresAt).getTime() < Date.now();

  return {
    ...enrollment,
    status: isExpired ? "expired" : enrollment.status,
  };
}

function getIdentityKey(identity: { accountId?: string | null; email?: string | null }) {
  return identity.accountId ?? identity.email?.toLowerCase() ?? "anonymous";
}

function buildCourseProgressSnapshot(
  identity: { accountId?: string | null; email?: string | null },
  courseId: string,
  lessonProgress: LessonProgressRecord[] | null,
): CourseProgressSnapshot {
  if (lessonProgress) {
    const courseRows = lessonProgress.filter((item) => item.courseId === courseId);

    return {
      completedLessonIds: courseRows
        .filter((item) => Boolean(item.completedAt))
        .map((item) => item.lessonId),
      startedLessonAtById: courseRows.reduce<Record<string, string>>((acc, item) => {
        if (item.startedAt) {
          acc[item.lessonId] = item.startedAt;
        }

        return acc;
      }, {}),
    };
  }

  const identityKey = getIdentityKey(identity);
  return {
    completedLessonIds: getCompletedLessonIds(identityKey, courseId),
    startedLessonAtById: getStartedLessonMap(identityKey, courseId),
  };
}

function buildCourseProgressState(
  modules: CourseModule[],
  lessons: CourseLesson[],
  enrollment: Enrollment,
  completedLessonIds: string[],
) {
  const orderedModules = [...modules].sort((a, b) => a.moduleOrder - b.moduleOrder);
  const moduleIds = new Set(orderedModules.map((moduleItem) => moduleItem.id));
  const orderedLessons = lessons
    .filter((lesson) => moduleIds.has(lesson.moduleId))
    .sort((a, b) => {
      const moduleA = orderedModules.find((moduleItem) => moduleItem.id === a.moduleId)?.moduleOrder ?? 0;
      const moduleB = orderedModules.find((moduleItem) => moduleItem.id === b.moduleId)?.moduleOrder ?? 0;
      return moduleA === moduleB ? a.lessonOrder - b.lessonOrder : moduleA - moduleB;
    });

  const daysSinceGranted = Math.max(
    0,
    differenceInCalendarDays(new Date(), new Date(enrollment.grantedAt)),
  );
  const unlockedModuleCount = Math.min(orderedModules.length, daysSinceGranted + 1);
  const availableModuleIds = orderedModules
    .filter((moduleItem) => moduleItem.moduleOrder <= unlockedModuleCount)
    .map((moduleItem) => moduleItem.id);
  const availableModuleSet = new Set(availableModuleIds);
  const unlockedLessons = orderedLessons.filter((lesson) => availableModuleSet.has(lesson.moduleId));
  const completedSet = new Set(
    completedLessonIds.filter((lessonId) => orderedLessons.some((lesson) => lesson.id === lessonId)),
  );
  const availableLessonIds = orderedModules
    .filter((moduleItem) => availableModuleSet.has(moduleItem.id))
    .flatMap((moduleItem) => {
      const moduleLessons = unlockedLessons.filter((lesson) => lesson.moduleId === moduleItem.id);
      const firstIncompleteModuleLesson =
        moduleLessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;

      return moduleLessons
        .filter(
          (lesson) =>
            completedSet.has(lesson.id) || lesson.id === firstIncompleteModuleLesson?.id,
        )
        .map((lesson) => lesson.id);
    });
  const firstIncompleteUnlockedLesson =
    unlockedLessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;

  return {
    orderedModules,
    orderedLessons,
    availableModuleIds,
    availableLessonIds,
    completedLessonIds: [...completedSet],
    progressPercent:
      orderedLessons.length > 0
        ? Math.round((completedSet.size / orderedLessons.length) * 100)
        : 0,
    nextLesson: firstIncompleteUnlockedLesson,
  };
}

function buildStudentCourseAccess(
  courses: Course[],
  modules: CourseModule[],
  lessons: CourseLesson[],
  resources: CourseResource[],
  enrollment: Enrollment,
  identity: { accountId?: string | null; email?: string | null },
  lessonProgress: LessonProgressRecord[] | null = null,
): StudentCourseAccess | null {
  const course = courses.find((item) => item.id === enrollment.courseId);

  if (!course) {
    return null;
  }

  if (!isCourseReleasedForEnrollment(enrollment, course)) {
    return null;
  }

  const courseModules = modules.filter((item) => item.courseId === course.id);
  const progressSnapshot = buildCourseProgressSnapshot(identity, course.id, lessonProgress);
  const progressState = buildCourseProgressState(
    courseModules,
    lessons,
    enrollment,
    progressSnapshot.completedLessonIds,
  );
  const courseResources = resources.filter((item) => item.courseId === course.id);

  return {
    course,
    enrollment: normalizeEnrollment(enrollment),
    modules: progressState.orderedModules,
    lessons: progressState.orderedLessons,
    resources: courseResources,
    availableModuleIds: progressState.availableModuleIds,
    availableLessonIds: progressState.availableLessonIds,
    completedLessonIds: progressState.completedLessonIds,
    startedLessonAtById: progressSnapshot.startedLessonAtById,
    daysRemaining: Math.max(
      0,
      differenceInCalendarDays(new Date(enrollment.expiresAt), new Date()),
    ),
    progressPercent: progressState.progressPercent,
    nextLesson: progressState.nextLesson,
  };
}

function buildAdminStudentRows(
  accounts: AcademyAccount[],
  courses: Course[],
  enrollments: Enrollment[],
): AdminStudentAccess[] {
  return accounts
    .filter((account) => account.role === "student")
    .map((account) => {
      const latestEnrollment = enrollments
        .filter((enrollment) => enrollment.studentId === account.id)
        .map(normalizeEnrollment)
        .sort(
          (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
        )[0] ?? null;

      return {
        account,
        course:
          latestEnrollment === null
            ? null
            : courses.find((course) => course.id === latestEnrollment.courseId) ?? null,
        enrollment: latestEnrollment,
        daysRemaining:
          latestEnrollment === null
            ? null
            : Math.max(
                0,
                differenceInCalendarDays(new Date(latestEnrollment.expiresAt), new Date()),
              ),
      };
    })
    .sort((a, b) => a.account.fullName.localeCompare(b.account.fullName));
}

function buildRequestSummaries(
  requests: EnrollmentRequest[],
  courses: Course[],
  links: EnrollmentLink[],
): EnrollmentRequestSummary[] {
  return requests
    .map((request) => ({
      ...request,
      courseTitle:
        courses.find((course) => course.id === request.courseId)?.title ?? "Curso removido",
      linkTitle:
        links.find((link) => link.id === request.linkId)?.title ?? "Link sem titulo",
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function buildAdminCourseStructures(
  courses: Course[],
  modules: CourseModule[],
): AdminCourseStructure[] {
  return sortCoursesForElite(courses)
    .map((course) => ({
      course,
      modules: modules
        .filter((moduleItem) => moduleItem.courseId === course.id)
        .sort((a, b) => a.moduleOrder - b.moduleOrder),
    }));
}

function getNextModuleOrder(modules: CourseModule[], courseId: string) {
  const courseOrders = modules
    .filter((item) => item.courseId === courseId)
    .map((item) => item.moduleOrder);

  return courseOrders.length > 0 ? Math.max(...courseOrders) + 1 : 1;
}

function getNextLessonOrder(lessons: CourseLesson[], moduleId: string) {
  const lessonOrders = lessons
    .filter((item) => item.moduleId === moduleId)
    .map((item) => item.lessonOrder);

  return lessonOrders.length > 0 ? Math.max(...lessonOrders) + 1 : 1;
}

async function reorderModuleLessonsInSupabase(input: ReorderCourseLessonsInput) {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  for (const [index, lessonId] of input.lessonIds.entries()) {
    const tempResult = await supabase
      .from("course_lessons")
      .update({ lesson_order: 1000 + index })
      .eq("id", lessonId)
      .eq("module_id", input.moduleId);

    if (tempResult.error) {
      throw tempResult.error;
    }
  }

  for (const [index, lessonId] of input.lessonIds.entries()) {
    const finalResult = await supabase
      .from("course_lessons")
      .update({ lesson_order: index + 1 })
      .eq("id", lessonId)
      .eq("module_id", input.moduleId);

    if (finalResult.error) {
      throw finalResult.error;
    }
  }
}

function reorderModuleLessonsInDemo(
  lessons: CourseLesson[],
  input: ReorderCourseLessonsInput,
) {
  const nextOrderById = new Map(input.lessonIds.map((lessonId, index) => [lessonId, index + 1]));

  return lessons.map((lesson) =>
    lesson.moduleId === input.moduleId && nextOrderById.has(lesson.id)
      ? {
          ...lesson,
          lessonOrder: nextOrderById.get(lesson.id) ?? lesson.lessonOrder,
        }
      : lesson,
  );
}

function buildUniqueSlug(baseValue: string, existingSlugs: string[]) {
  const base = slugify(baseValue) || "item";

  if (!existingSlugs.includes(base)) {
    return base;
  }

  let suffix = 2;
  let candidate = `${base}-${suffix}`;

  while (existingSlugs.includes(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

async function trySupabase<T>(operation: () => Promise<T>, fallback: () => Promise<T>) {
  if (!isSupabaseConfigured || !supabase) {
    return fallback();
  }

  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase indisponivel") {
      return fallback();
    }

    throw error;
  }
}

async function getSupabaseAccountByIdentity(identity: {
  accountId?: string | null;
  email?: string | null;
}) {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  if (identity.accountId) {
    const result = await supabase
      .from("academy_users")
      .select("*")
      .eq("id", identity.accountId)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data
      ? ({
          id: result.data.id,
          authUserId: result.data.auth_user_id,
          email: result.data.email,
          fullName: result.data.full_name,
          role: result.data.role,
          headline: result.data.headline,
          avatarUrl: result.data.avatar_url,
          demoPassword: null,
          createdAt: result.data.created_at,
        } satisfies AcademyAccount)
      : null;
  }

  const normalizedEmail = identity.email?.toLowerCase().trim();

  if (!normalizedEmail) {
    return null;
  }

  const result = await supabase
    .from("academy_users")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data
    ? ({
        id: result.data.id,
        authUserId: result.data.auth_user_id,
        email: result.data.email,
        fullName: result.data.full_name,
        role: result.data.role,
        headline: result.data.headline,
        avatarUrl: result.data.avatar_url,
        demoPassword: null,
        createdAt: result.data.created_at,
      } satisfies AcademyAccount)
    : null;
}

async function getSupabaseLessonProgress(studentId: string, courseId?: string) {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  let query = supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", studentId);

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const result = await query;

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map(
    (row: any) =>
      ({
        studentId: row.student_id,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
      }) satisfies LessonProgressRecord,
  );
}

async function getSupabaseLessonProgressSafe(studentId: string, courseId?: string) {
  try {
    return await getSupabaseLessonProgress(studentId, courseId);
  } catch {
    return null;
  }
}

async function getSupabaseCollections() {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  const results = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("course_modules").select("*").order("module_order", { ascending: true }),
    supabase.from("course_lessons").select("*").order("lesson_order", { ascending: true }),
    supabase.from("course_resources").select("*"),
    supabase.from("enrollment_links").select("*").order("created_at", { ascending: false }),
    supabase.from("enrollment_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("enrollments").select("*").order("granted_at", { ascending: false }),
    supabase.from("academy_users").select("*").order("created_at", { ascending: false }),
  ]);

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw failed.error;
  }

  const [
    coursesResult,
    modulesResult,
    lessonsResult,
    resourcesResult,
    linksResult,
    requestsResult,
    enrollmentsResult,
    usersResult,
  ] = results;

  return {
    courses: (coursesResult.data ?? []).map(mapCourseRow),
    modules: (modulesResult.data ?? []).map((row: any) => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      description: row.description,
      moduleOrder: row.module_order,
    })) as CourseModule[],
    lessons: (lessonsResult.data ?? []).map((row: any) => ({
      id: row.id,
      moduleId: row.module_id,
      title: row.title,
      summary: row.summary,
      durationLabel: row.duration_label,
      lessonOrder: row.lesson_order,
      vimeoUrl: row.vimeo_url,
    })) as CourseLesson[],
    resources: (resourcesResult.data ?? []).map((row: any) => ({
      id: row.id,
      courseId: row.course_id,
      moduleId: row.module_id ?? null,
      lessonId: row.lesson_id ?? null,
      title: row.title,
      description: row.description,
      kind: row.kind,
      fileUrl: row.file_url,
    })) as CourseResource[],
    links: (linksResult.data ?? []).map((row: any) => ({
      id: row.id,
      courseId: row.course_id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
    })) as EnrollmentLink[],
    requests: (requestsResult.data ?? []).map((row: any) => ({
      id: row.id,
      linkId: row.link_id,
      courseId: row.course_id,
      fullName: row.full_name,
      email: row.email,
      whatsapp: row.whatsapp,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
    })) as EnrollmentRequest[],
    enrollments: (enrollmentsResult.data ?? []).map((row: any) => ({
      id: row.id,
      courseId: row.course_id,
      studentId: row.student_id,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      sourceSlug: row.source_slug ?? null,
      status: row.status,
    })) as Enrollment[],
    accounts: (usersResult.data ?? []).map((row: any) => ({
      id: row.id,
      authUserId: row.auth_user_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      headline: row.headline,
      avatarUrl: row.avatar_url,
      demoPassword: null,
      createdAt: row.created_at,
    })) as AcademyAccount[],
  };
}

function mapCourseRow(row: any): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    heroImage: row.hero_image,
    instructorName: row.instructor_name,
    durationLabel: row.duration_label,
    supportLabel: row.support_label,
    accessDurationDays: row.access_duration_days,
    priceLabel: row.price_label,
    eliteSortOrder: Number(row.elite_sort_order ?? 999),
    eliteReleaseDelayDays: Number(row.elite_release_delay_days ?? 0),
    status: row.status,
    createdAt: row.created_at,
  };
}

function getDemoCollections() {
  const state = readDemoState();

  return {
    accounts: state.accounts,
    courses: state.courses,
    modules: state.modules,
    lessons: state.lessons,
    resources: state.resources,
    links: state.links,
    requests: state.requests,
    enrollments: state.enrollments.map(normalizeEnrollment),
  };
}

export const academyRepository = {
  getDemoSeed() {
    return demoSeedState;
  },

  async getCurrentAccount(authUserId: string | null, email: string | undefined, fullName?: string) {
    return trySupabase(
      async () => {
        if (!supabase || !email) {
          throw new Error("Sessao sem email");
        }

        if (authUserId) {
          const byAuth = await supabase
            .from("academy_users")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

          if (byAuth.error) {
            throw byAuth.error;
          }

          if (byAuth.data) {
            return {
              id: byAuth.data.id,
              authUserId: byAuth.data.auth_user_id,
              email: byAuth.data.email,
              fullName: byAuth.data.full_name,
              role: byAuth.data.role,
              headline: byAuth.data.headline,
              avatarUrl: byAuth.data.avatar_url,
              demoPassword: null,
              createdAt: byAuth.data.created_at,
            } satisfies AcademyAccount;
          }
        }

        const byEmail = await supabase
          .from("academy_users")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (byEmail.error) {
          throw byEmail.error;
        }

        if (byEmail.data) {
          if (authUserId && byEmail.data.auth_user_id !== authUserId) {
            await supabase
              .from("academy_users")
              .update({ auth_user_id: authUserId })
              .eq("id", byEmail.data.id);
          }

          return {
            id: byEmail.data.id,
            authUserId,
            email: byEmail.data.email,
            fullName: byEmail.data.full_name,
            role: byEmail.data.role,
            headline: byEmail.data.headline,
            avatarUrl: byEmail.data.avatar_url,
            demoPassword: null,
            createdAt: byEmail.data.created_at,
          } satisfies AcademyAccount;
        }

        const inserted = await supabase
          .from("academy_users")
          .insert({
            auth_user_id: authUserId,
            email,
            full_name: fullName ?? email.split("@")[0],
            role: "student",
          })
          .select("*")
          .single();

        if (inserted.error) {
          throw inserted.error;
        }

        return {
          id: inserted.data.id,
          authUserId: inserted.data.auth_user_id,
          email: inserted.data.email,
          fullName: inserted.data.full_name,
          role: inserted.data.role,
          headline: inserted.data.headline,
          avatarUrl: inserted.data.avatar_url,
          demoPassword: null,
          createdAt: inserted.data.created_at,
        } satisfies AcademyAccount;
      },
      async () => {
        if (!email) {
          return null;
        }

        return (
          readDemoState().accounts.find(
            (account) => account.email.toLowerCase() === email.toLowerCase(),
          ) ?? null
        );
      },
    );
  },

  async authenticateDemoUser(email: string, password: string) {
    return (
      readDemoState().accounts.find(
        (account) =>
          account.email.toLowerCase() === email.toLowerCase() &&
          account.demoPassword === password,
      ) ?? null
    );
  },

  async getPublicCatalog() {
    return trySupabase(
      async () => {
        const { courses, links } = await getSupabaseCollections();
        return {
          courses: sortCoursesForElite(
            courses.filter(
              (course) =>
                course.status === "published" &&
                course.slug !== ELITE_COURSE_SLUG &&
                course.slug !== MASTER_ELITE_COURSE_SLUG,
            ),
          ),
          links: links.filter((link) => link.isActive),
        };
      },
      async () => ({
        courses: sortCoursesForElite(
          demoCourses.filter(
            (course) =>
              course.status === "published" &&
              course.slug !== ELITE_COURSE_SLUG &&
              course.slug !== MASTER_ELITE_COURSE_SLUG,
          ),
        ),
        links: demoLinks.filter((link) => link.isActive),
      }),
    );
  },

  async getEnrollmentLinkBySlug(slug: string) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const { data, error } = await supabase
          .from("enrollment_links")
          .select("*, courses(*)")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data || !data.courses) {
          return null;
        }

        return {
          link: {
            id: data.id,
            courseId: data.course_id,
            slug: data.slug,
            title: data.title,
            description: data.description,
            isActive: data.is_active,
            createdAt: data.created_at,
          } satisfies EnrollmentLink,
          course: mapCourseRow(data.courses),
        };
      },
      async () => {
        const state = getDemoCollections();
        const link = state.links.find((item) => item.slug === slug && item.isActive) ?? null;

        if (!link) {
          return null;
        }

        const course = state.courses.find((item) => item.id === link.courseId) ?? null;
        return course ? { link, course } : null;
      },
    );
  },

  async submitEnrollmentRequest(input: EnrollmentFormInput) {
    if (isSupabaseConfigured && supabase) {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${baseUrl}/functions/v1/create-student-enrollment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            slug: input.slug,
            fullName: input.fullName,
            email: input.email,
            whatsapp: input.whatsapp,
            notes: input.notes ?? null,
            password: input.password,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Nao foi possivel enviar o cadastro automatico. Verifique a funcao create-student-enrollment no Supabase.",
        );
      }

      return payload;
    }

    const linkData = await this.getEnrollmentLinkBySlug(input.slug);

    if (!linkData) {
      throw new Error("Link de cadastro nao encontrado");
    }

    const normalizedEmail = input.email.toLowerCase();
    const existingAccount = readDemoState().accounts.find(
      (account) => account.email.toLowerCase() === normalizedEmail,
    );
    const existingPending = readDemoState().requests.find(
      (request) =>
        request.courseId === linkData.course.id &&
        request.email.toLowerCase() === normalizedEmail &&
        request.status === "pending",
    );

    if (!existingAccount) {
      updateDemoState((state) => ({
        ...state,
        accounts: [
          {
            id: createId("user"),
            authUserId: null,
            email: normalizedEmail,
            fullName: input.fullName,
            role: "student",
            headline: "Aluno em aguardando aprovacao",
            avatarUrl: null,
            demoPassword: input.password,
            createdAt: nowIso(),
          },
          ...state.accounts,
        ],
      }));
    }

    if (!existingPending) {
      updateDemoState((state) => ({
        ...state,
        requests: [
          {
            id: createId("request"),
            linkId: linkData.link.id,
            courseId: linkData.course.id,
            fullName: input.fullName,
            email: normalizedEmail,
            whatsapp: input.whatsapp,
            notes: input.notes ?? null,
            status: "pending",
            createdAt: nowIso(),
            approvedAt: null,
          },
          ...state.requests,
        ],
      }));
    }
  },

  async getStudentDashboard(identity: { accountId?: string | null; email?: string | null }): Promise<StudentDashboardData> {
    return trySupabase(
      async () => {
        const { accounts, courses, modules, lessons, resources, requests, enrollments } =
          await getSupabaseCollections();
        const normalizedEmail = identity.email?.toLowerCase() ?? null;
        const account =
          accounts.find((item) => item.id === identity.accountId) ??
          accounts.find((item) => item.email.toLowerCase() === normalizedEmail) ??
          null;
        const lessonProgress = account
          ? await getSupabaseLessonProgressSafe(account.id)
          : null;
        const accessList = enrollments
          .filter((item) => item.studentId === account?.id)
          .map((item) =>
            buildStudentCourseAccess(
              courses,
              modules,
              lessons,
              resources,
              item,
              identity,
              lessonProgress,
            ),
          )
          .filter((item): item is StudentCourseAccess => item !== null);
        const gatedAccessList = applyEliteMasterGate(accessList);

        return {
          activeAccess: gatedAccessList
            .filter((item) => item.enrollment.status === "active")
            .sort(
              (a, b) =>
                getEliteSortOrder(a.course) - getEliteSortOrder(b.course) ||
                a.course.title.localeCompare(b.course.title),
            ),
          expiredAccess: gatedAccessList
            .filter((item) => item.enrollment.status === "expired")
            .sort(
              (a, b) =>
                getEliteSortOrder(a.course) - getEliteSortOrder(b.course) ||
                a.course.title.localeCompare(b.course.title),
            ),
          pendingRequests: requests.filter(
            (item) =>
              item.status === "pending" &&
              item.email.toLowerCase() === normalizedEmail,
          ),
        };
      },
      async () => {
        const state = getDemoCollections();
        const normalizedEmail = identity.email?.toLowerCase() ?? null;
        const account =
          state.accounts.find((item) => item.id === identity.accountId) ??
          state.accounts.find((item) => item.email.toLowerCase() === normalizedEmail) ??
          null;
        const accessList = state.enrollments
          .filter((item) => item.studentId === account?.id)
          .map((item) =>
            buildStudentCourseAccess(
              state.courses,
              state.modules,
              state.lessons,
              state.resources,
              item,
              identity,
            ),
          )
          .filter((item): item is StudentCourseAccess => item !== null);
        const gatedAccessList = applyEliteMasterGate(accessList);

        return {
          activeAccess: gatedAccessList
            .filter((item) => item.enrollment.status === "active")
            .sort(
              (a, b) =>
                getEliteSortOrder(a.course) - getEliteSortOrder(b.course) ||
                a.course.title.localeCompare(b.course.title),
            ),
          expiredAccess: gatedAccessList
            .filter((item) => item.enrollment.status === "expired")
            .sort(
              (a, b) =>
                getEliteSortOrder(a.course) - getEliteSortOrder(b.course) ||
                a.course.title.localeCompare(b.course.title),
            ),
          pendingRequests: state.requests.filter(
            (request) =>
              request.status === "pending" &&
              request.email.toLowerCase() === normalizedEmail,
          ),
        };
      },
    );
  },

  async getCourseDetail(
    courseId: string,
    identity?: { accountId?: string | null; email?: string | null },
  ): Promise<CourseDetailData | null> {
    return trySupabase(
      async () => {
        const { accounts, courses, modules, lessons, resources, links, enrollments } =
          await getSupabaseCollections();
        const course = courses.find((item) => item.id === courseId) ?? null;

        if (!course) {
          return null;
        }

        const courseModules = modules.filter((item) => item.courseId === courseId);
        const normalizedEmail = identity?.email?.toLowerCase() ?? null;
        const account =
          accounts.find(
            (item) =>
              item.id === identity?.accountId || item.email.toLowerCase() === normalizedEmail,
          ) ?? null;
        const lessonProgress = account
          ? await getSupabaseLessonProgressSafe(account.id)
          : null;

        const enrollment =
          enrollments.find((item) => item.courseId === courseId && item.studentId === account?.id) ??
          null;
        const accessList = enrollments
          .filter((item) => item.studentId === account?.id)
          .map((item) =>
            buildStudentCourseAccess(
              courses,
              modules,
              lessons,
              resources,
              item,
              identity ?? {},
              lessonProgress,
            ),
          )
          .filter((item): item is StudentCourseAccess => item !== null);
        const progressSnapshot = buildCourseProgressSnapshot(
          identity ?? {},
          courseId,
          lessonProgress,
        );
        const progressState = enrollment
          ? buildCourseProgressState(
              courseModules,
              lessons,
              enrollment,
              progressSnapshot.completedLessonIds,
            )
          : null;
        const courseReleased = enrollment
          ? isCourseReleasedForEnrollment(enrollment, course)
          : true;
        const blockedByMaster = isEliteCourseBlockedByMaster(accessList, course, enrollment);

        return {
          course,
          enrollment,
          modules: progressState?.orderedModules ?? courseModules.sort((a, b) => a.moduleOrder - b.moduleOrder),
          lessons: lessons.filter((lesson) =>
            courseModules.some((moduleItem) => moduleItem.id === lesson.moduleId),
          ).sort((a, b) => {
            const moduleA = courseModules.find((moduleItem) => moduleItem.id === a.moduleId)?.moduleOrder ?? 0;
            const moduleB = courseModules.find((moduleItem) => moduleItem.id === b.moduleId)?.moduleOrder ?? 0;
            return moduleA === moduleB ? a.lessonOrder - b.lessonOrder : moduleA - moduleB;
          }),
          resources: resources.filter((item) => item.courseId === courseId),
          links: links.filter((item) => item.courseId === courseId),
          availableModuleIds: courseReleased && !blockedByMaster
            ? progressState?.availableModuleIds ?? courseModules.map((moduleItem) => moduleItem.id)
            : [],
          availableLessonIds:
            courseReleased && !blockedByMaster ? progressState?.availableLessonIds ?? [] : [],
          completedLessonIds: progressSnapshot.completedLessonIds,
          startedLessonAtById: progressSnapshot.startedLessonAtById,
          progressPercent: progressState?.progressPercent ?? 0,
          nextLesson: courseReleased && !blockedByMaster ? progressState?.nextLesson ?? null : null,
        };
      },
      async () => {
        const state = getDemoCollections();
        const course = state.courses.find((item) => item.id === courseId) ?? null;

        if (!course) {
          return null;
        }

        const courseModules = state.modules.filter((item) => item.courseId === courseId);
        const normalizedEmail = identity?.email?.toLowerCase() ?? null;
        const account =
          state.accounts.find((item) => item.id === identity?.accountId) ??
          state.accounts.find((item) => item.email.toLowerCase() === normalizedEmail) ??
          null;

        const enrollment =
          state.enrollments.find((item) => item.courseId === courseId && item.studentId === account?.id) ??
          null;
        const accessList = state.enrollments
          .filter((item) => item.studentId === account?.id)
          .map((item) =>
            buildStudentCourseAccess(
              state.courses,
              state.modules,
              state.lessons,
              state.resources,
              item,
              identity ?? {},
            ),
          )
          .filter((item): item is StudentCourseAccess => item !== null);
        const progressSnapshot = buildCourseProgressSnapshot(identity ?? {}, courseId, null);
        const progressState = enrollment
          ? buildCourseProgressState(
              courseModules,
              state.lessons,
              enrollment,
              progressSnapshot.completedLessonIds,
            )
          : null;
        const courseReleased = enrollment
          ? isCourseReleasedForEnrollment(enrollment, course)
          : true;
        const blockedByMaster = isEliteCourseBlockedByMaster(accessList, course, enrollment);

        return {
          course,
          enrollment,
          modules: progressState?.orderedModules ?? courseModules.sort((a, b) => a.moduleOrder - b.moduleOrder),
          lessons: state.lessons.filter((lesson) =>
            courseModules.some((moduleItem) => moduleItem.id === lesson.moduleId),
          ).sort((a, b) => {
            const moduleA = courseModules.find((moduleItem) => moduleItem.id === a.moduleId)?.moduleOrder ?? 0;
            const moduleB = courseModules.find((moduleItem) => moduleItem.id === b.moduleId)?.moduleOrder ?? 0;
            return moduleA === moduleB ? a.lessonOrder - b.lessonOrder : moduleA - moduleB;
          }),
          resources: state.resources.filter((item) => item.courseId === courseId),
          links: state.links.filter((item) => item.courseId === courseId),
          availableModuleIds: courseReleased && !blockedByMaster
            ? progressState?.availableModuleIds ?? courseModules.map((moduleItem) => moduleItem.id)
            : [],
          availableLessonIds:
            courseReleased && !blockedByMaster ? progressState?.availableLessonIds ?? [] : [],
          completedLessonIds: progressSnapshot.completedLessonIds,
          startedLessonAtById: progressSnapshot.startedLessonAtById,
          progressPercent: progressState?.progressPercent ?? 0,
          nextLesson: courseReleased && !blockedByMaster ? progressState?.nextLesson ?? null : null,
        };
      },
    );
  },

  async startLesson(input: {
    courseId: string;
    lessonId: string;
    accountId?: string | null;
    email?: string | null;
  }) {
    const identityKey = getIdentityKey(input);

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const account = await getSupabaseAccountByIdentity(input);

        if (!account) {
          return ensureLessonStarted(identityKey, input.courseId, input.lessonId);
        }

        const existingResult = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("student_id", account.id)
          .eq("course_id", input.courseId)
          .eq("lesson_id", input.lessonId)
          .maybeSingle();

        if (existingResult.error) {
          throw existingResult.error;
        }

        if (existingResult.data?.started_at) {
          return setLessonStartedAt(
            identityKey,
            input.courseId,
            input.lessonId,
            existingResult.data.started_at,
          );
        }

        const startedAt = existingResult.data?.started_at ?? nowIso();
        const upsertResult = await supabase.from("lesson_progress").upsert(
          {
            student_id: account.id,
            course_id: input.courseId,
            lesson_id: input.lessonId,
            started_at: startedAt,
            completed_at: existingResult.data?.completed_at ?? null,
          },
          {
            onConflict: "student_id,lesson_id",
          },
        );

        if (upsertResult.error) {
          throw upsertResult.error;
        }

        return setLessonStartedAt(identityKey, input.courseId, input.lessonId, startedAt);
      },
      async () => ensureLessonStarted(identityKey, input.courseId, input.lessonId),
    );
  },

  async completeLesson(input: {
    courseId: string;
    lessonId: string;
    accountId?: string | null;
    email?: string | null;
  }) {
    const identityKey = getIdentityKey(input);

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const account = await getSupabaseAccountByIdentity(input);

        if (!account) {
          markLessonAsCompleted(identityKey, input.courseId, input.lessonId);
          return;
        }

        const startedAt = await academyRepository.startLesson(input);
        const completedAt = nowIso();

        const result = await supabase.from("lesson_progress").upsert(
          {
            student_id: account.id,
            course_id: input.courseId,
            lesson_id: input.lessonId,
            started_at: startedAt,
            completed_at: completedAt,
          },
          {
            onConflict: "student_id,lesson_id",
          },
        );

        if (result.error) {
          throw result.error;
        }

        setLessonStartedAt(identityKey, input.courseId, input.lessonId, startedAt);
        markLessonAsCompleted(identityKey, input.courseId, input.lessonId);
      },
      async () => {
        ensureLessonStarted(identityKey, input.courseId, input.lessonId);
        markLessonAsCompleted(identityKey, input.courseId, input.lessonId);
      },
    );
  },

  async getAdminOverview(): Promise<AdminOverviewData> {
    return trySupabase(
      async () => {
        const { accounts, courses, modules, links, requests, enrollments } =
          await getSupabaseCollections();
        const students = buildAdminStudentRows(accounts, courses, enrollments);

        return {
          stats: {
            activeStudents: students.filter((item) => item.enrollment?.status === "active").length,
            pendingRequests: requests.filter((item) => item.status === "pending").length,
            expiringSoon: students.filter(
              (item) =>
                item.enrollment?.status === "active" && (item.daysRemaining ?? 999) <= 30,
            ).length,
            publishedCourses: courses.filter((item) => item.status === "published").length,
          },
          courseStructures: buildAdminCourseStructures(courses, modules),
          links,
          requests: buildRequestSummaries(requests, courses, links),
          students,
        };
      },
      async () => {
        const state = getDemoCollections();
        const students = buildAdminStudentRows(state.accounts, state.courses, state.enrollments);

        return {
          stats: {
            activeStudents: students.filter((item) => item.enrollment?.status === "active").length,
            pendingRequests: state.requests.filter((item) => item.status === "pending").length,
            expiringSoon: students.filter(
              (item) =>
                item.enrollment?.status === "active" && (item.daysRemaining ?? 999) <= 30,
            ).length,
            publishedCourses: state.courses.filter((item) => item.status === "published").length,
          },
          courseStructures: buildAdminCourseStructures(state.courses, state.modules),
          links: state.links,
          requests: buildRequestSummaries(state.requests, state.courses, state.links),
          students,
        };
      },
    );
  },

  async approveEnrollmentRequest(requestId: string, durationDays = ACCESS_DURATION_DAYS) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const requestResult = await supabase
          .from("enrollment_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (requestResult.error) {
          throw requestResult.error;
        }

        const request = requestResult.data;
        const studentByEmail = await supabase
          .from("academy_users")
          .select("*")
          .eq("email", request.email)
          .maybeSingle();

        if (studentByEmail.error) {
          throw studentByEmail.error;
        }

        let studentId = studentByEmail.data?.id ?? null;

        if (!studentId) {
          const insertedStudent = await supabase
            .from("academy_users")
            .insert({
              email: request.email,
              full_name: request.full_name,
              role: "student",
            })
            .select("*")
            .single();

          if (insertedStudent.error) {
            throw insertedStudent.error;
          }

          studentId = insertedStudent.data.id;
        }

        const allCollections = await getSupabaseCollections();
        const requestCourse = allCollections.courses.find((item) => item.id === request.course_id) ?? null;
        const requestLink = allCollections.links.find((item) => item.id === request.link_id) ?? null;
        const isEliteRequest =
          requestCourse?.slug === ELITE_COURSE_SLUG || requestLink?.slug === ELITE_LINK_SLUG;

        const targetCourses = isEliteRequest
          ? allCollections.courses.filter(
              (course) => course.status === "published" && course.slug !== ELITE_COURSE_SLUG,
            )
          : requestCourse
            ? [requestCourse]
            : [];

        if (targetCourses.length === 0) {
          throw new Error("Nenhum curso foi encontrado para esta aprovacao.");
        }

        const grantedAt = nowIso();
        const expiresAt = getExpiresAt(durationDays, grantedAt);

        for (const course of targetCourses) {
          const existingEnrollment = allCollections.enrollments.find(
            (item) => item.courseId === course.id && item.studentId === studentId,
          );

          if (existingEnrollment) {
            const updateEnrollment = await supabase
              .from("enrollments")
          .update({
                granted_at: grantedAt,
                expires_at: expiresAt,
                source_slug: requestLink?.slug ?? requestCourse?.slug ?? null,
                status: "active",
              })
              .eq("id", existingEnrollment.id);

            if (updateEnrollment.error) {
              throw updateEnrollment.error;
            }
          } else {
            const enrollmentResult = await supabase.from("enrollments").insert({
              course_id: course.id,
              student_id: studentId,
              granted_at: grantedAt,
              expires_at: expiresAt,
              source_slug: requestLink?.slug ?? requestCourse?.slug ?? null,
              status: "active",
            });

            if (enrollmentResult.error) {
              throw enrollmentResult.error;
            }
          }
        }

        const updateRequest = await supabase
          .from("enrollment_requests")
          .update({ status: "approved", approved_at: grantedAt })
          .eq("id", requestId);

        if (updateRequest.error) {
          throw updateRequest.error;
        }
      },
      async () => {
        updateDemoState((state) => {
          const request = state.requests.find((item) => item.id === requestId);

          if (!request) {
            return state;
          }

          let student = state.accounts.find(
            (account) => account.email.toLowerCase() === request.email.toLowerCase(),
          );

          if (!student) {
            student = {
              id: createId("user"),
              authUserId: null,
              email: request.email.toLowerCase(),
              fullName: request.fullName,
              role: "student",
              headline: "Aluno criado a partir da aprovacao manual",
              avatarUrl: null,
              demoPassword: "acesso123",
              createdAt: nowIso(),
            };
            state.accounts = [student, ...state.accounts];
          }

          const requestCourse = state.courses.find((course) => course.id === request.courseId) ?? null;
          const requestLink = state.links.find((link) => link.id === request.linkId) ?? null;
          const isEliteRequest =
            requestCourse?.slug === ELITE_COURSE_SLUG || requestLink?.slug === ELITE_LINK_SLUG;
          const targetCourseIds = isEliteRequest
            ? state.courses
                .filter((course) => course.status === "published" && course.slug !== ELITE_COURSE_SLUG)
                .map((course) => course.id)
            : [request.courseId];

          const grantedAt = nowIso();
          const expiresAt = getExpiresAt(durationDays, grantedAt);
          const untouchedEnrollments = state.enrollments.filter(
            (item) =>
              item.studentId !== student.id || !targetCourseIds.includes(item.courseId),
          );
          const nextEnrollments = targetCourseIds.map((courseId) => ({
            id:
              state.enrollments.find(
                (item) => item.studentId === student.id && item.courseId === courseId,
              )?.id ?? createId("enrollment"),
            courseId,
            studentId: student.id,
            grantedAt,
            expiresAt,
            sourceSlug: requestLink?.slug ?? requestCourse?.slug ?? null,
            status: "active" as const,
          }));

          return {
            ...state,
            requests: state.requests.map((item) =>
              item.id === requestId
                ? { ...item, status: "approved", approvedAt: grantedAt }
                : item,
            ),
            enrollments: [...nextEnrollments, ...untouchedEnrollments],
          };
        });
      },
    );
  },

  async renewEnrollment(enrollmentId: string, durationDays = ACCESS_DURATION_DAYS) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const expiresAt = getExpiresAt(durationDays);
        const { error } = await supabase
          .from("enrollments")
          .update({ expires_at: expiresAt, status: "active" })
          .eq("id", enrollmentId);

        if (error) {
          throw error;
        }
      },
      async () => {
        updateDemoState((state) => ({
          ...state,
          enrollments: state.enrollments.map((item) =>
            item.id === enrollmentId
              ? {
                  ...item,
                  expiresAt: getExpiresAt(durationDays),
                  status: "active",
                }
              : item,
          ),
        }));
      },
    );
  },

  async createCourse(input: CreateCourseInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const slugBase = slugify(input.title);
        const slug = `${slugBase || "curso"}-${Date.now().toString().slice(-6)}`;

        const result = await supabase
          .from("courses")
          .insert({
            slug,
            title: input.title,
            subtitle: input.subtitle,
            description: input.description,
            hero_image: input.heroImage.trim() || DEFAULT_HERO_IMAGE,
            instructor_name: input.instructorName,
            duration_label: "Adicione a duracao do curso",
            support_label: "Acesso por 12 meses",
            access_duration_days: ACCESS_DURATION_DAYS,
            price_label: input.priceLabel,
            elite_sort_order: input.eliteSortOrder,
            elite_release_delay_days: input.eliteReleaseDelayDays,
            status: input.status,
          })
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }
        const course = mapCourseRow(result.data);

        if (course.status === "published") {
          await syncPublishedCourseToEliteSupabase(course);
        }

        return course;
      },
      async () => {
        const slugBase = slugify(input.title);
        const slug = `${slugBase || "curso"}-${Date.now().toString().slice(-6)}`;
        const course: Course = {
          id: createId("course"),
          slug,
          title: input.title,
          subtitle: input.subtitle,
          description: input.description,
          heroImage: input.heroImage.trim() || DEFAULT_HERO_IMAGE,
          instructorName: input.instructorName,
          durationLabel: "Adicione a duracao do curso",
          supportLabel: "Acesso por 12 meses",
          accessDurationDays: ACCESS_DURATION_DAYS,
          priceLabel: input.priceLabel,
          eliteSortOrder: input.eliteSortOrder,
          eliteReleaseDelayDays: input.eliteReleaseDelayDays,
          status: input.status,
          createdAt: nowIso(),
        };

        updateDemoState((state) => ({
          ...state,
          courses: [course, ...state.courses],
        }));

        if (course.status === "published") {
          syncPublishedCourseToEliteDemo(course);
        }

        return course;
      },
    );
  },

  async updateCourseStatus(courseId: string, status: "published" | "draft") {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const result = await supabase
          .from("courses")
          .update({ status })
          .eq("id", courseId)
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }
        const course = mapCourseRow(result.data);

        if (course.status === "published") {
          await syncPublishedCourseToEliteSupabase(course);
        }

        return course;
      },
      async () => {
        let updatedCourse: Course | null = null;

        updateDemoState((state) => ({
          ...state,
          courses: state.courses.map((course) => {
            if (course.id !== courseId) {
              return course;
            }

            updatedCourse = {
              ...course,
              status,
            };

            return updatedCourse;
          }),
        }));

        if (!updatedCourse) {
          throw new Error("Curso nao encontrado");
        }

        if (updatedCourse.status === "published") {
          syncPublishedCourseToEliteDemo(updatedCourse);
        }

        return updatedCourse;
      },
    );
  },

  async deleteCourse(courseId: string) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const courseResult = await supabase
          .from("courses")
          .select("slug")
          .eq("id", courseId)
          .maybeSingle();

        if (courseResult.error) {
          throw courseResult.error;
        }

        if (!courseResult.data) {
          throw new Error("Curso nao encontrado");
        }

        if (courseResult.data.slug === ELITE_COURSE_SLUG) {
          throw new Error("O curso interno do Acesso Elite nao pode ser apagado por aqui.");
        }

        const { error } = await supabase.from("courses").delete().eq("id", courseId);

        if (error) {
          throw error;
        }
      },
      async () => {
        const state = getDemoCollections();
        const course = state.courses.find((item) => item.id === courseId);

        if (!course) {
          throw new Error("Curso nao encontrado");
        }

        if (course.slug === ELITE_COURSE_SLUG) {
          throw new Error("O curso interno do Acesso Elite nao pode ser apagado por aqui.");
        }

        const moduleIds = state.modules
          .filter((moduleItem) => moduleItem.courseId === courseId)
          .map((moduleItem) => moduleItem.id);
        const lessonIds = state.lessons
          .filter((lesson) => moduleIds.includes(lesson.moduleId))
          .map((lesson) => lesson.id);

        updateDemoState((currentState) => ({
          ...currentState,
          courses: currentState.courses.filter((item) => item.id !== courseId),
          modules: currentState.modules.filter((moduleItem) => moduleItem.courseId !== courseId),
          lessons: currentState.lessons.filter((lesson) => !lessonIds.includes(lesson.id)),
          resources: currentState.resources.filter((resource) => resource.courseId !== courseId),
          links: currentState.links.filter((link) => link.courseId !== courseId),
          requests: currentState.requests.filter((request) => request.courseId !== courseId),
          enrollments: currentState.enrollments.filter((enrollment) => enrollment.courseId !== courseId),
        }));
      },
    );
  },

  async createCourseModule(input: CreateCourseModuleInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const allCollections = await getSupabaseCollections();
        const moduleOrder =
          input.moduleOrder && input.moduleOrder > 0
            ? input.moduleOrder
            : getNextModuleOrder(allCollections.modules, input.courseId);

        const result = await supabase
          .from("course_modules")
          .insert({
            course_id: input.courseId,
            title: input.title,
            description: input.description,
            module_order: moduleOrder,
          })
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }

        return {
          id: result.data.id,
          courseId: result.data.course_id,
          title: result.data.title,
          description: result.data.description,
          moduleOrder: result.data.module_order,
        } satisfies CourseModule;
      },
      async () => {
        const state = getDemoCollections();
        const moduleOrder =
          input.moduleOrder && input.moduleOrder > 0
            ? input.moduleOrder
            : getNextModuleOrder(state.modules, input.courseId);

        const moduleItem: CourseModule = {
          id: createId("module"),
          courseId: input.courseId,
          title: input.title,
          description: input.description,
          moduleOrder,
        };

        updateDemoState((currentState) => ({
          ...currentState,
          modules: [...currentState.modules, moduleItem],
        }));

        return moduleItem;
      },
    );
  },

  async createCourseLesson(input: CreateCourseLessonInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const allCollections = await getSupabaseCollections();
        const lessonOrder =
          input.lessonOrder && input.lessonOrder > 0
            ? input.lessonOrder
            : getNextLessonOrder(allCollections.lessons, input.moduleId);

        const result = await supabase
          .from("course_lessons")
          .insert({
            module_id: input.moduleId,
            title: input.title,
            summary: input.summary.trim(),
            duration_label: input.durationLabel,
            lesson_order: lessonOrder,
            vimeo_url: input.vimeoUrl?.trim() ?? "",
          })
          .select("*")
          .single();

        if (result.error) {
          throw toAppError(result.error, "Nao foi possivel criar a aula.");
        }

        return {
          id: result.data.id,
          moduleId: result.data.module_id,
          title: result.data.title,
          summary: result.data.summary,
          durationLabel: result.data.duration_label,
          lessonOrder: result.data.lesson_order,
          vimeoUrl: result.data.vimeo_url,
        } satisfies CourseLesson;
      },
      async () => {
        const state = getDemoCollections();
        const lessonOrder =
          input.lessonOrder && input.lessonOrder > 0
            ? input.lessonOrder
            : getNextLessonOrder(state.lessons, input.moduleId);

        const lesson: CourseLesson = {
          id: createId("lesson"),
          moduleId: input.moduleId,
          title: input.title,
          summary: input.summary.trim(),
          durationLabel: input.durationLabel,
          lessonOrder,
          vimeoUrl: input.vimeoUrl?.trim() ?? "",
        };

        updateDemoState((currentState) => ({
          ...currentState,
          lessons: [...currentState.lessons, lesson],
        }));

        return lesson;
      },
    );
  },

  async createCourseResource(input: CreateCourseResourceInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const result = await supabase
          .from("course_resources")
          .insert({
            course_id: input.courseId,
            module_id: input.moduleId ?? null,
            lesson_id: input.lessonId ?? null,
            title: input.title,
            description: input.description,
            kind: input.kind,
            file_url: input.fileUrl,
          })
          .select("*")
          .single();

        if (result.error) {
          throw toAppError(
            result.error,
            "Nao foi possivel criar o material. Verifique o schema do banco.",
          );
        }

        return {
          id: result.data.id,
          courseId: result.data.course_id,
          moduleId: result.data.module_id ?? null,
          lessonId: result.data.lesson_id ?? null,
          title: result.data.title,
          description: result.data.description,
          kind: result.data.kind,
          fileUrl: result.data.file_url,
        } satisfies CourseResource;
      },
      async () => {
        const resource: CourseResource = {
          id: createId("resource"),
          courseId: input.courseId,
          moduleId: input.moduleId ?? null,
          lessonId: input.lessonId ?? null,
          title: input.title,
          description: input.description,
          kind: input.kind,
          fileUrl: input.fileUrl,
        };

        updateDemoState((state) => ({
          ...state,
          resources: [...state.resources, resource],
        }));

        return resource;
      },
    );
  },

  async uploadCourseResourceFile(input: { courseId: string; file: File }) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const ext = input.file.name.includes(".") ? input.file.name.split(".").pop() ?? "" : "";
        const baseName = ext
          ? input.file.name.slice(0, -(ext.length + 1))
          : input.file.name;
        const safeBaseName = sanitizeFileName(baseName) || "arquivo";
        const safeExt = sanitizeFileName(ext);
        const fileName = safeExt ? `${safeBaseName}.${safeExt}` : safeBaseName;
        const storagePath = `${slugify(input.courseId)}/${Date.now()}-${fileName}`;

        const uploadResult = await supabase.storage
          .from("course-assets")
          .upload(storagePath, input.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadResult.error) {
          throw toAppError(
            uploadResult.error,
            "Nao foi possivel enviar o arquivo. Configure o bucket course-assets no Supabase.",
          );
        }

        return supabase.storage.from("course-assets").getPublicUrl(storagePath).data.publicUrl;
      },
      async () => URL.createObjectURL(input.file),
    );
  },

  async deleteCourseResource(resourceId: string) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const { error } = await supabase.from("course_resources").delete().eq("id", resourceId);

        if (error) {
          throw error;
        }
      },
      async () => {
        updateDemoState((state) => ({
          ...state,
          resources: state.resources.filter((resource) => resource.id !== resourceId),
        }));
      },
    );
  },

  async deleteCourseLesson(lessonId: string) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const allCollections = await getSupabaseCollections();
        const lesson = allCollections.lessons.find((item) => item.id === lessonId);

        if (!lesson) {
          throw new Error("Aula nao encontrada");
        }

        const deleteResult = await supabase.from("course_lessons").delete().eq("id", lessonId);

        if (deleteResult.error) {
          throw deleteResult.error;
        }

        const remainingIds = allCollections.lessons
          .filter((item) => item.moduleId === lesson.moduleId && item.id !== lessonId)
          .sort((a, b) => a.lessonOrder - b.lessonOrder)
          .map((item) => item.id);

        await reorderModuleLessonsInSupabase({
          moduleId: lesson.moduleId,
          lessonIds: remainingIds,
        });
      },
      async () => {
        const state = getDemoCollections();
        const lesson = state.lessons.find((item) => item.id === lessonId);

        if (!lesson) {
          throw new Error("Aula nao encontrada");
        }

        const remainingIds = state.lessons
          .filter((item) => item.moduleId === lesson.moduleId && item.id !== lessonId)
          .sort((a, b) => a.lessonOrder - b.lessonOrder)
          .map((item) => item.id);

        updateDemoState((currentState) => ({
          ...currentState,
          lessons: reorderModuleLessonsInDemo(
            currentState.lessons.filter((item) => item.id !== lessonId),
            {
              moduleId: lesson.moduleId,
              lessonIds: remainingIds,
            },
          ),
          resources: currentState.resources.map((resource) =>
            resource.lessonId === lessonId ? { ...resource, lessonId: null } : resource,
          ),
        }));
      },
    );
  },

  async reorderCourseLessons(input: ReorderCourseLessonsInput) {
    return trySupabase(
      async () => {
        await reorderModuleLessonsInSupabase(input);
      },
      async () => {
        updateDemoState((currentState) => ({
          ...currentState,
          lessons: reorderModuleLessonsInDemo(currentState.lessons, input),
        }));
      },
    );
  },

  async createEnrollmentLink(input: CreateEnrollmentLinkInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const allCollections = await getSupabaseCollections();
        const slug = buildUniqueSlug(
          input.slug?.trim() || `${input.title}-${Date.now().toString().slice(-4)}`,
          allCollections.links.map((link) => link.slug),
        );

        const result = await supabase
          .from("enrollment_links")
          .insert({
            course_id: input.courseId,
            slug,
            title: input.title,
            description: input.description,
            is_active: true,
          })
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }

        return {
          id: result.data.id,
          courseId: result.data.course_id,
          slug: result.data.slug,
          title: result.data.title,
          description: result.data.description,
          isActive: result.data.is_active,
          createdAt: result.data.created_at,
        } satisfies EnrollmentLink;
      },
      async () => {
        const state = getDemoCollections();
        const slug = buildUniqueSlug(
          input.slug?.trim() || `${input.title}-${Date.now().toString().slice(-4)}`,
          state.links.map((link) => link.slug),
        );

        const link: EnrollmentLink = {
          id: createId("link"),
          courseId: input.courseId,
          slug,
          title: input.title,
          description: input.description,
          isActive: true,
          createdAt: nowIso(),
        };

        updateDemoState((currentState) => ({
          ...currentState,
          links: [link, ...currentState.links],
        }));

        return link;
      },
    );
  },

  async deleteEnrollmentLink(linkId: string) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const { error } = await supabase.from("enrollment_links").delete().eq("id", linkId);

        if (error) {
          throw error;
        }
      },
      async () => {
        updateDemoState((state) => ({
          ...state,
          links: state.links.filter((link) => link.id !== linkId),
          requests: state.requests.filter((request) => request.linkId !== linkId),
        }));
      },
    );
  },

  async deleteAcademyUser(userId: string) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const accountResult = await supabase
          .from("academy_users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (accountResult.error) {
          throw accountResult.error;
        }

        if (!accountResult.data) {
          throw new Error("Usuario nao encontrado");
        }

        if (accountResult.data.role === "admin") {
          throw new Error("Nao e possivel excluir um administrador por aqui.");
        }

        const deleteEnrollments = await supabase
          .from("enrollments")
          .delete()
          .eq("student_id", userId);

        if (deleteEnrollments.error) {
          throw deleteEnrollments.error;
        }

        const deleteRequests = await supabase
          .from("enrollment_requests")
          .delete()
          .eq("email", accountResult.data.email);

        if (deleteRequests.error) {
          throw deleteRequests.error;
        }

        const deleteAccount = await supabase.from("academy_users").delete().eq("id", userId);

        if (deleteAccount.error) {
          throw deleteAccount.error;
        }
      },
      async () => {
        const state = getDemoCollections();
        const account = state.accounts.find((item) => item.id === userId);

        if (!account) {
          throw new Error("Usuario nao encontrado");
        }

        if (account.role === "admin") {
          throw new Error("Nao e possivel excluir um administrador por aqui.");
        }

        updateDemoState((currentState) => ({
          ...currentState,
          accounts: currentState.accounts.filter((item) => item.id !== userId),
          enrollments: currentState.enrollments.filter((item) => item.studentId !== userId),
          requests: currentState.requests.filter(
            (request) => request.email.toLowerCase() !== account.email.toLowerCase(),
          ),
        }));
      },
    );
  },

  async updateCourseBasics(input: UpdateCourseBasicsInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const result = await supabase
          .from("courses")
          .update({
            title: input.title,
            subtitle: input.subtitle,
            description: input.description,
            hero_image: input.heroImage.trim() || DEFAULT_HERO_IMAGE,
            instructor_name: input.instructorName,
            price_label: input.priceLabel,
            elite_sort_order: input.eliteSortOrder,
            elite_release_delay_days: input.eliteReleaseDelayDays,
            status: input.status,
          })
          .eq("id", input.courseId)
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }

        return mapCourseRow(result.data);
      },
      async () => {
        let updatedCourse: Course | null = null;

        updateDemoState((state) => ({
          ...state,
          courses: state.courses.map((course) => {
            if (course.id !== input.courseId) {
              return course;
            }

            updatedCourse = {
              ...course,
              title: input.title,
              subtitle: input.subtitle,
              description: input.description,
              heroImage: input.heroImage.trim() || DEFAULT_HERO_IMAGE,
              instructorName: input.instructorName,
              priceLabel: input.priceLabel,
              eliteSortOrder: input.eliteSortOrder,
              eliteReleaseDelayDays: input.eliteReleaseDelayDays,
              status: input.status,
            };

            return updatedCourse;
          }),
        }));

        if (!updatedCourse) {
          throw new Error("Curso nao encontrado");
        }

        return updatedCourse;
      },
    );
  },

  async updateEliteCourseSettings(input: UpdateEliteCourseSettingsInput) {
    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const result = await supabase
          .from("courses")
          .update({
            elite_sort_order: input.eliteSortOrder,
            elite_release_delay_days: input.eliteReleaseDelayDays,
          })
          .eq("id", input.courseId)
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }

        return mapCourseRow(result.data);
      },
      async () => {
        let updatedCourse: Course | null = null;

        updateDemoState((state) => ({
          ...state,
          courses: state.courses.map((course) => {
            if (course.id !== input.courseId) {
              return course;
            }

            updatedCourse = {
              ...course,
              eliteSortOrder: input.eliteSortOrder,
              eliteReleaseDelayDays: input.eliteReleaseDelayDays,
            };

            return updatedCourse;
          }),
        }));

        if (!updatedCourse) {
          throw new Error("Curso nao encontrado");
        }

        return updatedCourse;
      },
    );
  },
};
