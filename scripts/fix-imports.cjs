const fs = require('fs');
const path = require('path');

const commonComp = ["Breadcrumbs", "Button", "Card", "Header", "Icons", "Layout", "LoadingSpinner", "ProgressBar", "ProgressIndicator", "RichTextDisplay", "Sidebar", "TeacherLayout", "TeacherSidebar", "MarkdownText", "AdminRoute", "RouterWrapper"];
const featureComp = ["AssistantIA", "AudioEnableModal", "ChatWindow", "ComprehensiveStudentCard", "CorrelationChart", "CostBreakdown", "CourseEditModal", "CourseMaterialSelector", "DocumentAssignmentModal", "DocumentViewer", "ExportAdminReportButton", "ExportReportButton", "FileAnalysisModal", "FilterBar", "FolderManager", "GamificationScore", "ImageUpload", "InsightsPanel", "MaterialAssignmentModal", "MaterialCourseAssignmentModal", "MaterialDisplay", "ProcessingNotification", "ProcessingProgress", "ProcessingTimer", "QuestionBuilder", "SecureDocumentViewer", "SecurePDFViewer", "SessionEditorModal", "StudentProgressDetail", "UnitEditorModal", "VideoCallDisplay", "VideoCallScheduler", "VideoPlayer"];
const adminPages = ["AdminDashboard", "AdminDocumentsPage", "InstitutionActivityPage", "InstitutionManagementPage", "InstitutionUsersPage", "TeacherSessionManagementPage", "TeacherStatsPage", "AIUsageReportPage", "AdminComprehensiveReportsPage", "AdminDevicesReportPage", "AdminModulesPage", "BulkSuspendReactivatePage", "BulkUserImportPage", "CareersPage", "DocumentLibraryPage", "FileProcessingPage", "LandingPageConfigPage", "MenuFeatureEditor", "ProcessingCostsDashboardPage", "RolesManagementPage", "SubjectsPage", "UserSuspensionManagementPage", "UsersManagementPage"];
const teacherPages = ["TeacherCoursesPage", "TeacherDashboardPage", "TeacherDocumentsPage", "TeacherMaterialsPage", "TeacherQuestionBankPage", "TeacherUnitManagementPage", "AddEditSessionPage", "AnnouncementStatsPage", "AssignmentSubmissionsPage", "CourseComprehensiveReportPage", "CourseEditorPage", "CourseGradingWeightsPage", "CourseModulesPage", "CourseStudentProgressPage", "CreateAnnouncementPage", "CreateCoursePage", "CreateEditAssignmentPage", "FlashcardBuilderPage", "MaterialsManagementPage", "ModuleEditorPage", "QuizAnalyticsPage", "QuizBuilderPage", "ResetStudentProgressPage", "SessionsListPage", "StudentsManagementPage", "SupervisorDashboard", "TeacherAssignmentsPage", "TeacherFlashcardsPage", "TeacherGradesPage", "TeacherQuizzesPage", "TeacherTutorAnalyticsPage"];
const studentPages = ["StudentCourseDetailsPage", "StudentCoursePlayerPage", "StudentCoursesPage", "StudentDashboard", "StudentDocumentsPage", "StudentExamPage", "StudentExamsPage", "StudentGamificationPage", "StudentMessagesPage", "StudentPaymentManagementPage", "TutorVirtualPage", "CourseDetailPage", "CoursePlayPage", "ExamTakingPage", "ExamTakingV2Page", "LessonViewerPage", "StudentAssignmentsPage", "StudentFlashcardsPage", "StudentGradesPage", "StudentHomeworkPage", "StudentNotificationsPage", "StudentProfilePage", "StudentQuizzesPage", "StudentSupportPage"];
const commonPages = ["CourseSelectionPage", "LandingPage", "LoginPage", "RegisterPage", "UserProfilePage", "AnnouncementsPage", "DashboardPage", "ForumTopicPage", "ForumsPage", "GoogleOAuthCallbackPage", "InstitutionLandingPage", "MessagingPage", "PrivacyPage", "ProfilePage", "SecureViewerPage", "SessionDetailPage", "SettingsPage", "TermsPage", "TestPDFViewer", "UserDevicesPage"];

const baseDirs = ["hooks", "services", "utils", "types", "constants", "contexts", "assets", "context", "lib", "components", "pages"];

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!fullPath.includes('modules' + path.sep + 'tutor') && !fullPath.includes('node_modules')) {
                results = results.concat(walk(fullPath));
            }
        } else {
            if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // 1. Fix Components (con manejo de subcarpetas opcionales)
    commonComp.forEach(c => {
        const regex = new RegExp(`from\\s+['"][^'"]*?components\\/(Common\\/)?${c}(\\.tsx?)?(['"])`, 'g');
        content = content.replace(regex, (m, sub, ext, quote) => `from '@/components/Common/${c}${quote}`);
    });
    featureComp.forEach(f => {
        const regex = new RegExp(`from\\s+['"][^'"]*?components\\/(Features\\/)?${f}(\\.tsx?)?(['"])`, 'g');
        content = content.replace(regex, (m, sub, ext, quote) => `from '@/components/Features/${f}${quote}`);
    });

    // 2. Fix Pages (con manejo de subcarpetas opcionales)
    adminPages.forEach(p => {
        const regex = new RegExp(`from\\s+['"][^'"]*?pages\\/(Admin\\/)?${p}(\\.tsx?)?(['"])`, 'g');
        content = content.replace(regex, (m, sub, ext, quote) => `from '@/pages/Admin/${p}${quote}`);
    });
    teacherPages.forEach(p => {
        const regex = new RegExp(`from\\s+['"][^'"]*?pages\\/(Teacher\\/)?${p}(\\.tsx?)?(['"])`, 'g');
        content = content.replace(regex, (m, sub, ext, quote) => `from '@/pages/Teacher/${p}${quote}`);
    });
    studentPages.forEach(p => {
        const regex = new RegExp(`from\\s+['"][^'"]*?pages\\/(Student\\/)?${p}(\\.tsx?)?(['"])`, 'g');
        content = content.replace(regex, (m, sub, ext, quote) => `from '@/pages/Student/${p}${quote}`);
    });
    commonPages.forEach(p => {
        const regex = new RegExp(`from\\s+['"][^'"]*?pages\\/(Common\\/)?${p}(\\.tsx?)?(['"])`, 'g');
        content = content.replace(regex, (m, sub, ext, quote) => `from '@/pages/Common/${p}${quote}`);
    });

    // 3. Fix Base Directories (incluyendo components y pages genéricos)
    baseDirs.forEach(dir => {
        const regex = new RegExp(`from\\s+['"](\\.\\.?\\/)+${dir}(\\/|\\.tsx?)([^'"]*?)(['"])`, 'g');
        content = content.replace(regex, (match, relatives, separator, rest, quote) => {
            if (separator === '/') {
                const cleanRest = rest.replace(/\.tsx?$/, '');
                return `from '@/${dir}/${cleanRest}${quote}`;
            } else {
                return `from '@/${dir}${quote}`;
            }
        });
    });

    // 4. Cleanup final: Quitar extensiones y comillas dobles residuales
    content = content.replace(/from\s+(['"])(@\/[^'"]+?)\.tsx?(['"])/g, "from $1$2$3");
    // Eliminar comillas duplicadas accidentales
    content = content.replace(/from\s+(['"])(@\/[^'"]+?)(['"])(['"])/g, "from $1$2$3");

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Actualizado: ${file}`);
    }
});
