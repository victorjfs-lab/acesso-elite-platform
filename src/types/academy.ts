export type AcademyRole = "admin" | "student";

export type CourseResourceKind = "pdf" | "indicador" | "planilha" | "bonus";

export type EnrollmentRequestStatus = "pending" | "approved" | "rejected";

export type EnrollmentStatus = "active" | "expired" | "cancelled";

export type AcademyAccount = {
  id: string;
  authUserId: string | null;
  email: string;
  fullName: string;
  role: AcademyRole;
  headline: string | null;
  avatarUrl: string | null;
  demoPassword: string | null;
  createdAt: string;
};

export type Course = {
  id: string;
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
  eliteSortOrder: number;
  eliteReleaseDelayDays: number;
  status: "published" | "draft";
  createdAt: string;
};

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  moduleOrder: number;
};

export type CourseLesson = {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  durationLabel: string;
  lessonOrder: number;
  vimeoUrl: string;
};

export type CourseResource = {
  id: string;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  title: string;
  description: string;
  kind: CourseResourceKind;
  fileUrl: string;
};

export type EnrollmentLink = {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

export type EnrollmentRequest = {
  id: string;
  linkId: string;
  courseId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  notes: string | null;
  status: EnrollmentRequestStatus;
  createdAt: string;
  approvedAt: string | null;
};

export type Enrollment = {
  id: string;
  courseId: string;
  studentId: string;
  grantedAt: string;
  expiresAt: string;
  sourceSlug: string | null;
  status: EnrollmentStatus;
};

export type StudentCourseAccess = {
  course: Course;
  enrollment: Enrollment;
  modules: CourseModule[];
  lessons: CourseLesson[];
  resources: CourseResource[];
  availableModuleIds: string[];
  availableLessonIds: string[];
  completedLessonIds: string[];
  startedLessonAtById: Record<string, string>;
  daysRemaining: number;
  progressPercent: number;
  nextLesson: CourseLesson | null;
};

export type StudentDashboardData = {
  activeAccess: StudentCourseAccess[];
  expiredAccess: StudentCourseAccess[];
  pendingRequests: EnrollmentRequest[];
};

export type EnrollmentRequestSummary = EnrollmentRequest & {
  courseTitle: string;
  linkTitle: string;
};

export type AdminStudentAccess = {
  account: AcademyAccount;
  course: Course | null;
  enrollment: Enrollment | null;
  daysRemaining: number | null;
};

export type AdminOverviewData = {
  stats: {
    activeStudents: number;
    pendingRequests: number;
    expiringSoon: number;
    publishedCourses: number;
  };
  courseStructures: AdminCourseStructure[];
  links: EnrollmentLink[];
  requests: EnrollmentRequestSummary[];
  students: AdminStudentAccess[];
};

export type AdminCourseStructure = {
  course: Course;
  modules: CourseModule[];
};

export type CourseDetailData = {
  course: Course;
  enrollment: Enrollment | null;
  modules: CourseModule[];
  lessons: CourseLesson[];
  resources: CourseResource[];
  links: EnrollmentLink[];
  availableModuleIds: string[];
  availableLessonIds: string[];
  completedLessonIds: string[];
  startedLessonAtById: Record<string, string>;
  progressPercent: number;
  nextLesson: CourseLesson | null;
};

export type EnrollmentFormInput = {
  slug: string;
  fullName: string;
  email: string;
  whatsapp: string;
  notes?: string;
  password: string;
};

export type CreateCourseInput = {
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  instructorName: string;
  priceLabel: string;
  eliteSortOrder: number;
  eliteReleaseDelayDays: number;
  status: "published" | "draft";
};

export type CreateCourseModuleInput = {
  courseId: string;
  title: string;
  description: string;
  moduleOrder?: number;
};

export type CreateCourseLessonInput = {
  moduleId: string;
  title: string;
  summary: string;
  durationLabel: string;
  vimeoUrl?: string;
  lessonOrder?: number;
};

export type CreateCourseResourceInput = {
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title: string;
  description: string;
  kind: CourseResourceKind;
  fileUrl: string;
};

export type CreateEnrollmentLinkInput = {
  courseId: string;
  title: string;
  description: string;
  slug?: string;
};

export type UpdateCourseBasicsInput = {
  courseId: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  instructorName: string;
  priceLabel: string;
  eliteSortOrder: number;
  eliteReleaseDelayDays: number;
  status: "published" | "draft";
};

export type UpdateEliteCourseSettingsInput = {
  courseId: string;
  eliteSortOrder: number;
  eliteReleaseDelayDays: number;
};

export type ReorderCourseLessonsInput = {
  moduleId: string;
  lessonIds: string[];
};
